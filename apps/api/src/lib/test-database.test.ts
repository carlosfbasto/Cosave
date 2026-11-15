import { Prisma } from "@prisma/client";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  assertLocalTestServer,
  assertSafeTestDatabase,
  describeTarget,
  inspectServer,
  parseTestTarget,
  sameTarget,
  versionLabel,
  withPool,
  type ServerInfo,
} from "./test-database.js";

const SECRET = "ContraseñaSecreta123";
const url = (host: string, db = "cosave_test", extra = "") => `postgresql://usuario:${SECRET}@${host}/${db}${extra}`;
const message = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    return (e as Error).message;
  }
  return undefined;
};

describe("guarda de la base de pruebas (siempre corre, sin red)", () => {
  it("acepta solo bases locales con «test» en el nombre", () => {
    for (const host of ["localhost:5432", "127.0.0.1:54329", "[::1]:5432", "LOCALHOST"]) expect(() => assertSafeTestDatabase(url(host)), host).not.toThrow();
    expect(parseTestTarget(url("127.0.0.1:54329"))).toEqual({ host: "127.0.0.1", port: "54329", database: "cosave_test" });
    expect(parseTestTarget(url("localhost")).port).toBe("5432");
  });

  it("rechaza servidores remotos, incluidos los de Supabase", () => {
    for (const host of ["db.ejemplo123.supabase.co:5432", "aws-0-us-east-1.pooler.supabase.com:6543", "example.com", "10.0.0.5:5432", "0.0.0.0:5432", "localhost.example.com"]) {
      expect(message(() => assertSafeTestDatabase(url(host))), host).toMatch(/no es local/);
    }
  });

  it("rechaza bases cuyo nombre no contiene «test»", () => {
    for (const db of ["postgres", "cosave", "cosave_prod"]) {
      expect(message(() => assertSafeTestDatabase(url("localhost", db))), db).toMatch(/no parece de pruebas/);
    }
    expect(() => assertSafeTestDatabase(url("localhost", "cosave_test_2"))).not.toThrow();
  });

  it("rechaza parámetros que pueden redirigir la conexión a otro servidor", () => {
    for (const extra of ["?host=db.ejemplo.supabase.co", "?hostaddr=10.0.0.5", "?service=prod", "?options=-c%20x=1"]) {
      expect(message(() => assertSafeTestDatabase(url("localhost", "cosave_test", extra))), extra).toMatch(/no puede llevar el parámetro/);
    }
    expect(() => assertSafeTestDatabase(url("localhost", "cosave_test", "?schema=public&connection_limit=5"))).not.toThrow();
  });

  it("rechaza URL mal formadas y otros protocolos", () => {
    expect(message(() => assertSafeTestDatabase("no es una url"))).toMatch(/no es una URL válida/);
    expect(message(() => assertSafeTestDatabase(`mysql://u:${SECRET}@localhost/cosave_test`))).toMatch(/postgresql/);
    expect(message(() => assertSafeTestDatabase(""))).toBeDefined();
  });

  it("ningún mensaje de error ni descripción contiene la contraseña ni el usuario", () => {
    const attempts = [url("db.x.supabase.co:5432"), url("localhost", "postgres"), url("localhost", "cosave_test", "?host=otro"), `mysql://usuario:${SECRET}@localhost/cosave_test`, `ht!tp://usuario:${SECRET}`];
    for (const a of attempts) {
      const m = message(() => assertSafeTestDatabase(a)) ?? "";
      expect(m, a).not.toContain(SECRET);
      expect(m, a).not.toContain("usuario");
    }
    const shown = describeTarget(url("127.0.0.1:54329"));
    expect(shown).toBe("127.0.0.1:54329/cosave_test");
    expect(shown).not.toContain(SECRET);
  });

  it("withPool agrega el tamaño del pool sin tocar lo demás", () => {
    const pooled = new URL(withPool(url("localhost:5432", "cosave_test", "?schema=public"), 20));
    expect(pooled.searchParams.get("connection_limit")).toBe("20");
    expect(pooled.searchParams.get("schema")).toBe("public");
    expect(pooled.hostname).toBe("localhost");
  });

  it("sameTarget detecta el mismo servidor y base aunque cambie el alias local, el puerto por defecto o las credenciales", () => {
    expect(sameTarget(url("localhost:5432"), `postgresql://otro:otra@127.0.0.1/cosave_test`)).toBe(true);
    expect(sameTarget(url("localhost:5432"), url("[::1]:5432"))).toBe(true);
    expect(sameTarget(url("db.x.supabase.co:5432", "postgres"), url("db.x.supabase.co", "postgres"))).toBe(true);
    expect(sameTarget(url("localhost:5432"), url("localhost:5433"))).toBe(false);
    expect(sameTarget(url("localhost:5432"), url("localhost:5432", "otra_test"))).toBe(false);
    expect(sameTarget(url("db.x.supabase.co:5432", "postgres"), url("localhost:5432"))).toBe(false);
    expect(sameTarget("basura", url("localhost"))).toBe(false); // nunca lanza
  });
});

describe("assertLocalTestServer (lo que responde el propio servidor)", () => {
  const ok: ServerInfo = { database: "cosave_test", address: "127.0.0.1", versionNum: 170011, foreignTables: 0, hasMigrationsTable: false };
  const err = (info: Partial<ServerInfo>, mode: "migrate" | "tests") => message(() => assertLocalTestServer({ ...ok, ...info }, mode));

  it("acepta una base de pruebas local, vacía, para migrar; y migrada, para probar", () => {
    expect(err({}, "migrate")).toBeUndefined();
    expect(err({ address: "::1" }, "migrate")).toBeUndefined();
    expect(err({ address: "socket" }, "migrate")).toBeUndefined();
    expect(err({ foreignTables: 40, hasMigrationsTable: true }, "tests")).toBeUndefined();
  });

  it("rechaza una base que no es de pruebas, un servidor que no es esta máquina o una versión vieja", () => {
    expect(err({ database: "postgres" }, "migrate")).toMatch(/no parece de pruebas/);
    expect(err({ address: "54.12.8.9" }, "migrate")).toMatch(/no es esta máquina/);
    expect(err({ address: "10.0.0.5" }, "tests")).toMatch(/no es esta máquina/);
    expect(err({ versionNum: 140010 }, "migrate")).toMatch(/anterior al mínimo/);
  });

  it("no migra una base ajena con tablas propias, pero sí una que ya creó Prisma", () => {
    expect(err({ foreignTables: 3, hasMigrationsTable: false }, "migrate")).toMatch(/base ajena/);
    expect(err({ foreignTables: 3, hasMigrationsTable: true }, "migrate")).toBeUndefined();
  });

  it("para las pruebas exige que las migraciones ya estén aplicadas", () => {
    expect(err({ hasMigrationsTable: false }, "tests")).toMatch(/db:deploy:test/);
  });

  it("versionLabel convierte server_version_num", () => {
    expect(versionLabel(170011)).toBe("17.11");
    expect(versionLabel(150004)).toBe("15.4");
  });
});

describe("inspectServer: la consulta es válida en un PostgreSQL real (PGlite)", () => {
  let db: PGlite;
  beforeAll(async () => {
    db = await PGlite.create();
  });
  afterAll(async () => {
    await db.close();
  });
  // Adaptador mínimo: `$queryRaw` como etiqueta de plantilla → texto SQL con $1, $2… (igual que hace Prisma).
  const querier = { $queryRaw: async (strings: TemplateStringsArray, ...values: unknown[]) => (await db.query(Prisma.sql(strings, ...values).text, Prisma.sql(strings, ...values).values)).rows } as never;

  it("devuelve base, dirección, versión y las tablas que ve en `public`", async () => {
    await db.exec(`CREATE TABLE "Propia" (id int)`);
    const info = await inspectServer(querier);
    expect(typeof info.database).toBe("string");
    expect(typeof info.address).toBe("string"); // PGlite no usa TCP: responde «socket»
    expect(info.versionNum).toBeGreaterThanOrEqual(150000);
    expect(info.foreignTables).toBe(1);
    expect(info.hasMigrationsTable).toBe(false);
    await db.exec(`CREATE TABLE "_prisma_migrations" (id int)`);
    const after = await inspectServer(querier);
    expect(after.hasMigrationsTable).toBe(true);
    expect(after.foreignTables).toBe(1); // _prisma_migrations no cuenta como ajena
  });
});
