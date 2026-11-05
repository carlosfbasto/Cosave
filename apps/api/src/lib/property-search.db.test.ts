import type { Prisma } from "@prisma/client";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { WHITE_SPACE_CODE_POINTS, locationKey, propertySearchQuerySchema, referenceSearch, searchTotalPages } from "@cosave/shared";
import { Prisma as PrismaRuntime } from "@prisma/client";
import { locationKeySql, runPropertySearch, type RawRunner } from "./property-search.js";
import { FIXTURES, fixtureId } from "./property-search.fixtures.js";

/**
 * Pruebas del SQL contra PGlite (PostgreSQL en memoria, WASM). NO sustituyen una prueba contra Supabase:
 * - PGlite 0.5.14 trae PostgreSQL 18.x; Supabase (proyecto `cosave`) corre 17.x.
 * - Su colación es «C» (la de Supabase es otra): por eso la clave de ubicación no usa `lower()`.
 * - Es de un solo usuario y no sirve para medir rendimiento.
 * El esquema de abajo imita `schema.prisma` (solo las columnas que usa la búsqueda).
 */
const DDL = `
CREATE TYPE "PropertyType" AS ENUM ('house','land','apartment','commercial','commercial_warehouse','industrial_warehouse','other');
CREATE TYPE "OperationType" AS ENUM ('sale','rent');
CREATE TYPE "PropertyStatus" AS ENUM ('draft','pending','published','sold','rented','paused','rejected','archived');
CREATE TABLE "Property" (
  "id" uuid PRIMARY KEY, "publicCode" text NOT NULL, "type" "PropertyType" NOT NULL, "operation" "OperationType" NOT NULL,
  "status" "PropertyStatus" NOT NULL, "title" text NOT NULL, "description" text, "price" numeric(14,2) NOT NULL,
  "publishedAt" timestamp(3), "createdAt" timestamp(3) NOT NULL
);
CREATE TABLE "PropertyLocation" (
  "propertyId" uuid PRIMARY KEY REFERENCES "Property"("id"), "state" text NOT NULL, "city" text NOT NULL, "zone" text,
  "latitude" double precision, "longitude" double precision
);
CREATE TABLE "PropertyFeatures" (
  "propertyId" uuid PRIMARY KEY REFERENCES "Property"("id"), "bedrooms" integer, "bathrooms" integer,
  "landAreaM2" double precision, "builtAreaM2" double precision
);
`;

let db: PGlite;
let version = "";

const run: RawRunner = async <T>(sql: Prisma.Sql) => (await db.query<T>(sql.text, sql.values)).rows;
const parse = (raw: Record<string, unknown>) => propertySearchQuerySchema.parse(raw);
const published = FIXTURES.filter((f) => f.status === "published");
const search = async (raw: Record<string, unknown>) => runPropertySearch(run, parse(raw));
const nums = (ids: string[]) => ids.map((id) => Number(id.slice(-12)));
const sorted = (n: number[]) => [...n].sort((a, b) => a - b);

beforeAll(async () => {
  db = new PGlite();
  await db.exec(DDL);
  for (const f of FIXTURES) {
    await db.query(
      `INSERT INTO "Property" VALUES ($1::uuid, $2, $3::"PropertyType", $4::"OperationType", $5::"PropertyStatus", $6, $7, $8::numeric, $9::timestamp, $10::timestamp)`,
      [f.id, `COS-${f.id.slice(-6)}`, f.type, f.operation, f.status, f.title, f.description, f.price, f.publishedAt, f.createdAt],
    );
    if (f.hasLocation) await db.query(`INSERT INTO "PropertyLocation"("propertyId","state","city","zone") VALUES ($1::uuid, $2, $3, $4)`, [f.id, f.state, f.city, f.zone]);
    if (f.hasFeatures)
      await db.query(`INSERT INTO "PropertyFeatures" VALUES ($1::uuid, $2, $3, $4, $5)`, [f.id, f.bedrooms, f.bathrooms, f.landAreaM2, f.builtAreaM2]);
  }
  version = String((await db.query<{ v: string }>("select version() as v")).rows[0]?.v);
});

afterAll(async () => {
  await db.close();
});

describe("PGlite (entorno de prueba)", () => {
  it("registra la versión de PostgreSQL y la codificación", async () => {
    const enc = (await db.query<{ e: string }>("select current_setting('server_encoding') as e")).rows[0]?.e;
    console.log(`[PGlite] ${version.split(" on ")[0]} · codificación ${enc}`);
    expect(version).toMatch(/^PostgreSQL 1[78]\./);
    expect(enc).toBe("UTF8");
  });
});

describe("clave de ubicación: TypeScript y SQL dan exactamente lo mismo", () => {
  const inputs = [
    "Mérida", "MERIDA", "merida", "  Mérida ", "Tizimin", "Tizimín", "TIZIMÍN", "Peña", "Pena", "PEÑA", "peña", "Peña", "Mérida",
    "San Pedro", "San-Pedro", "San  Pedro", "San Pedro", "San Pedro", "San　Pedro", "San Pedro", "San\u0085Pedro",
    "Panabá", "Panaba", "Zona industrial", "Zona  industrial", "ZONA INDUSTRIAL", "Çiudad", "ciudad", "Ñandú", "ñandú", "ÁÉÍÓÚ Ü", "áéíóú ü",
    "Àà Ââ Ãã Ää Åå", "Ýý Ÿÿ", "Centro", "Col. Centro", "", " ", "\t\n", "　", "  ",
    "San​Pedro", "﻿Mérida", "Mérida​", "ā", "Ж", "ß", "İstanbul", "ǅ", "日本", "---", "😀 Mérida", "  😀  ", "a\tb\nc\rd\fe\vf",
    ...WHITE_SPACE_CODE_POINTS.flatMap((cp) => {
      const sp = String.fromCharCode(cp);
      return [`A${sp}B`, `${sp}A`, `A${sp}`, `A${sp}${sp}B`, `${sp}${sp}`];
    }),
  ];

  it(`coincide en ${inputs.length} entradas (acentos, mayúsculas, ñ, espacios Unicode, NFC/NFD y caracteres fuera de la tabla)`, async () => {
    // Se compara en hexadecimal (bytes UTF-8): el cliente de PGlite descarta un U+FEFF inicial al decodificar texto.
    for (const value of inputs) {
      const rows = await run<{ k: string | null }>(
        PrismaRuntime.sql`SELECT encode(convert_to(${locationKeySql(PrismaRuntime.sql`${value}`)}, 'UTF8'), 'hex') AS "k"`,
      );
      expect({ value: JSON.stringify(value), key: rows[0]?.k }).toEqual({ value: JSON.stringify(value), key: Buffer.from(locationKey(value), "utf8").toString("hex") });
    }
  });
});

describe("búsqueda en SQL = implementación de referencia", () => {
  const queries: Record<string, unknown>[] = [
    {},
    { operation: "sale" },
    { operation: "rent" },
    { type: "house" },
    { type: ["house", "land"] },
    { type: ["apartment", "industrial_warehouse", "commercial"] },
    { state: "yucatan" },
    { state: ["Yucatán", "otro"] },
    { city: "merida" },
    { city: "MÉRIDA" },
    { city: ["Mérida", "Valladolid"] },
    { city: "Tizimin" },
    { city: "Tizimín" },
    { city: ["Tizimin", "Tizimín"] },
    { city: "Peña" },
    { city: "Pena" },
    { city: ["Peña", "Pena"] },
    { city: "San Pedro" },
    { city: "San-Pedro" },
    { city: "Panaba" },
    { city: "Cancún" },
    { zone: "Centro" },
    { zone: "centro" },
    { zone: "Norte" },
    { zone: "zona industrial" },
    { zone: ["Oriente", "Sur"] },
    { city: "Tizimín", zone: "Oriente" },
    { city: "Mérida", type: "house", operation: "sale" },
    { minPrice: "1000000" },
    { maxPrice: "700000" },
    { minPrice: "640000", maxPrice: "650000" },
    { minPrice: "1000000", maxPrice: "1000000" },
    { minBedrooms: "2" },
    { maxBedrooms: "0" },
    { minBedrooms: "2", maxBedrooms: "3" },
    { minBathrooms: "2" },
    { maxBathrooms: "0" },
    { minBuilt: "100" },
    { maxBuilt: "0" },
    { minBuilt: "90", maxBuilt: "100" },
    { minLand: "300" },
    { maxLand: "0" },
    { q: "merida" },
    { q: "Mérida" },
    { q: "casa" },
    { q: "casas" },
    { q: "casa en merida hasta 2 millones" },
    { q: "desde 800 mil" },
    { q: "hasta 1 millon" },
    { q: "desde 800 mil", maxPrice: "1500000" },
    { q: "hasta 2 millones", maxPrice: "1000000" },
    { q: "desde 400 mil", minPrice: "700000" },
    { q: "rentar" },
    { q: "alquiler" },
    { q: "comprar" },
    { q: "bodega industrial" },
    { q: "alberca" },
    { q: "centro" },
    { q: "pena" },
    { q: "san pedro" },
    { q: "jardin" },
    { q: "epoca" },
    { q: "yucatan" },
    { q: "inexistente" },
    { q: "casa merida", city: "Mérida", minPrice: "1000000" },
    { sort: "price_asc" },
    { sort: "price_desc" },
    { sort: "recent" },
    { sort: "price_asc", operation: "rent" },
    { sort: "price_desc", city: ["San Pedro", "San-Pedro"] },
    { page: "2", pageSize: "5" },
    { page: "99", pageSize: "10" },
  ];

  it.each(queries.map((q) => [JSON.stringify(q), q] as const))("%s", async (_name, raw) => {
    for (const pageSize of ["50", "4"]) {
      const totalPages = searchTotalPages(referenceSearch(published, parse({ ...raw, pageSize, page: "1" })).total, Number(pageSize));
      const lastPage = "page" in raw && pageSize === "50" ? Number(raw.page) : totalPages;
      const pages = "page" in raw && pageSize === "50" ? [Number(raw.page)] : Array.from({ length: lastPage + 1 }, (_, i) => i + 1);
      for (const page of pages) {
        const query = { ...raw, pageSize, page: String(page) };
        const expected = referenceSearch(published, parse(query));
        const actual = await search(query);
        expect({ ids: actual.ids, total: actual.total, totalPages: actual.totalPages }).toEqual(expected);
      }
    }
  });
});

describe("casos con significado propio (SQL)", () => {
  it("Tizimin y Tizimín: las mismas 4 propiedades, con cualquier variante o mayúsculas", async () => {
    for (const city of ["Tizimin", "Tizimín", "TIZIMÍN", "  tizimin  ", ["Tizimin", "Tizimín"]]) {
      const r = await search({ city, pageSize: "50" });
      expect(r.total).toBe(4);
      expect(sorted(nums(r.ids))).toEqual([7, 8, 9, 10]);
    }
  });

  it("Peña y Pena son lugares distintos", async () => {
    expect(nums((await search({ city: "Peña" })).ids)).toEqual([11]);
    expect(nums((await search({ city: "Pena" })).ids)).toEqual([12]);
    expect(nums((await search({ city: "PEÑA" })).ids)).toEqual([11]);
  });

  it("San Pedro (espacio normal o NBSP) y San-Pedro son lugares distintos", async () => {
    expect(sorted(nums((await search({ city: "San Pedro" })).ids))).toEqual([13, 15]);
    expect(nums((await search({ city: "San-Pedro" })).ids)).toEqual([14]);
    expect(sorted(nums((await search({ city: "san   pedro" })).ids))).toEqual([13, 15]);
  });

  it("Panabá y Panaba son la misma ubicación", async () => {
    expect(sorted(nums((await search({ city: "Panabá" })).ids))).toEqual([19, 20]);
    expect(sorted(nums((await search({ city: "PANABA" })).ids))).toEqual([19, 20]);
  });

  it("la zona nula, vacía o de espacios se filtra como «Centro»", async () => {
    const r = await search({ zone: "Centro", pageSize: "50" });
    // 1, 7, 11, 12, 24: zona «Centro» guardada. Por la regla heredada también entran las que no tienen zona:
    // 4 y 22 (nula), 16 ('') y 17 ('   '), y 21 (sin fila de ubicación: el api la entrega con zona nula).
    expect(sorted(nums(r.ids))).toEqual([1, 4, 7, 11, 12, 16, 17, 21, 22, 24]);
  });

  it("estado Yucatán con acentos y mayúsculas distintas", async () => {
    const r = await search({ state: "yucatan", pageSize: "50" });
    expect(r.total).toBe(published.filter((p) => p.state !== null).length);
  });

  it("una propiedad sin ubicación o con ciudad vacía no coincide con filtros de ubicación, pero sí sin ellos", async () => {
    const todas = nums((await search({ pageSize: "50" })).ids);
    expect(todas).toContain(21);
    expect(todas).toContain(22);
    for (const city of ["Mérida", "", "x"].filter(Boolean)) {
      const ids = nums((await search({ city, pageSize: "50" })).ids);
      expect(ids).not.toContain(21);
      expect(ids).not.toContain(22);
    }
  });

  it("solo devuelve propiedades publicadas (ni borrador ni pausada)", async () => {
    const ids = nums((await search({ pageSize: "50" })).ids);
    expect(ids).not.toContain(18);
    expect(ids).not.toContain(23);
    expect((await search({})).total).toBe(published.length);
  });

  it("los nulos de recámaras y baños cuentan como 0; la superficie usa construida, luego terreno, luego 0", async () => {
    expect(nums((await search({ maxBedrooms: "0", pageSize: "50" })).ids)).toEqual(expect.arrayContaining([4, 5, 6, 10, 22, 24]));
    // Sin superficie construida se usa el terreno: 4 (terreno 500), 10 (400) y 6 (construida 800).
    expect(sorted(nums((await search({ minBuilt: "400", pageSize: "50" })).ids))).toEqual([4, 6, 10]);
    expect(nums((await search({ minBuilt: "300", maxBuilt: "300", pageSize: "50" })).ids)).toEqual([22]);
    // Sin ninguna superficie (ni características) la superficie es 0.
    expect(nums((await search({ maxBuilt: "0", pageSize: "50" })).ids)).toEqual(expect.arrayContaining([21, 24]));
  });

  it("el precio incluye los extremos", async () => {
    expect(sorted(nums((await search({ minPrice: "1000000", maxPrice: "1000000", pageSize: "50" })).ids))).toEqual([13, 14, 15]);
  });

  it("la búsqueda libre sigue plegando la ñ: «pena» encuentra Peña y Pena", async () => {
    expect(sorted(nums((await search({ q: "pena", pageSize: "50" })).ids))).toEqual([11, 12]);
  });

  it("«merida» encuentra Mérida, merida y MÉRIDA; «casas» (plural) encuentra casas", async () => {
    const m = nums((await search({ q: "merida", pageSize: "50" })).ids);
    expect(m).toEqual(expect.arrayContaining([1, 2, 3, 4]));
    const c = nums((await search({ q: "casas", pageSize: "50" })).ids);
    expect(c).toEqual(expect.arrayContaining([1, 2, 25]));
  });

  it("el precio dentro del texto se combina por intersección con los filtros", async () => {
    const r = await search({ q: "casa hasta 2 millones", maxPrice: "1000000", pageSize: "50" });
    for (const f of published.filter((p) => nums(r.ids).includes(Number(p.id.slice(-12))))) expect(f.price).toBeLessThanOrEqual(1_000_000);
  });

  it("las páginas no repiten ni omiten filas y suman el total, en los tres órdenes", async () => {
    for (const sort of ["recent", "price_asc", "price_desc"]) {
      const first = await search({ sort, pageSize: "4" });
      const seen: string[] = [];
      for (let page = 1; page <= first.totalPages; page++) seen.push(...(await search({ sort, pageSize: "4", page: String(page) })).ids);
      expect(seen).toHaveLength(first.total);
      expect(new Set(seen).size).toBe(first.total);
    }
  });

  it("una página fuera de rango queda vacía con el total correcto", async () => {
    const r = await search({ page: "50", pageSize: "10" });
    expect(r.ids).toEqual([]);
    expect(r.total).toBe(published.length);
    expect(r.totalPages).toBe(Math.ceil(published.length / 10));
  });

  it("sin resultados: total 0 y una página", async () => {
    expect(await search({ city: "Cancún" })).toEqual({ ids: [], total: 0, totalPages: 1 });
  });

  it("el orden por defecto es el más reciente primero, con desempate estable", async () => {
    const r = await search({ pageSize: "50" });
    expect(r.ids[0]).toBe(fixtureId(24));
    expect(r.ids.at(-1)).toBe(fixtureId(25));
  });

  it("un valor con comillas o SQL no rompe nada ni devuelve filas de más", async () => {
    const attack = "'; DROP TABLE \"Property\"; --";
    for (const raw of [{ city: attack }, { state: attack }, { zone: attack }, { q: `casa ${attack}` }]) {
      const r = await search(raw);
      expect(r.total).toBe(0);
    }
    const stillThere = await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM "Property"`);
    expect(stillThere.rows[0]?.n).toBe(FIXTURES.length);
  });

  it("un filtro de ubicación nunca coincide con filas sin valor (la clave vacía no se compara)", async () => {
    // Estas ubicaciones se rechazan en el esquema; aquí se prueba además el SQL directamente.
    const sql = PrismaRuntime.sql`SELECT count(*)::int AS "n" FROM "PropertyLocation" l WHERE NULLIF(${locationKeySql(PrismaRuntime.sql`l."city"`)}, '') IN (${locationKeySql(PrismaRuntime.sql`${"   "}`)})`;
    expect((await run<{ n: number }>(sql))[0]?.n).toBe(0);
  });
});
