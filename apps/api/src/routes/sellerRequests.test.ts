import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { SignJWT } from "jose";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { sellerRequestLockKey } from "../lib/seller-requests.js";
import type { FakeDb } from "../lib/seller-requests.fixtures.js";

// Rutas con Express real y una base en memoria (sin red ni Supabase). NO prueba concurrencia.
vi.mock("../lib/prisma.js", async () => {
  const { createFakeDb } = await import("../lib/seller-requests.fixtures.js");
  return { prisma: createFakeDb() };
});

const { app } = await import("../app.js");
const { prisma } = await import("../lib/prisma.js");
const db = prisma as unknown as FakeDb;

const ALICE = "00000000-0000-4000-8000-0000000000a1";
const BOB = "00000000-0000-4000-8000-0000000000b2";
const ADMIN = "00000000-0000-4000-8000-0000000000ad";

let server: Server;
let base: string;

beforeAll(async () => {
  server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", () => resolve()));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

beforeEach(() => {
  db.rows.length = 0;
  db.state.calls.length = 0;
  db.state.txOptions.length = 0;
  db.roles.clear();
  db.roles.set(ADMIN, "admin");
});

// JWT válido con el secreto de pruebas (ver vitest.config.ts); el perfil sale de la base en memoria.
const token = (sub: string) =>
  new SignJWT({ email: `${sub}@example.com` }).setProtectedHeader({ alg: "HS256" }).setSubject(sub).setExpirationTime("1h").sign(new TextEncoder().encode("secreto-solo-para-pruebas"));

async function call(path: string, as: string | null, method = "GET", body?: unknown) {
  const headers: Record<string, string> = {};
  if (as) headers["Authorization"] = `Bearer ${await token(as)}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(`${base}/api/v1${path}`, { method, headers, ...(body !== undefined && { body: JSON.stringify(body) }) });
  return { status: res.status, json: (await res.json()) as any };
}
const post = (as: string | null, body: unknown) => call("/seller-requests", as, "POST", body);

describe("POST /seller-requests", () => {
  it("401 sin sesión", async () => {
    expect((await post(null, { kind: "services" })).status).toBe(401);
  });

  it("crea con 201, dueño del token, estado open y sin asesor; no expone datos internos", async () => {
    const r = await post(ALICE, { kind: "find_agent", notes: "  Busco asesor en Mérida  " });
    expect(r.status).toBe(201);
    expect(r.json.data).toMatchObject({ kind: "find_agent", status: "open", notes: "Busco asesor en Mérida" });
    expect(Object.keys(r.json.data).sort()).toEqual(["createdAt", "id", "kind", "notes", "status"]);
    expect(db.rows[0]).toMatchObject({ sellerId: ALICE, agentId: null, status: "open" });
  });

  it("cualquier rol con sesión puede solicitar (comprador, vendedor, asesor)", async () => {
    for (const role of ["buyer", "seller", "agent"]) {
      const id = `00000000-0000-4000-8000-0000000000${role === "buyer" ? "c1" : role === "seller" ? "c2" : "c3"}`;
      db.roles.set(id, role);
      expect((await post(id, { kind: "services" })).status, role).toBe(201);
    }
  });

  it("422 por tipo inválido, notas largas y campos no permitidos", async () => {
    const bad: unknown[] = [
      {},
      { kind: "otro" },
      { kind: "services", notes: "a".repeat(501) },
      { kind: "services", sellerId: BOB },
      { kind: "services", status: "closed" },
      { kind: "services", agentId: BOB },
      { kind: "services", extra: true },
    ];
    for (const body of bad) {
      const r = await post(ALICE, body);
      expect(r.status, JSON.stringify(body)).toBe(422);
      expect(r.json.error.code).toBe("validation");
    }
    expect(db.rows).toHaveLength(0);
  });

  it("sin cuerpo JSON → 422", async () => {
    expect((await call("/seller-requests", ALICE, "POST")).status).toBe(422);
  });

  it("notas de solo espacios se guardan como ausentes", async () => {
    const r = await post(ALICE, { kind: "services", notes: "    " });
    expect(r.status).toBe(201);
    expect(r.json.data.notes).toBeNull();
  });

  it("duplicado del mismo tipo → 409; otro tipo → 201", async () => {
    expect((await post(ALICE, { kind: "services" })).status).toBe(201);
    const dup = await post(ALICE, { kind: "services" });
    expect(dup.status).toBe(409);
    expect(dup.json.error.code).toBe("request_already_open");
    expect(dup.json.error.message).toMatch(/solicitud abierta/);
    expect((await post(ALICE, { kind: "find_agent" })).status).toBe(201);
    expect(db.rows).toHaveLength(2);
  });

  it("assigned también cuenta como abierta", async () => {
    db.seed({ sellerId: ALICE, kind: "services", status: "assigned" });
    expect((await post(ALICE, { kind: "services" })).status).toBe(409);
  });

  it("si la anterior está cerrada, permite una nueva", async () => {
    db.seed({ sellerId: ALICE, kind: "services", status: "closed" });
    expect((await post(ALICE, { kind: "services" })).status).toBe(201);
    expect(db.rows).toHaveLength(2);
  });

  it("otra persona puede crear el mismo tipo", async () => {
    await post(ALICE, { kind: "services" });
    expect((await post(BOB, { kind: "services" })).status).toBe(201);
  });

  it("toma el candado antes de comprobar duplicados", async () => {
    await post(ALICE, { kind: "services" });
    expect(db.state.calls.slice(0, 3)).toEqual(["lock_timeout", `lock:${sellerRequestLockKey(ALICE, "services")}`, "findFirst"]);
  });

  it("un timeout de la transacción responde 503 busy, no 409 ni 500", async () => {
    const { Prisma } = await import("@prisma/client");
    db.state.failNextTransaction = new Prisma.PrismaClientKnownRequestError("timeout", { code: "P2028", clientVersion: "6" });
    const r = await post(ALICE, { kind: "services" });
    expect(r.status).toBe(503);
    expect(r.json.error.code).toBe("busy");
  });
});

describe("GET /seller-requests", () => {
  it("401 sin sesión", async () => {
    expect((await call("/seller-requests", null)).status).toBe(401);
  });

  it("devuelve solo las solicitudes del usuario del token", async () => {
    await post(ALICE, { kind: "services" });
    await post(BOB, { kind: "services" });
    await post(BOB, { kind: "find_agent" });
    const a = await call("/seller-requests", ALICE);
    const b = await call("/seller-requests", BOB);
    expect(a.json.data).toHaveLength(1);
    expect(b.json.data).toHaveLength(2);
    expect(a.json.meta.total).toBe(1);
    for (const row of [...a.json.data, ...b.json.data]) expect(Object.keys(row).sort()).toEqual(["createdAt", "id", "kind", "notes", "status"]);
  });

  it("no permite elegir otra persona por parámetros (se ignoran)", async () => {
    await post(BOB, { kind: "services" });
    for (const qs of [`sellerId=${BOB}`, `seller=${BOB}`, `userId=${BOB}`]) {
      const r = await call(`/seller-requests?${qs}`, ALICE);
      expect(r.status).toBe(200);
      expect(r.json.data).toEqual([]);
    }
  });

  it("ordena la más reciente primero y pagina con límites", async () => {
    await post(ALICE, { kind: "services" });
    await post(ALICE, { kind: "find_agent" });
    await post(ALICE, { kind: "self_publish" });
    const p1 = await call("/seller-requests?page=1&pageSize=2", ALICE);
    const p2 = await call("/seller-requests?page=2&pageSize=2", ALICE);
    expect(p1.json.data.map((x: any) => x.kind)).toEqual(["self_publish", "find_agent"]);
    expect(p2.json.data.map((x: any) => x.kind)).toEqual(["services"]);
    expect(p1.json.meta).toEqual({ page: 1, pageSize: 2, total: 3 });
    for (const qs of ["pageSize=51", "pageSize=0", "page=0", "page=abc"]) expect((await call(`/seller-requests?${qs}`, ALICE)).status, qs).toBe(422);
  });
});

describe("/admin/seller-requests (permisos y reapertura)", () => {
  it("un usuario sin rol admin recibe 403 en el listado y en el PATCH", async () => {
    const mine = (await post(ALICE, { kind: "services" })).json.data.id;
    const list = await call("/admin/seller-requests", ALICE);
    const patch = await call(`/admin/seller-requests/${mine}`, ALICE, "PATCH", { status: "closed" });
    expect(list.status).toBe(403);
    expect(patch.status).toBe(403);
    expect(db.rows[0]!.status).toBe("open");
  });

  it("sin sesión → 401", async () => {
    expect((await call("/admin/seller-requests/00000000-0000-4000-8000-000000000001", null, "PATCH", { status: "closed" })).status).toBe(401);
  });

  it("admin: 422 con estado inválido o campos extra, 404 si no existe", async () => {
    const id = db.seed({ sellerId: ALICE, kind: "services" }).id;
    expect((await call(`/admin/seller-requests/${id}`, ADMIN, "PATCH", { status: "pendiente" })).status).toBe(422);
    expect((await call(`/admin/seller-requests/${id}`, ADMIN, "PATCH", { status: "closed", agentId: BOB })).status).toBe(422);
    expect((await call("/admin/seller-requests/no-es-uuid", ADMIN, "PATCH", { status: "closed" })).status).toBe(422);
    expect((await call("/admin/seller-requests/00000000-0000-4000-8000-000000000999", ADMIN, "PATCH", { status: "closed" })).status).toBe(404);
  });

  it("admin: open → assigned → closed; responde id, tipo y estado", async () => {
    const id = db.seed({ sellerId: ALICE, kind: "services" }).id;
    const a = await call(`/admin/seller-requests/${id}`, ADMIN, "PATCH", { status: "assigned" });
    expect(a.status).toBe(200);
    expect(a.json.data).toEqual({ id, kind: "services", status: "assigned" });
    expect((await call(`/admin/seller-requests/${id}`, ADMIN, "PATCH", { status: "closed" })).status).toBe(200);
  });

  it("admin: reabrir con otra abierta del mismo tipo → 409; sin otra abierta → 200", async () => {
    const closed = db.seed({ sellerId: ALICE, kind: "services", status: "closed" }).id;
    const other = db.seed({ sellerId: ALICE, kind: "services", status: "open" }).id;
    const conflict = await call(`/admin/seller-requests/${closed}`, ADMIN, "PATCH", { status: "open" });
    expect(conflict.status).toBe(409);
    expect(conflict.json.error.code).toBe("request_already_open");
    expect(db.rows.find((r) => r.id === closed)!.status).toBe("closed");
    await call(`/admin/seller-requests/${other}`, ADMIN, "PATCH", { status: "closed" });
    expect((await call(`/admin/seller-requests/${closed}`, ADMIN, "PATCH", { status: "open" })).status).toBe(200);
  });

  it("el PATCH usa la misma clave de candado que el POST", async () => {
    const closed = db.seed({ sellerId: ALICE, kind: "services", status: "closed" }).id;
    await call(`/admin/seller-requests/${closed}`, ADMIN, "PATCH", { status: "open" });
    expect(db.state.calls).toContain(`lock:${sellerRequestLockKey(ALICE, "services")}`);
  });
});
