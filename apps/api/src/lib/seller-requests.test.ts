import { Prisma, type PrismaClient } from "@prisma/client";
import { createSellerRequestSchema, SELLER_REQUEST_NOTES_MAX } from "@cosave/shared";
import { describe, expect, it } from "vitest";
import { HttpError } from "./errors.js";
import { changeSellerRequestStatus, createSellerRequest, listSellerRequests, mapBusyError, sellerRequestLockKey, TX_OPTIONS } from "./seller-requests.js";
import { createFakeDb } from "./seller-requests.fixtures.js";

// Lógica con una base en memoria: NO prueba concurrencia (ver seller-requests.integration.test.ts).
const asDb = (db: ReturnType<typeof createFakeDb>) => db as unknown as PrismaClient;
const A = "00000000-0000-4000-8000-00000000000a";
const B = "00000000-0000-4000-8000-00000000000b";

const rejection = async (p: Promise<unknown>) => {
  try {
    await p;
  } catch (e) {
    return e;
  }
  return undefined;
};

describe("createSellerRequestSchema", () => {
  const ok = (v: unknown) => createSellerRequestSchema.safeParse(v);

  it("acepta cada tipo, con o sin notas", () => {
    for (const kind of ["self_publish", "find_agent", "services"]) expect(ok({ kind }).success).toBe(true);
    expect(ok({ kind: "services", notes: "Quiero fotos" })).toMatchObject({ success: true, data: { kind: "services", notes: "Quiero fotos" } });
  });

  it("rechaza un tipo desconocido o ausente", () => {
    expect(ok({ kind: "otro" }).success).toBe(false);
    expect(ok({}).success).toBe(false);
    expect(ok(undefined).success).toBe(false);
  });

  it("recorta las notas y mide el largo ya recortado", () => {
    expect(ok({ kind: "services", notes: "  hola  " })).toMatchObject({ data: { notes: "hola" } });
    expect(ok({ kind: "services", notes: ` ${"a".repeat(SELLER_REQUEST_NOTES_MAX)} ` }).success).toBe(true);
    expect(ok({ kind: "services", notes: "a".repeat(SELLER_REQUEST_NOTES_MAX + 1) }).success).toBe(false);
  });

  it("notas vacías o de solo espacios cuentan como ausentes", () => {
    for (const notes of ["", "   ", "\n\t"]) {
      const r = ok({ kind: "services", notes });
      expect(r.success).toBe(true);
      expect(r.success && r.data.notes).toBeUndefined();
    }
  });

  it("es estricto: sellerId, status, agentId y cualquier campo extra se rechazan", () => {
    for (const extra of [{ sellerId: A }, { status: "closed" }, { agentId: A }, { otro: 1 }]) {
      expect(ok({ kind: "services", ...extra }).success, JSON.stringify(extra)).toBe(false);
    }
  });

  it("las notas deben ser texto", () => {
    expect(ok({ kind: "services", notes: 5 }).success).toBe(false);
    expect(ok({ kind: "services", notes: null }).success).toBe(false);
  });
});

describe("candado", () => {
  it("la clave es estable y distinta por persona y por tipo", () => {
    expect(sellerRequestLockKey(A, "services")).toBe(sellerRequestLockKey(A, "services"));
    expect(sellerRequestLockKey(A, "services")).not.toBe(sellerRequestLockKey(B, "services"));
    expect(sellerRequestLockKey(A, "services")).not.toBe(sellerRequestLockKey(A, "find_agent"));
  });

  it("las transacciones usan ReadCommitted y tiempos acotados", () => {
    expect(TX_OPTIONS.isolationLevel).toBe(Prisma.TransactionIsolationLevel.ReadCommitted);
    expect(TX_OPTIONS.maxWait).toBeGreaterThan(0);
    expect(TX_OPTIONS.timeout).toBeGreaterThan(TX_OPTIONS.maxWait);
  });

  it("crear toma el candado ANTES de comprobar duplicados y de escribir", async () => {
    const db = createFakeDb();
    await createSellerRequest(asDb(db), A, { kind: "services" });
    expect(db.state.calls).toEqual(["lock_timeout", `lock:${sellerRequestLockKey(A, "services")}`, "findFirst", "create"]);
    expect(db.state.txOptions).toEqual([TX_OPTIONS]);
  });

  it("reabrir toma el MISMO candado que crear, antes de leer, y vuelve a leer dentro", async () => {
    const db = createFakeDb();
    const closed = db.seed({ sellerId: A, kind: "services", status: "closed" });
    await changeSellerRequestStatus(asDb(db), closed.id, "open");
    expect(db.state.calls).toEqual([
      "findUnique", // lectura previa, solo para conocer persona y tipo
      "lock_timeout",
      `lock:${sellerRequestLockKey(A, "services")}`,
      "findUnique", // relectura con el candado tomado
      "findFirst", // búsqueda de otra abierta
      "update",
    ]);
  });
});

describe("createSellerRequest", () => {
  it("crea open, sin asesor, con el dueño indicado", async () => {
    const db = createFakeDb();
    const created = await createSellerRequest(asDb(db), A, { kind: "find_agent", notes: "Casa en Mérida" });
    expect(created).toMatchObject({ kind: "find_agent", status: "open", notes: "Casa en Mérida" });
    expect(db.rows[0]).toMatchObject({ sellerId: A, agentId: null, status: "open" });
  });

  it("no expone datos internos", async () => {
    const created = await createSellerRequest(asDb(createFakeDb()), A, { kind: "services" });
    expect(Object.keys(created).sort()).toEqual(["createdAt", "id", "kind", "notes", "status"]);
  });

  it("sin notas guarda null", async () => {
    const d = createFakeDb();
    await createSellerRequest(asDb(d), A, { kind: "services" });
    expect(d.rows[0]!.notes).toBeNull();
  });

  it("409 si ya hay una open o una assigned del mismo tipo", async () => {
    for (const status of ["open", "assigned"]) {
      const d = createFakeDb();
      d.seed({ sellerId: A, kind: "services", status });
      const err = await rejection(createSellerRequest(asDb(d), A, { kind: "services" }));
      expect(err).toBeInstanceOf(HttpError);
      expect(err).toMatchObject({ status: 409, code: "request_already_open" });
      expect(d.rows).toHaveLength(1);
    }
  });

  it("permite otro tipo, otra persona, o repetir si la anterior está cerrada", async () => {
    const d = createFakeDb();
    d.seed({ sellerId: A, kind: "services", status: "open" });
    await createSellerRequest(asDb(d), A, { kind: "find_agent" });
    await createSellerRequest(asDb(d), B, { kind: "services" });
    const c = createFakeDb();
    c.seed({ sellerId: A, kind: "services", status: "closed" });
    await createSellerRequest(asDb(c), A, { kind: "services" });
    expect(d.rows).toHaveLength(3);
    expect(c.rows).toHaveLength(2);
  });
});

describe("listSellerRequests", () => {
  it("solo devuelve las de esa persona, con campos explícitos y el orden más reciente primero", async () => {
    const d = createFakeDb();
    d.seed({ sellerId: A, kind: "services", status: "closed" });
    d.seed({ sellerId: B, kind: "services" });
    const newest = d.seed({ sellerId: A, kind: "find_agent" });
    const r = await listSellerRequests(asDb(d), A, 1, 20);
    expect(r.meta).toEqual({ page: 1, pageSize: 20, total: 2 });
    expect(r.data.map((x) => x.id)[0]).toBe(newest.id);
    for (const row of r.data) expect(Object.keys(row).sort()).toEqual(["createdAt", "id", "kind", "notes", "status"]);
  });

  it("pagina sin repetir ni omitir", async () => {
    const d = createFakeDb();
    for (let i = 0; i < 5; i++) d.seed({ sellerId: A, kind: "services", status: "closed" });
    const p1 = await listSellerRequests(asDb(d), A, 1, 2);
    const p2 = await listSellerRequests(asDb(d), A, 2, 2);
    const p3 = await listSellerRequests(asDb(d), A, 3, 2);
    const ids = [...p1.data, ...p2.data, ...p3.data].map((x) => x.id);
    expect(ids).toHaveLength(5);
    expect(new Set(ids).size).toBe(5);
    expect(p3.meta.total).toBe(5);
  });
});

describe("changeSellerRequestStatus", () => {
  it("404 si la solicitud no existe", async () => {
    const err = await rejection(changeSellerRequestStatus(asDb(createFakeDb()), "00000000-0000-4000-8000-000000000999", "closed"));
    expect(err).toMatchObject({ status: 404, code: "not_found" });
  });

  it("open → assigned y assigned → closed siguen funcionando, aunque haya duplicados anteriores", async () => {
    const d = createFakeDb();
    const first = d.seed({ sellerId: A, kind: "services", status: "open" });
    d.seed({ sellerId: A, kind: "services", status: "open" }); // duplicado previo: no se corrige ni bloquea esta transición
    expect(await changeSellerRequestStatus(asDb(d), first.id, "assigned")).toMatchObject({ status: "assigned" });
    expect(await changeSellerRequestStatus(asDb(d), first.id, "closed")).toMatchObject({ status: "closed" });
    expect(d.rows[0]!.agentId).toBeNull(); // no se inventa asignación de asesor
  });

  it("reabrir una cerrada sin otra abierta funciona (a open y a assigned)", async () => {
    for (const target of ["open", "assigned"] as const) {
      const d = createFakeDb();
      const closed = d.seed({ sellerId: A, kind: "services", status: "closed" });
      expect(await changeSellerRequestStatus(asDb(d), closed.id, target)).toMatchObject({ status: target });
    }
  });

  it("reabrir con otra abierta (open o assigned) del mismo tipo y persona → 409 y no cambia nada", async () => {
    for (const otherStatus of ["open", "assigned"]) {
      const d = createFakeDb();
      const closed = d.seed({ sellerId: A, kind: "services", status: "closed" });
      d.seed({ sellerId: A, kind: "services", status: otherStatus });
      const err = await rejection(changeSellerRequestStatus(asDb(d), closed.id, "open"));
      expect(err).toMatchObject({ status: 409, code: "request_already_open" });
      expect(d.rows.find((r) => r.id === closed.id)!.status).toBe("closed");
    }
  });

  it("otras abiertas de otro tipo o de otra persona no estorban", async () => {
    const d = createFakeDb();
    const closed = d.seed({ sellerId: A, kind: "services", status: "closed" });
    d.seed({ sellerId: A, kind: "find_agent", status: "open" });
    d.seed({ sellerId: B, kind: "services", status: "open" });
    expect(await changeSellerRequestStatus(asDb(d), closed.id, "open")).toMatchObject({ status: "open" });
  });

  it("la propia solicitud se excluye del conflicto (closed → closed y open → open)", async () => {
    const d = createFakeDb();
    const s = d.seed({ sellerId: A, kind: "services", status: "open" });
    expect(await changeSellerRequestStatus(asDb(d), s.id, "open")).toMatchObject({ status: "open" });
    expect(await changeSellerRequestStatus(asDb(d), s.id, "closed")).toMatchObject({ status: "closed" });
    expect(await changeSellerRequestStatus(asDb(d), s.id, "closed")).toMatchObject({ status: "closed" });
  });
});

describe("mapBusyError: fallo técnico ≠ conflicto de negocio", () => {
  const known = (code: string, meta?: Record<string, unknown>) => new Prisma.PrismaClientKnownRequestError("x", { code, clientVersion: "6", ...(meta && { meta }) });
  const status = (e: unknown) => {
    try {
      mapBusyError(e);
    } catch (err) {
      return err;
    }
    return undefined;
  };

  it("timeout de transacción, interbloqueo y candado ocupado → 503 busy", () => {
    for (const e of [known("P2028"), known("P2034"), known("P2010", { code: "55P03" })]) {
      expect(status(e)).toMatchObject({ status: 503, code: "busy" });
    }
  });

  it("un conflicto de negocio (409) pasa tal cual", () => {
    const conflict = new HttpError(409, "request_already_open", "x");
    expect(status(conflict)).toBe(conflict);
  });

  it("cualquier otro error se relanza sin disfrazarlo (acaba en 500)", () => {
    const other = new Error("boom");
    expect(status(other)).toBe(other);
    const unrelated = known("P2002");
    expect(status(unrelated)).toBe(unrelated);
    const rawOther = known("P2010", { code: "42P01" });
    expect(status(rawOther)).toBe(rawOther);
  });

  it("crear convierte un timeout de la transacción en 503", async () => {
    const d = createFakeDb();
    d.state.failNextTransaction = known("P2028");
    expect(await rejection(createSellerRequest(asDb(d), A, { kind: "services" }))).toMatchObject({ status: 503, code: "busy" });
  });
});
