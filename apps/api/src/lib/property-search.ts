import { Prisma } from "@prisma/client";
import {
  DEFAULT_ZONE,
  LOCATION_FOLD,
  MAP_LIMIT,
  OPERATION_WORDS,
  PROPERTY_TYPE_LABEL,
  SEARCH_FOLD,
  WHITE_SPACE_SQL_PATTERN,
  assembleFacets,
  buildMapMeta,
  resolveSearchFilters,
  searchTotalPages,
  type FacetRow,
  type MapMeta,
  type MapQuery,
  type PropertySearchQuery,
  type Range,
  type SearchFilters,
  type SearchSort,
} from "@cosave/shared";

/**
 * Búsqueda del catálogo en SQL (`GET /properties/search`).
 *
 * - Un solo constructor de condiciones (`buildSearchConditions`): lista, conteo (y, en M2b, facets y mapa)
 *   comparten exactamente la misma lógica, así no pueden divergir.
 * - Ningún valor del usuario se concatena en el texto SQL: todo viaja como parámetro (`Prisma.sql`).
 * - Sin extensiones ni columnas nuevas: acentos y mayúsculas se pliegan con `translate`, con tablas que
 *   vienen de `@cosave/shared` (las mismas que usa la función de TypeScript `locationKey`).
 * - La implementación de referencia en TypeScript (`referenceSearch`, en shared) debe dar el mismo resultado.
 */

/** Ejecuta SQL crudo: `prisma.$queryRaw` en producción, PGlite en las pruebas. */
export type RawRunner = <T>(query: Prisma.Sql) => Promise<T[]>;

const FROM = Prisma.sql`FROM "Property" p
  LEFT JOIN "PropertyLocation" l ON l."propertyId" = p."id"
  LEFT JOIN "PropertyFeatures" f ON f."propertyId" = p."id"`;

const L_STATE = Prisma.raw('l."state"');
const L_CITY = Prisma.raw('l."city"');
const L_ZONE = Prisma.raw('l."zone"');

/**
 * Clave de identidad de una ubicación en SQL. Debe dar lo mismo que `locationKey` de shared:
 * NFC → tabla de plegado → tramos de espacios (lista explícita) a uno solo → recortar.
 * No usa `lower()` ni `\s`: dependen de la configuración regional del servidor.
 */
export const locationKeySql = (expr: Prisma.Sql) =>
  Prisma.sql`btrim(regexp_replace(translate(normalize((${expr})::text, NFC), ${LOCATION_FOLD.from}, ${LOCATION_FOLD.to}), ${WHITE_SPACE_SQL_PATTERN}, ' ', 'g'), ' ')`;

/** Zona tal como se muestra y se filtra: nula o sin valor utilizable → «Centro» (regla de presentación heredada). */
const zoneKeySql = () => Prisma.sql`COALESCE(NULLIF(${locationKeySql(L_ZONE)}, ''), ${locationKeySql(Prisma.sql`${DEFAULT_ZONE}`)})`;
const zoneTextSql = () => Prisma.sql`CASE WHEN COALESCE(${locationKeySql(L_ZONE)}, '') = '' THEN ${DEFAULT_ZONE} ELSE l."zone" END`;

/** Texto donde se buscan las palabras: igual al de la web (título, descripción, ciudad, tipo, zona, estado y operación). */
function haystackSql(): Prisma.Sql {
  const typeCase = Prisma.sql`CASE p."type"::text ${Prisma.join(
    Object.entries(PROPERTY_TYPE_LABEL).map(([key, label]) => Prisma.sql`WHEN ${key} THEN ${label}`),
    " ",
  )} ELSE '' END`;
  const operationCase = Prisma.sql`CASE p."operation"::text WHEN ${"rent"} THEN ${OPERATION_WORDS.rent} ELSE ${OPERATION_WORDS.sale} END`;
  return Prisma.sql`translate(
    COALESCE(p."title", '') || ' ' || COALESCE(p."description", '') || ' ' || COALESCE(l."city", '') || ' ' || ${typeCase} || ' ' ||
    ${zoneTextSql()} || ' ' || COALESCE(l."state", '') || ' ' || ${operationCase},
    ${SEARCH_FOLD.from}, ${SEARCH_FOLD.to})`;
}

const rangeConditions = (expr: Prisma.Sql, r: Range): Prisma.Sql[] => [
  ...(r.min !== undefined ? [Prisma.sql`${expr} >= ${r.min}::numeric`] : []),
  ...(r.max !== undefined ? [Prisma.sql`${expr} <= ${r.max}::numeric`] : []),
];

/** Filtro por ubicación: compara la CLAVE de la columna con la clave de cada valor pedido, ambas en SQL. */
const locationCondition = (keyExpr: Prisma.Sql, values: string[] | undefined): Prisma.Sql[] =>
  values?.length ? [Prisma.sql`NULLIF(${keyExpr}, '') IN (${Prisma.join(values.map((v) => locationKeySql(Prisma.sql`${v}`)))})`] : [];

/** Condiciones de lo que no es un filtro de lista: operación, precio, rangos y texto libre. */
const commonConditions = (filters: SearchFilters): Prisma.Sql[] => {
  const r = resolveSearchFilters(filters);
  return [
    ...(r.operation ? [Prisma.sql`p."operation"::text = ${r.operation}`] : []),
    ...rangeConditions(Prisma.sql`p."price"`, r.price),
    ...rangeConditions(Prisma.sql`COALESCE(f."bedrooms", 0)`, r.bedrooms),
    ...rangeConditions(Prisma.sql`COALESCE(f."bathrooms", 0)`, r.bathrooms),
    ...rangeConditions(Prisma.sql`COALESCE(f."builtAreaM2", f."landAreaM2", 0)`, r.built),
    ...rangeConditions(Prisma.sql`COALESCE(f."landAreaM2", 0)`, r.land),
    ...r.words.map((w) => Prisma.sql`strpos(${haystackSql()}, ${w}) > 0`),
  ];
};

const typeConditions = (filters: SearchFilters): Prisma.Sql[] => {
  const types = resolveSearchFilters(filters).types;
  return types.length ? [Prisma.sql`p."type"::text IN (${Prisma.join(types)})`] : [];
};
const stateConditions = (filters: SearchFilters) => locationCondition(locationKeySql(L_STATE), filters.state);
const cityConditions = (filters: SearchFilters) => locationCondition(locationKeySql(L_CITY), filters.city);
const zoneConditions = (filters: SearchFilters): Prisma.Sql[] =>
  filters.zone?.length ? [Prisma.sql`${zoneKeySql()} IN (${Prisma.join(filters.zone.map((v) => locationKeySql(Prisma.sql`${v}`)))})`] : [];

/** Condiciones (unidas con AND) de todos los filtros. Siempre incluye `status = 'published'`. */
export function buildSearchConditions(filters: SearchFilters): Prisma.Sql[] {
  return [
    Prisma.sql`p."status"::text = 'published'`,
    ...commonConditions(filters),
    ...typeConditions(filters),
    ...stateConditions(filters),
    ...cityConditions(filters),
    ...zoneConditions(filters),
  ];
}

const where = (filters: SearchFilters) => Prisma.sql`WHERE ${Prisma.join(buildSearchConditions(filters), " AND ")}`;

/** Más recientes primero; empates por fecha de alta y por id, para que las páginas sean estables. */
const RECENT = Prisma.sql`COALESCE(p."publishedAt", p."createdAt") DESC, p."createdAt" DESC, p."id" ASC`;

const orderBy = (sort: SearchSort): Prisma.Sql =>
  sort === "price_asc" ? Prisma.sql`p."price" ASC, ${RECENT}` : sort === "price_desc" ? Prisma.sql`p."price" DESC, ${RECENT}` : RECENT;

export const buildCountSql = (filters: SearchFilters) => Prisma.sql`SELECT count(*)::int AS "total" ${FROM} ${where(filters)}`;

export const buildPageSql = (query: PropertySearchQuery) =>
  Prisma.sql`SELECT p."id"::text AS "id" ${FROM} ${where(query)} ORDER BY ${orderBy(query.sort)}
    LIMIT ${query.pageSize} OFFSET ${(query.page - 1) * query.pageSize}`;

/** Ids de la página pedida (en orden), total de resultados y páginas totales. */
export async function runPropertySearch(run: RawRunner, query: PropertySearchQuery) {
  const [rows, counts] = await Promise.all([run<{ id: string }>(buildPageSql(query)), run<{ total: number | bigint }>(buildCountSql(query))]);
  const total = Number(counts[0]?.total ?? 0);
  return { ids: rows.map((r) => r.id), total, totalPages: searchTotalPages(total, query.pageSize) };
}

// ---------------------------------------------------------------------------------------------
// Facets (GET /properties/search/facets)
// ---------------------------------------------------------------------------------------------

/** Bandera booleana por fila: todas las condiciones de un grupo (sin condiciones = verdadero). */
const flag = (conditions: Prisma.Sql[]) => (conditions.length ? Prisma.sql`COALESCE((${Prisma.join(conditions, " AND ")}), FALSE)` : Prisma.sql`TRUE`);

/**
 * Filas agregadas para los facets. Una pasada por las publicadas calcula la clave y el valor de cada grupo y una bandera por grupo
 * (¿cumple el filtro de ese grupo?). El conteo de un grupo usa las banderas de los OTROS tres y la común: ignora su propio filtro.
 * `universe` cuenta lo publicado sin filtros (para elegir etiqueta); `n`, lo que cumple los demás filtros.
 * La fila `total` lleva en `n` el total con todos los filtros.
 */
export function buildFacetsSql(filters: SearchFilters): Prisma.Sql {
  const n = (...others: string[]) =>
    Prisma.raw(`(count(*) FILTER (WHERE ${["\"okCommon\"", ...others.map((o) => `"${o}"`)].join(" AND ")}))::int`);
  const group = (name: string, key: string, value: string, others: string[]) =>
    Prisma.sql`SELECT ${name}::text AS "g", ${Prisma.raw(`"${key}"`)}::text AS "k", ${Prisma.raw(`"${value}"`)}::text AS "v", count(*)::int AS "universe", ${n(...others)} AS "n"
      FROM base GROUP BY ${Prisma.raw(`"${key}", "${value}"`)}`;
  return Prisma.sql`WITH base AS (
    SELECT
      ${locationKeySql(L_STATE)} AS "kState", l."state" AS "vState",
      ${locationKeySql(L_CITY)} AS "kCity", l."city" AS "vCity",
      ${zoneKeySql()} AS "kZone", ${zoneTextSql()} AS "vZone",
      p."type"::text AS "kType",
      ${flag(commonConditions(filters))} AS "okCommon",
      ${flag(stateConditions(filters))} AS "okState",
      ${flag(cityConditions(filters))} AS "okCity",
      ${flag(zoneConditions(filters))} AS "okZone",
      ${flag(typeConditions(filters))} AS "okType"
    ${FROM}
    WHERE p."status"::text = 'published'
  )
  ${group("state", "kState", "vState", ["okCity", "okZone", "okType"])}
  UNION ALL ${group("city", "kCity", "vCity", ["okState", "okZone", "okType"])}
  UNION ALL ${group("zone", "kZone", "vZone", ["okState", "okCity", "okType"])}
  UNION ALL ${group("type", "kType", "kType", ["okState", "okCity", "okZone"])}
  UNION ALL SELECT 'total'::text, NULL::text, NULL::text, 0, ${n("okState", "okCity", "okZone", "okType")} FROM base`;
}

/** Opciones de filtro con sus conteos (ver `assembleFacets`). */
export async function runFacets(run: RawRunner, filters: SearchFilters) {
  const rows = await run<FacetRow>(buildFacetsSql(filters));
  return assembleFacets(rows.map((r) => ({ ...r, universe: Number(r.universe), n: Number(r.n) })));
}

// ---------------------------------------------------------------------------------------------
// Mapa (GET /properties/search/map)
// ---------------------------------------------------------------------------------------------

/** Coordenadas utilizables: dentro de rango. NaN e infinitos no cumplen BETWEEN; nulo tampoco. */
const COORDINATES_OK = Prisma.sql`l."latitude" BETWEEN -90 AND 90 AND l."longitude" BETWEEN -180 AND 180`;

const bboxCondition = (bbox: MapQuery["bbox"]): Prisma.Sql =>
  bbox
    ? Prisma.sql`l."latitude" BETWEEN ${bbox.south}::float8 AND ${bbox.north}::float8 AND l."longitude" BETWEEN ${bbox.west}::float8 AND ${bbox.east}::float8`
    : Prisma.sql`TRUE`;

export interface MapRow {
  id: string;
  code: string;
  title: string;
  type: string;
  operation: string;
  price: number;
  city: string | null;
  state: string | null;
  zone: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  builtAreaM2: number | null;
  latitude: number;
  longitude: number;
  /** Ruta en el bucket (o del web); el api la convierte en URL. */
  imagePath: string | null;
}

/** Contadores del mapa: `bbox` solo afecta a `inViewport`. */
export const buildMapCountsSql = (query: MapQuery) =>
  Prisma.sql`SELECT count(*)::int AS "total",
      (count(*) FILTER (WHERE ${COORDINATES_OK}))::int AS "withCoordinates",
      (count(*) FILTER (WHERE ${COORDINATES_OK} AND ${bboxCondition(query.bbox)}))::int AS "inViewport"
    ${FROM} ${where(query)}`;

/** Puntos dentro del recuadro, más recientes primero (orden determinista), hasta `limit`. */
export const buildMapPointsSql = (query: MapQuery, limit: number) =>
  Prisma.sql`SELECT p."id"::text AS "id", p."publicCode" AS "code", p."title" AS "title", p."type"::text AS "type", p."operation"::text AS "operation",
      p."price"::float8 AS "price", l."city" AS "city", l."state" AS "state", l."zone" AS "zone",
      f."bedrooms" AS "bedrooms", f."bathrooms" AS "bathrooms", f."builtAreaM2" AS "builtAreaM2",
      l."latitude" AS "latitude", l."longitude" AS "longitude",
      (SELECT i."storagePath" FROM "PropertyImage" i WHERE i."propertyId" = p."id" ORDER BY i."position" ASC, i."createdAt" ASC LIMIT 1) AS "imagePath"
    ${FROM} ${where(query)} AND ${COORDINATES_OK} AND ${bboxCondition(query.bbox)}
    ORDER BY ${RECENT} LIMIT ${limit}`;

/** Puntos del mapa y contadores. El límite es un parámetro para poder probar el truncamiento. */
export async function runMapSearch(run: RawRunner, query: MapQuery, limit: number = MAP_LIMIT): Promise<{ rows: MapRow[]; meta: MapMeta }> {
  const [rows, counts] = await Promise.all([
    run<MapRow>(buildMapPointsSql(query, limit)),
    run<{ total: number; withCoordinates: number; inViewport: number }>(buildMapCountsSql(query)),
  ]);
  const c = counts[0];
  return {
    rows,
    meta: buildMapMeta(
      { total: Number(c?.total ?? 0), withCoordinates: Number(c?.withCoordinates ?? 0), inViewport: Number(c?.inViewport ?? 0), returned: rows.length },
      limit,
    ),
  };
}
