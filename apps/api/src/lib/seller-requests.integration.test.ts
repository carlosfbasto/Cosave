import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { Prisma, PrismaClient } from "@prisma/client";
import { SignJWT } from "jose";
import type { SellerRequestKind } from "@cosave/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { errorBody, HttpError } from "./errors.js";
import { changeSellerRequestStatus, createSellerRequest, listSellerRequests, lockSellerRequest } from "./seller-requests.js";
import { assertLocalTestServer, assertSafeTestDatabase, inspectServer, withPool } from "./test-database.js";

/**
 * Pruebas de CONCURRENCIA REAL del candado de solicitudes, contra un PostgreSQL de pruebas.
 *
 * Se omiten solas si no existe `TEST_DATABASE_URL`. Para correrlas (secuencia completa en el reporte de M1):
 *   1. PostgreSQL LOCAL con una base cuyo nombre contenga "test" (p. ej. cosave_test).
 *   2. Crear las tablas SOLO con:  pnpm --filter @cosave/api db:deploy:test   (valida el destino antes de migrar)
 *   3. TEST_DATABASE_URL=<esa url> pnpm --filter @cosave/api exec vitest run src/lib/seller-requests.integration.test.ts
 *
 * Seguridad (guarda en ./test-database.ts, con sus propias pruebas): antes de escribir se niega si el host no es local,
 * si la base no contiene "test", si la URL lleva `host=`, o si el propio servidor dice que no es esta máquina.
 *
 * Limpieza: cada ejecución genera un identificador único (RUN_ID) y solo borra los perfiles que ELLA creó,
 * por id concreto Y con el correo `m1-test-<RUN_ID>-…@example.invalid`. Nada más. Las solicitudes caen en cascada.
 */
const url = process.env["TEST_DATABASE_URL"];

/** Identificador único de esta ejecución. Los datos de una ejecución anterior que se interrumpió no se tocan. */
const RUN_ID = randomUUID().slice(0, 8);
const testEmail = (userId: string) => `m1-test-${RUN_ID}-${userId}@example.invalid`;

const ROUNDS = 15;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const suite = url ? describe : describe.skip;

/** Barrera: `n` participantes esperan a que lleguen todos. Si no llegan en `ms`, falla (evita colgar la prueba). */
function barrier(n: number, ms = 5000) {
  let arrived = 0;
  let open!: () => void;
  const gate = new Promise<void>((resolve) => (open = resolve));
  return () => {
    if (++arrived >= n) open();
    return Promise.race([gate, new Promise<never>((_, reject) => setTimeout(() => reject(new Error("barrera: no llegaron todos a tiempo")), ms))]);
  };
}

suite("solicitudes: concurrencia real en PostgreSQL", () => {
  let prisma: PrismaClient;
  let safeUrl: string;
  const createdUsers: string[] = [];

  const newUser = async () => {
    const id = randomUUID();
    await prisma.profile.create({ data: { id, email: testEmail(id), fullName: "Prueba M1" } });
    createdUsers.push(id);
    return id;
  };
  const openCount = (sellerId: string, kind: SellerRequestKind) => prisma.sellerRequest.count({ where: { sellerId, kind, status: { in: ["open", "assigned"] } } });
  const closedRow = async (sellerId: string, kind: SellerRequestKind) => (await prisma.sellerRequest.create({ data: { sellerId, kind, status: "closed" } })).id;
  const conflicts = (r: PromiseSettledResult<unknown>) => r.status === "rejected" && r.reason instanceof HttpError && r.reason.status === 409 && r.reason.code === "request_already_open";

  /** Mantiene tomado el candado de persona + tipo en una transacción aparte hasta `release()`. */
  function holdLock(sellerId: string, kind: SellerRequestKind) {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    let markHeld!: () => void;
    const held = new Promise<void>((resolve) => (markHeld = resolve));
    const done = prisma.$transaction(
      async (tx) => {
        await lockSellerRequest(tx, sellerId, kind);
        markHeld();
        await gate;
      },
      { maxWait: 5_000, timeout: 30_000 },
    );
    return { held, release, done };
  }

  beforeAll(async () => {
    safeUrl = withPool(assertSafeTestDatabase(url!), 20);
    prisma = new PrismaClient({ datasourceUrl: safeUrl });
    // Antes de escribir nada, el propio servidor dice dónde está y qué base es.
    assertLocalTestServer(await inspectServer(prisma), "tests");
  });

  afterAll(async () => {
    // Solo lo creado en ESTA ejecución: id concreto Y correo con el RUN_ID. Las solicitudes caen en cascada (onDelete: Cascade).
    if (createdUsers.length) {
      const { count } = await prisma.profile.deleteMany({ where: { id: { in: createdUsers }, email: { startsWith: `m1-test-${RUN_ID}-` } } });
      console.log(`[limpieza] ejecución ${RUN_ID}: ${count} perfiles borrados de ${createdUsers.length} registrados`);
      if (count !== createdUsers.length) console.warn("[limpieza] hubo ids registrados que no llegaron a crearse (normal si una prueba falló antes de crear el perfil)");
    }
    await prisma.$disconnect();
  });

  describe("el montaje de la prueba es válido", () => {
    it("dos transacciones simultáneas usan conexiones (procesos de PostgreSQL) distintas", async () => {
      const wait = barrier(2);
      const pids = await Promise.all(
        [0, 1].map(() =>
          prisma.$transaction(
            async (tx) => {
              const [row] = await tx.$queryRaw<{ pid: number }[]>`SELECT pg_backend_pid() AS pid`;
              await wait(); // ambas deben estar abiertas a la vez; con una sola conexión esto agotaría la barrera
              return row!.pid;
            },
            { maxWait: 5_000, timeout: 10_000 },
          ),
        ),
      );
      expect(pids[0]).not.toBe(pids[1]);
    });

    it("CONTROL determinista: sin candado, la misma carrera deja DOS abiertas y la prueba lo detecta", async () => {
      const u = await newUser();
      const wait = barrier(2);
      const naive = () =>
        prisma.$transaction(async (tx) => {
          const existing = await tx.sellerRequest.findFirst({ where: { sellerId: u, kind: "services", status: { in: ["open", "assigned"] } } });
          if (existing) return "ya existía";
          await wait(); // las dos ya comprobaron que no había nada
          await tx.sellerRequest.create({ data: { sellerId: u, kind: "services" } });
          return "creada";
        });
      expect(await Promise.all([naive(), naive()])).toEqual(["creada", "creada"]);
      expect(await openCount(u, "services")).toBe(2); // el contador que usan las demás pruebas SÍ ve el duplicado
    });

    it("control natural (informativo, sin afirmar): cuántas rondas sin candado duplican por azar", async () => {
      let duplicated = 0;
      for (let i = 0; i < ROUNDS; i++) {
        const u = await newUser();
        const naive = () =>
          prisma.$transaction(async (tx) => {
            if (await tx.sellerRequest.findFirst({ where: { sellerId: u, kind: "services", status: { in: ["open", "assigned"] } } })) return;
            await tx.sellerRequest.create({ data: { sellerId: u, kind: "services" } });
          });
        await Promise.all([naive(), naive()]);
        if ((await openCount(u, "services")) > 1) duplicated++;
      }
      console.log(`[control natural sin candado] rondas con duplicado: ${duplicated} de ${ROUNDS}`);
    });
  });

  it("1. dos creaciones simultáneas (mismo usuario y tipo): una crea, una recibe 409, queda una abierta", async () => {
    for (let i = 0; i < ROUNDS; i++) {
      const u = await newUser();
      const r = await Promise.allSettled([createSellerRequest(prisma, u, { kind: "services" }), createSellerRequest(prisma, u, { kind: "services" })]);
      expect(r.filter((x) => x.status === "fulfilled"), `ronda ${i}`).toHaveLength(1);
      expect(r.filter(conflicts), `ronda ${i}`).toHaveLength(1);
      expect(await openCount(u, "services"), `ronda ${i}`).toBe(1);
    }
  });

  it("1b. cinco creaciones simultáneas: exactamente una crea y cuatro reciben 409", async () => {
    const u = await newUser();
    const r = await Promise.allSettled(Array.from({ length: 5 }, () => createSellerRequest(prisma, u, { kind: "find_agent" })));
    expect(r.filter((x) => x.status === "fulfilled")).toHaveLength(1);
    expect(r.filter(conflicts)).toHaveLength(4);
    expect(await openCount(u, "find_agent")).toBe(1);
  });

  it("2. crear y reabrir a la vez: como máximo una abierta (exactamente una gana, la otra recibe 409)", async () => {
    for (let i = 0; i < ROUNDS; i++) {
      const u = await newUser();
      const closed = await closedRow(u, "services");
      const r = await Promise.allSettled([createSellerRequest(prisma, u, { kind: "services" }), changeSellerRequestStatus(prisma, closed, "open")]);
      expect(r.filter((x) => x.status === "fulfilled"), `ronda ${i}`).toHaveLength(1);
      expect(r.filter(conflicts), `ronda ${i}`).toHaveLength(1);
      expect(await openCount(u, "services"), `ronda ${i}`).toBe(1);
    }
  });

  it("3. dos reaperturas simultáneas de solicitudes distintas (mismo usuario y tipo): una gana, la otra 409, queda una abierta", async () => {
    for (let i = 0; i < ROUNDS; i++) {
      const u = await newUser();
      const [x, y] = [await closedRow(u, "services"), await closedRow(u, "services")];
      const r = await Promise.allSettled([changeSellerRequestStatus(prisma, x, "open"), changeSellerRequestStatus(prisma, y, "assigned")]);
      expect(r.filter((v) => v.status === "fulfilled"), `ronda ${i}`).toHaveLength(1);
      expect(r.filter(conflicts), `ronda ${i}`).toHaveLength(1);
      expect(await openCount(u, "services"), `ronda ${i}`).toBe(1);
    }
  });

  it("4. aislamiento: cada usuario crea y ve solo lo suyo, aunque pidan lo mismo a la vez", async () => {
    const [a, b] = [await newUser(), await newUser()];
    const r = await Promise.allSettled([createSellerRequest(prisma, a, { kind: "services", notes: "de A" }), createSellerRequest(prisma, b, { kind: "services", notes: "de B" })]);
    expect(r.every((x) => x.status === "fulfilled")).toBe(true);
    const [la, lb] = await Promise.all([listSellerRequests(prisma, a, 1, 20), listSellerRequests(prisma, b, 1, 20)]);
    expect(la.data.map((x) => x.notes)).toEqual(["de A"]);
    expect(lb.data.map((x) => x.notes)).toEqual(["de B"]);
    expect(la.meta.total).toBe(1);
    expect(la.data.some((x) => lb.data.some((y) => y.id === x.id))).toBe(false);
  });

  it("tipos distintos del mismo usuario no se bloquean entre sí", async () => {
    const u = await newUser();
    const r = await Promise.allSettled((["self_publish", "find_agent", "services"] as const).map((kind) => createSellerRequest(prisma, u, { kind })));
    expect(r.every((x) => x.status === "fulfilled")).toBe(true);
  });

  describe("5. el SQL del candado y lock_timeout funcionan de verdad", () => {
    it("con el candado tomado, otra transacción ESPERA (pg_locks lo muestra) y continúa al soltarlo; otras personas y tipos no esperan", async () => {
      const u = await newUser();
      const h = holdLock(u, "services");
      await h.held;

      let settled = false;
      const waiter = createSellerRequest(prisma, u, { kind: "services" }).finally(() => (settled = true));
      await sleep(600);
      expect(settled, "la segunda creación debía seguir esperando el candado").toBe(false);
      const [waiting] = await prisma.$queryRaw<{ n: bigint }[]>`SELECT count(*) AS n FROM pg_locks WHERE locktype = 'advisory' AND NOT granted`;
      expect(Number(waiting!.n), "pg_locks debía mostrar una espera de candado de aviso").toBeGreaterThanOrEqual(1);

      // No bloquea a otra persona ni a otro tipo de la misma persona.
      const other = await newUser();
      await expect(createSellerRequest(prisma, other, { kind: "services" })).resolves.toMatchObject({ status: "open" });
      await expect(createSellerRequest(prisma, u, { kind: "find_agent" })).resolves.toMatchObject({ status: "open" });
      expect(settled).toBe(false);

      h.release();
      await h.done;
      await expect(waiter).resolves.toMatchObject({ status: "open" });
      expect(await openCount(u, "services")).toBe(1);
    }, 20_000);

    it("el candado se libera solo al terminar la transacción (también si falla)", async () => {
      const u = await newUser();
      await prisma.$transaction(async (tx) => lockSellerRequest(tx, u, "services"), { maxWait: 5_000, timeout: 10_000 });
      await expect(prisma.$transaction(async (tx) => { await lockSellerRequest(tx, u, "services"); throw new Error("falla a propósito"); }, { maxWait: 5_000, timeout: 10_000 })).rejects.toThrow("falla a propósito");
      await expect(createSellerRequest(prisma, u, { kind: "services" })).resolves.toMatchObject({ status: "open" }); // no quedó tomado
    }, 20_000);

    it("lock_timeout (3 s): el error crudo que llega a Prisma, su traducción a 503 y a la respuesta HTTP", async () => {
      const u = await newUser();
      const h = holdLock(u, "services");
      await h.held;

      // (6a) Cómo llega REALMENTE el error de PostgreSQL a Prisma.
      const t0 = Date.now();
      const raw: unknown = await prisma
        .$transaction(async (tx) => lockSellerRequest(tx, u, "services"), { maxWait: 5_000, timeout: 15_000 })
        .then(() => undefined, (e: unknown) => e);
      const waited = Date.now() - t0;
      const shape = raw instanceof Prisma.PrismaClientKnownRequestError ? { class: "PrismaClientKnownRequestError", code: raw.code, meta: raw.meta } : { class: (raw as Error | undefined)?.constructor?.name, message: String((raw as Error | undefined)?.message).slice(0, 200) };
      console.log(`[error crudo de lock_timeout] esperó ${waited} ms →`, JSON.stringify(shape));
      expect(raw instanceof Prisma.PrismaClientKnownRequestError, `forma real: ${JSON.stringify(shape)}`).toBe(true);
      const known = raw as Prisma.PrismaClientKnownRequestError;
      expect({ code: known.code, sqlState: (known.meta as { code?: unknown } | undefined)?.code }, `forma real: ${JSON.stringify(shape)}`).toEqual({ code: "P2010", sqlState: "55P03" });
      expect(waited).toBeGreaterThanOrEqual(2_500); // venció por lock_timeout, no al instante
      expect(waited).toBeLessThan(8_000);

      // (6b) El servicio lo traduce a un HttpError 503 `busy` (no 409 de negocio ni 500).
      const err = await createSellerRequest(prisma, u, { kind: "services" }).then(() => undefined, (e: unknown) => e);
      expect(err).toBeInstanceOf(HttpError);
      expect(err).toMatchObject({ status: 503, code: "busy" });

      // (6c) Y el manejador global lo convierte en la respuesta HTTP.
      const { status, body } = errorBody(err);
      expect(status).toBe(503);
      expect(body.error.code).toBe("busy");

      h.release();
      await h.done;
      expect(await openCount(u, "services")).toBe(0); // el intento fallido no dejó nada a medias
    }, 40_000);
  });

  describe("6. de punta a punta por HTTP (Express real contra la base de pruebas)", () => {
    let server: Server;
    let base: string;
    let disconnectApp: () => Promise<void>;
    const previousUrl = process.env["DATABASE_URL"];

    const token = (sub: string) =>
      new SignJWT({ email: testEmail(sub) }).setProtectedHeader({ alg: "HS256" }).setSubject(sub).setExpirationTime("1h").sign(new TextEncoder().encode("secreto-solo-para-pruebas"));
    const http = async (path: string, sub: string, method = "GET", body?: unknown) => {
      const res = await fetch(`${base}/api/v1${path}`, {
        method,
        headers: { Authorization: `Bearer ${await token(sub)}`, ...(body !== undefined && { "Content-Type": "application/json" }) },
        ...(body !== undefined && { body: JSON.stringify(body) }),
      });
      return { status: res.status, json: (await res.json()) as any };
    };

    beforeAll(async () => {
      // El app lee DATABASE_URL al importarse: se apunta a la base de pruebas ANTES de importarlo.
      process.env["DATABASE_URL"] = safeUrl;
      const { app } = await import("../app.js");
      const { prisma: appPrisma } = await import("./prisma.js");
      disconnectApp = () => appPrisma.$disconnect();
      server = app.listen(0);
      await new Promise<void>((resolve) => server.once("listening", () => resolve()));
      base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    });

    afterAll(async () => {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await disconnectApp();
      if (previousUrl === undefined) delete process.env["DATABASE_URL"];
      else process.env["DATABASE_URL"] = previousUrl;
    });

    it("dos POST simultáneos del mismo usuario y tipo → 201 y 409; el GET ve una sola, y otra persona no la ve", async () => {
      const [a, b] = [randomUUID(), randomUUID()];
      createdUsers.push(a, b); // el perfil lo crea requireAuth con correo m1-test-…; se limpia al final
      const r = await Promise.all([http("/seller-requests", a, "POST", { kind: "services" }), http("/seller-requests", a, "POST", { kind: "services" })]);
      expect(r.map((x) => x.status).sort()).toEqual([201, 409]);
      expect(r.find((x) => x.status === 409)!.json.error.code).toBe("request_already_open");
      expect((await http("/seller-requests", a)).json.data).toHaveLength(1);
      expect((await http("/seller-requests", b)).json.data).toHaveLength(0);
    }, 20_000);

    it("con el candado ocupado, el POST responde 503 busy en unos 3 s", async () => {
      const u = randomUUID();
      createdUsers.push(u);
      await http("/seller-requests", u); // crea el perfil (requireAuth) sin tocar solicitudes
      const h = holdLock(u, "services");
      await h.held;
      const t0 = Date.now();
      const r = await http("/seller-requests", u, "POST", { kind: "services" });
      const waited = Date.now() - t0;
      expect(r.status).toBe(503);
      expect(r.json.error.code).toBe("busy");
      expect(waited).toBeGreaterThanOrEqual(2_500);
      h.release();
      await h.done;
      expect(await openCount(u, "services")).toBe(0);
    }, 40_000);
  });
});
