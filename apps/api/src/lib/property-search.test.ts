import { describe, expect, it } from "vitest";
import {
  LOCATION_FOLD,
  LOCATION_MAX_LENGTH,
  SEARCH_FOLD,
  WHITE_SPACE_CODE_POINTS,
  locationKey,
  matchesFilters,
  norm,
  parseQuery,
  propertySearchQuerySchema,
  referenceSearch,
  resolveSearchFilters,
  searchFiltersSchema,
  searchTotalPages,
  slugify,
  sortProperties,
  stem,
  type SearchableProperty,
} from "@cosave/shared";
import { buildCountSql, buildPageSql, buildSearchConditions } from "./property-search.js";
import { FIXTURES, fixtureId } from "./property-search.fixtures.js";

const parse = (raw: Record<string, unknown>) => propertySearchQuerySchema.parse(raw);
const rejects = (raw: Record<string, unknown>) => expect(propertySearchQuerySchema.safeParse(raw).success).toBe(false);
const ids = (q: Record<string, unknown>) => referenceSearch(FIXTURES, parse(q)).ids.map((id) => Number(id.slice(-12)));

describe("búsqueda libre (comportamiento heredado del web, sin cambios)", () => {
  it("norm quita acentos y mayúsculas; la ñ pasa a n", () => {
    expect(norm("MÉRIDA")).toBe("merida");
    expect(norm("Peña")).toBe("pena");
    expect(norm("Panabá")).toBe("panaba");
  });

  it("stem solo quita la s final (sin regla para -es)", () => {
    expect(stem("casas")).toBe("casa");
    expect(stem("ciudades")).toBe("ciudade");
    expect(stem("mas")).toBe("mas");
    expect(stem("bus")).toBe("bus");
  });

  it("parseQuery: palabras, precio máximo y mínimo", () => {
    expect(parseQuery("casa en Mérida de hasta $2,000,000")).toEqual({ words: ["casa", "merida"], maxPrice: 2_000_000 });
    expect(parseQuery("desde 800 mil")).toEqual({ words: [], minPrice: 800_000 });
    expect(parseQuery("hasta 2 millones")).toEqual({ words: [], maxPrice: 2_000_000 });
    expect(parseQuery("terreno 20k")).toEqual({ words: ["terreno"], maxPrice: 20_000 });
    expect(parseQuery("mas de 1,500,000")).toEqual({ words: [], minPrice: 1_500_000 });
  });

  it("los números menores a 1.000 se descartan (no son recámaras)", () => {
    expect(parseQuery("3 recámaras")).toEqual({ words: ["recamara"] });
  });

  it("vacío y solo palabras vacías no generan palabras ni precio", () => {
    expect(parseQuery("")).toEqual({ words: [] });
    expect(parseQuery("en de la el")).toEqual({ words: [] });
  });

  it("slugify es el de siempre", () => {
    expect(slugify("Mérida")).toBe("merida");
    expect(slugify("Bodega Comercial")).toBe("bodega-comercial");
    expect(slugify("Tizimín")).toBe("tizimin");
    expect(slugify("---")).toBe("");
  });
});

describe("locationKey: identidad de una ubicación", () => {
  it("ignora acentos, mayúsculas y espacios", () => {
    expect(locationKey("Mérida")).toBe("merida");
    expect(locationKey("MERIDA")).toBe("merida");
    expect(locationKey("  Mérida ")).toBe("merida");
    expect(locationKey("Panabá")).toBe(locationKey("Panaba"));
  });

  it("Tizimin y Tizimín son la misma ubicación", () => {
    expect(locationKey("Tizimin")).toBe(locationKey("Tizimín"));
    expect(locationKey("TIZIMÍN")).toBe("tizimin");
  });

  it("la ñ se conserva: Peña y Pena son lugares distintos", () => {
    expect(locationKey("Peña")).toBe("peña");
    expect(locationKey("Peña")).not.toBe(locationKey("Pena"));
    expect(locationKey("PEÑA")).toBe("peña");
  });

  it("n + tilde combinante (NFD) equivale a ñ", () => {
    expect(locationKey("Peña")).toBe(locationKey("Peña"));
    expect(locationKey("Mérida")).toBe("merida");
  });

  it("la puntuación sí distingue: San Pedro ≠ San-Pedro", () => {
    expect(locationKey("San Pedro")).toBe("san pedro");
    expect(locationKey("San-Pedro")).toBe("san-pedro");
    expect(locationKey("San Pedro")).not.toBe(locationKey("San-Pedro"));
  });

  it("otras palabras no se mezclan", () => {
    expect(locationKey("Centro")).not.toBe(locationKey("Col. Centro"));
    expect(locationKey("Mérida")).not.toBe(locationKey("Mérdia"));
  });

  it("espacios repetidos, iniciales y finales", () => {
    expect(locationKey("San   Pedro")).toBe("san pedro");
    expect(locationKey("   San Pedro   ")).toBe("san pedro");
    expect(locationKey("Zona  industrial")).toBe(locationKey("Zona industrial"));
  });

  it("cada espacio Unicode de la lista cuenta como espacio", () => {
    for (const cp of WHITE_SPACE_CODE_POINTS) {
      const sp = String.fromCharCode(cp);
      expect(locationKey(`San${sp}Pedro`)).toBe("san pedro");
      expect(locationKey(`${sp}${sp}Mérida${sp}`)).toBe("merida");
    }
  });

  it("los caracteres de ancho cero NO son espacios (limitación documentada)", () => {
    expect(locationKey("San​Pedro")).not.toBe("san pedro");
    expect(locationKey("Mérida​")).not.toBe("merida");
    expect(locationKey("﻿Mérida")).not.toBe("merida");
  });

  it("valores sin contenido dan clave vacía", () => {
    for (const v of ["", "   ", "\t\n", "　", "  "]) expect(locationKey(v)).toBe("");
  });

  it("es idempotente", () => {
    for (const v of ["Peña  Nieto", "TIZIMÍN", " San Pedro "]) expect(locationKey(locationKey(v))).toBe(locationKey(v));
  });

  it("las tablas de plegado tienen el mismo largo y sin letras repetidas", () => {
    for (const fold of [LOCATION_FOLD, SEARCH_FOLD]) {
      const from = Array.from(fold.from);
      expect(from.length).toBe(Array.from(fold.to).length);
      expect(new Set(from).size).toBe(from.length);
    }
  });

  it("la búsqueda libre pliega la ñ y las ubicaciones no", () => {
    expect(SEARCH_FOLD.map.get("ñ")).toBe("n");
    expect(LOCATION_FOLD.map.get("ñ")).toBe("ñ");
    expect(LOCATION_FOLD.map.get("Ñ")).toBe("ñ");
  });
});

describe("esquema de entrada", () => {
  it("valores por defecto", () => {
    expect(parse({})).toMatchObject({ page: 1, pageSize: 12, sort: "recent" });
  });

  it("convierte textos a números y acepta parámetros únicos o repetidos", () => {
    const q = parse({ page: "2", pageSize: "5", minPrice: "100", type: "house", city: ["Mérida", "Tizimín"] });
    expect(q).toMatchObject({ page: 2, pageSize: 5, minPrice: 100, type: ["house"], city: ["Mérida", "Tizimín"] });
    expect(parse({ city: "Mérida" }).city).toEqual(["Mérida"]);
  });

  it("rechaza pageSize 51, página 0 y orden desconocido", () => {
    rejects({ pageSize: "51" });
    rejects({ pageSize: "0" });
    rejects({ page: "0" });
    rejects({ page: "1.5" });
    rejects({ sort: "random" });
  });

  it("rechaza precios negativos, no numéricos e infinitos", () => {
    rejects({ minPrice: "-1" });
    rejects({ maxPrice: "abc" });
    rejects({ maxPrice: "Infinity" });
    rejects({ minBedrooms: "-2" });
  });

  it("un número vacío cuenta como no enviado (no como 0)", () => {
    expect(parse({ minPrice: "" }).minPrice).toBeUndefined();
  });

  it("rechaza minPrice mayor que maxPrice (y acepta el límite exacto)", () => {
    rejects({ minPrice: "200", maxPrice: "100" });
    expect(parse({ minPrice: "100", maxPrice: "100" }).minPrice).toBe(100);
  });

  it("rechaza tipo y operación inválidos", () => {
    rejects({ type: "castle" });
    rejects({ operation: "swap" });
  });

  it("limita la cantidad de valores repetidos", () => {
    rejects({ type: Array(11).fill("house") });
    rejects({ city: Array.from({ length: 21 }, (_, i) => `Ciudad ${i}`) });
    expect(parse({ city: Array.from({ length: 20 }, (_, i) => `Ciudad ${i}`) }).city).toHaveLength(20);
  });

  it("rechaza texto libre de más de 100 caracteres", () => {
    rejects({ q: "a".repeat(101) });
    expect(parse({ q: "a".repeat(100) }).q).toHaveLength(100);
  });

  it("rechaza ubicaciones vacías, de solo espacios o demasiado largas", () => {
    for (const v of ["", "   ", "　", "  ", "\t\n"]) {
      rejects({ city: v });
      rejects({ state: [v] });
      rejects({ zone: v });
    }
    rejects({ city: "a".repeat(LOCATION_MAX_LENGTH + 1) });
    expect(parse({ city: "a".repeat(LOCATION_MAX_LENGTH) }).city).toHaveLength(1);
  });

  it("los filtros comunes rechazan page, pageSize y sort como parámetros desconocidos", () => {
    expect(() => searchFiltersSchema.parse({ page: "3", sort: "price_asc" })).toThrow("Parámetro desconocido");
    expect(() => searchFiltersSchema.parse({ pageSize: "10" })).toThrow("Parámetro desconocido");
  });
});

describe("constructor SQL", () => {
  const sqlOf = (raw: Record<string, unknown>) => {
    const conditions = buildSearchConditions(parse(raw));
    return conditions.map((c) => c.text).join(" AND ");
  };

  it("siempre exige publicada", () => {
    expect(sqlOf({})).toContain(`p."status"::text = 'published'`);
  });

  it("cada filtro agrega su condición", () => {
    expect(buildSearchConditions(parse({}))).toHaveLength(1);
    expect(buildSearchConditions(parse({ operation: "sale" }))).toHaveLength(2);
    expect(buildSearchConditions(parse({ type: ["house", "land"] }))).toHaveLength(2);
    expect(buildSearchConditions(parse({ city: "Mérida" }))).toHaveLength(2);
    expect(buildSearchConditions(parse({ minPrice: "1", maxPrice: "2" }))).toHaveLength(3);
    expect(buildSearchConditions(parse({ minBedrooms: "1", maxBathrooms: "3", minBuilt: "4", maxLand: "5" }))).toHaveLength(5);
    expect(buildSearchConditions(parse({ q: "casa merida" }))).toHaveLength(3); // una condición por palabra
  });

  it("ningún valor del usuario aparece en el texto SQL: todo viaja como parámetro", () => {
    const attack = "'; DROP TABLE \"Property\"; --";
    const query = parse({ city: attack, state: attack, zone: attack, q: `casa ${attack}` });
    for (const sql of [buildCountSql(query), buildPageSql(query)]) {
      expect(sql.text).not.toContain("DROP TABLE");
      expect(sql.text).not.toContain(attack);
      expect(sql.values).toContain(attack);
    }
  });

  it("los números y las claves de ubicación también son parámetros", () => {
    const sql = buildPageSql(parse({ minPrice: "123456", city: "Tizimín", page: "3", pageSize: "7" }));
    expect(sql.text).not.toContain("123456");
    expect(sql.text).not.toContain("Tizim");
    expect(sql.values).toEqual(expect.arrayContaining([123456, "Tizimín", 7, 14]));
  });

  it("la tabla de plegado y el patrón de espacios viajan como parámetros", () => {
    const sql = buildCountSql(parse({ city: "Mérida" }));
    expect(sql.values).toEqual(expect.arrayContaining([LOCATION_FOLD.from, LOCATION_FOLD.to]));
  });

  it("el orden siempre desempata por fecha de alta e id (páginas estables)", () => {
    for (const sort of ["recent", "price_asc", "price_desc"]) {
      const text = buildPageSql(parse({ sort })).text;
      expect(text).toContain(`p."createdAt" DESC`);
      expect(text).toMatch(/p\."id" ASC\s+LIMIT/);
    }
    expect(buildPageSql(parse({ sort: "price_asc" })).text).toContain(`ORDER BY p."price" ASC`);
    expect(buildPageSql(parse({ sort: "price_desc" })).text).toContain(`ORDER BY p."price" DESC`);
  });

  it("la lista y el conteo comparten las mismas condiciones", () => {
    const query = parse({ city: "Mérida", q: "casa", minPrice: "1000" });
    const where = (text: string) => text.slice(text.indexOf("WHERE"), text.includes("ORDER BY") ? text.indexOf("ORDER BY") : undefined).trim();
    expect(where(buildPageSql(query).text)).toBe(where(buildCountSql(query).text));
  });
});

describe("filtros interpretados", () => {
  it("el precio del texto se combina por intersección con minPrice/maxPrice", () => {
    expect(resolveSearchFilters(parse({ q: "hasta 2 millones", maxPrice: "1500000" })).price).toEqual({ min: undefined, max: 1_500_000 });
    expect(resolveSearchFilters(parse({ q: "hasta 1 millon", maxPrice: "3000000" })).price.max).toBe(1_000_000);
    expect(resolveSearchFilters(parse({ q: "desde 800 mil", minPrice: "500000" })).price.min).toBe(800_000);
    expect(resolveSearchFilters(parse({ q: "desde 400 mil", minPrice: "500000" })).price.min).toBe(500_000);
  });

  it("las variantes de una misma ubicación se reducen a una clave", () => {
    expect(resolveSearchFilters(parse({ city: ["Tizimin", "Tizimín", "TIZIMÍN "] })).city).toEqual(["tizimin"]);
    expect(resolveSearchFilters(parse({ city: ["Peña", "Pena"] })).city).toEqual(["peña", "pena"]);
  });
});

describe("implementación de referencia (valores por defecto heredados del explorador)", () => {
  const base: SearchableProperty = {
    id: "x", title: "Casa", description: null, type: "house", operation: "sale", price: 1, state: "Yucatán", city: "Mérida", zone: null,
    bedrooms: null, bathrooms: null, builtAreaM2: null, landAreaM2: null, publishedAt: null, createdAt: "2026-01-01T00:00:00.000",
  };
  const match = (p: Partial<SearchableProperty>, raw: Record<string, unknown>) => matchesFilters({ ...base, ...p }, resolveSearchFilters(parse(raw)));

  it("recámaras y baños nulos cuentan como 0", () => {
    expect(match({}, { maxBedrooms: "0" })).toBe(true);
    expect(match({}, { minBedrooms: "1" })).toBe(false);
    expect(match({}, { maxBathrooms: "0" })).toBe(true);
  });

  it("la superficie construida usa construida, luego terreno, luego 0", () => {
    expect(match({ builtAreaM2: 50, landAreaM2: 90 }, { minBuilt: "50", maxBuilt: "50" })).toBe(true);
    expect(match({ builtAreaM2: null, landAreaM2: 90 }, { minBuilt: "90" })).toBe(true);
    expect(match({}, { maxBuilt: "0" })).toBe(true);
    expect(match({ landAreaM2: null }, { minLand: "1" })).toBe(false);
  });

  it("una zona nula o vacía se muestra y filtra como «Centro» (regla de presentación heredada)", () => {
    expect(match({ zone: null }, { zone: "Centro" })).toBe(true);
    expect(match({ zone: "" }, { zone: "centro" })).toBe(true);
    expect(match({ zone: "   " }, { zone: "CENTRO" })).toBe(true);
    expect(match({ zone: "Norte" }, { zone: "Centro" })).toBe(false);
  });

  it("los rangos incluyen los extremos", () => {
    expect(match({ price: 100 }, { minPrice: "100", maxPrice: "100" })).toBe(true);
    expect(match({ price: 100 }, { minPrice: "101" })).toBe(false);
  });

  it("un valor sin ubicación nunca coincide con un filtro de ubicación", () => {
    expect(match({ city: null }, { city: "Mérida" })).toBe(false);
    expect(match({ city: "" }, { city: "Mérida" })).toBe(false);
    expect(match({ city: null, state: null }, {})).toBe(true);
  });

  it("el texto libre busca en título, descripción, ciudad, tipo, zona, estado y operación", () => {
    expect(match({ city: "Mérida" }, { q: "merida" })).toBe(true);
    expect(match({ title: "Residencia" }, { q: "casa" })).toBe(true); // por el tipo «Casa»
    expect(match({ operation: "rent" }, { q: "rentar" })).toBe(true);
    expect(match({ operation: "sale" }, { q: "rentar" })).toBe(false);
    expect(match({ zone: null }, { q: "centro" })).toBe(true);
    expect(match({ description: "Con alberca" }, { q: "alberca" })).toBe(true);
    expect(match({}, { q: "inexistente" })).toBe(false);
  });
});

describe("referencia sobre los datos de prueba", () => {
  it("solo hay publicadas en la cuenta de búsqueda (borrador y pausada quedan fuera de las pruebas SQL; aquí se filtran antes)", () => {
    const published = FIXTURES.filter((f) => f.status === "published");
    expect(published.length).toBe(FIXTURES.length - 2);
  });

  const pub = FIXTURES.filter((f) => f.status === "published");
  const ref = (q: Record<string, unknown>) => referenceSearch(pub, parse({ pageSize: "50", ...q })).ids.map((id) => Number(id.slice(-12)));

  it("Tizimin y Tizimín devuelven las mismas 4 propiedades", () => {
    const expected = [7, 8, 9, 10];
    for (const city of ["Tizimin", "Tizimín", "TIZIMÍN", " tizimin "]) expect(ref({ city }).sort((a, b) => a - b)).toEqual(expected);
    expect(ref({ city: ["Tizimin", "Tizimín"] })).toHaveLength(4);
  });

  it("Peña y Pena son lugares distintos", () => {
    expect(ref({ city: "Peña" })).toEqual([11]);
    expect(ref({ city: "Pena" })).toEqual([12]);
  });

  it("San Pedro (con espacio normal o NBSP) y San-Pedro son lugares distintos", () => {
    expect(ref({ city: "San Pedro" }).sort((a, b) => a - b)).toEqual([13, 15]);
    expect(ref({ city: "San-Pedro" })).toEqual([14]);
  });

  it("la búsqueda libre sigue tratando ñ como n: «pena» encuentra Peña y Pena", () => {
    expect(ref({ q: "pena" }).sort((a, b) => a - b)).toEqual([11, 12]);
  });

  it("un orden estable: con precio y fecha de publicación iguales, desempata la fecha de alta (más nueva primero)", () => {
    const order = ref({ city: ["San Pedro", "San-Pedro"], sort: "price_asc" });
    expect(order).toEqual([15, 14, 13]);
  });

  it("si todo empata, el último criterio es el id (orden total, sin ambigüedad)", () => {
    const twin = (n: number): SearchableProperty => ({ ...(pub[0] as SearchableProperty), id: fixtureId(n), price: 5, createdAt: "2026-01-01T00:00:00.000", publishedAt: null });
    const items = [twin(3), twin(1), twin(2)];
    for (const sort of ["recent", "price_asc", "price_desc"] as const) expect(sortProperties(items, sort).map((p) => p.id)).toEqual([fixtureId(1), fixtureId(2), fixtureId(3)]);
  });

  it("las páginas no repiten ni omiten filas", () => {
    for (const sort of ["recent", "price_asc", "price_desc"]) {
      const total = referenceSearch(pub, parse({ sort })).total;
      const seen: string[] = [];
      for (let page = 1; page <= searchTotalPages(total, 4); page++) seen.push(...referenceSearch(pub, parse({ sort, page: String(page), pageSize: "4" })).ids);
      expect(seen).toHaveLength(total);
      expect(new Set(seen).size).toBe(total);
    }
  });

  it("una página fuera de rango queda vacía con el total correcto", () => {
    const r = referenceSearch(pub, parse({ page: "99", pageSize: "10" }));
    expect(r.ids).toEqual([]);
    expect(r.total).toBe(pub.length);
    expect(r.totalPages).toBe(Math.ceil(pub.length / 10));
  });

  it("sin resultados: total 0 y una sola página", () => {
    const r = referenceSearch(pub, parse({ city: "Cancún" }));
    expect(r).toEqual({ ids: [], total: 0, totalPages: 1 });
  });

  it("ordena por precio y por fecha (publishedAt, o createdAt si no hay)", () => {
    const prices = sortProperties(pub, "price_asc").map((p) => p.price);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
    const recent = sortProperties(pub, "recent");
    expect(recent[0]?.id).toBe(fixtureId(24)); // la publicada más tarde (24 de octubre)
    expect(recent.at(-1)?.id).toBe(fixtureId(25)); // sin publishedAt: usa createdAt (septiembre), la más antigua
  });
});
