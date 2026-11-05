import { z } from "zod";
import { operationTypeSchema, propertyTypeSchema, PROPERTY_TYPE_LABEL, type OperationType, type PropertyType } from "./property-enums.js";
import { LOCATION_MAX_LENGTH, locationKey, norm, parseQuery } from "./text-search.js";

/**
 * Búsqueda del catálogo en el servidor (`GET /properties/search`).
 * Este módulo define el contrato de entrada (zod), los filtros ya interpretados y una implementación
 * de REFERENCIA en TypeScript: sirve de respaldo en desarrollo y de oráculo en las pruebas del SQL.
 */

export const SEARCH_SORTS = ["recent", "price_asc", "price_desc"] as const;
export type SearchSort = (typeof SEARCH_SORTS)[number];

export const SEARCH_LIMITS = {
  defaultPageSize: 12,
  maxPageSize: 50,
  maxPage: 100_000,
  maxTypes: 10,
  maxLocationValues: 20,
  maxText: 100,
  maxNumber: 1_000_000_000_000,
} as const;

/**
 * Regla de PRESENTACIÓN heredada del explorador: una propiedad sin zona se muestra (y se filtra) como «Centro».
 * No es un dato almacenado de la propiedad: en la BD la zona sigue nula.
 */
export const DEFAULT_ZONE = "Centro";

/** Máximo de puntos que devuelve `GET /properties/search/map`. */
export const MAP_LIMIT = 2000;

const toArray = (v: unknown) => (v === undefined ? undefined : Array.isArray(v) ? v : [v]);

/** PostgreSQL no admite el carácter NUL en un texto: se rechaza aquí (422) en vez de dejar que falle la consulta (500). */
const noNul = (v: string) => !v.includes("\u0000");
const NUL_MESSAGE = "El texto contiene un carácter no permitido";

/** Rechaza (422) cualquier parámetro que el endpoint no conoce, en vez de ignorarlo sin avisar. */
const knownKeysOnly = (known: readonly string[]) => (value: unknown, ctx: z.RefinementCtx) => {
  if (typeof value === "object" && value !== null)
    for (const key of Object.keys(value)) if (!known.includes(key)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: [key], message: "Parámetro desconocido" });
  return value;
};

/** Número ≥ 0; el texto vacío cuenta como «no enviado» (z.coerce lo convertiría en 0). */
const amount = z.preprocess(
  (v) => (v === "" ? undefined : v),
  z.coerce.number().finite().min(0).max(SEARCH_LIMITS.maxNumber).optional(),
);

/** Valor de ubicación: su clave no puede quedar vacía (un filtro vacío coincidiría con todo lo que no tiene valor). */
const locationValue = z
  .string()
  .trim()
  .max(LOCATION_MAX_LENGTH)
  .refine(noNul, { message: NUL_MESSAGE })
  .refine((v) => locationKey(v) !== "", { message: "Indica un valor de ubicación" });

const locationList = z.preprocess(toArray, z.array(locationValue).max(SEARCH_LIMITS.maxLocationValues).optional());

const filtersShape = {
  operation: operationTypeSchema.optional(),
  type: z.preprocess(toArray, z.array(propertyTypeSchema).max(SEARCH_LIMITS.maxTypes).optional()),
  state: locationList,
  city: locationList,
  zone: locationList,
  minPrice: amount,
  maxPrice: amount,
  minBedrooms: amount,
  maxBedrooms: amount,
  minBathrooms: amount,
  maxBathrooms: amount,
  minBuilt: amount,
  maxBuilt: amount,
  minLand: amount,
  maxLand: amount,
  q: z.string().trim().max(SEARCH_LIMITS.maxText).refine(noNul, { message: NUL_MESSAGE }).optional(),
};
const FILTER_KEYS = Object.keys(filtersShape);
const SEARCH_QUERY_KEYS = [...FILTER_KEYS, "page", "pageSize", "sort"];
const MAP_QUERY_KEYS = [...FILTER_KEYS, "bbox"];

type PriceBounds = { minPrice?: number | undefined; maxPrice?: number | undefined };
const priceOrder = (v: PriceBounds, ctx: z.RefinementCtx) => {
  if (v.minPrice !== undefined && v.maxPrice !== undefined && v.minPrice > v.maxPrice)
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "minPrice no puede ser mayor que maxPrice", path: ["minPrice"] });
};

/** Filtros comunes a `/search`, `/search/facets` y `/search/map`. No admite page, pageSize, sort ni bbox. */
export const searchFiltersSchema = z.preprocess(knownKeysOnly(FILTER_KEYS), z.object(filtersShape).superRefine(priceOrder));
export type SearchFilters = z.infer<typeof searchFiltersSchema>;

/** Entrada de `GET /properties/search`: los filtros más página, tamaño y orden. */
export const propertySearchQuerySchema = z.preprocess(
  knownKeysOnly(SEARCH_QUERY_KEYS),
  z
    .object({
      ...filtersShape,
      page: z.coerce.number().int().min(1).max(SEARCH_LIMITS.maxPage).default(1),
      pageSize: z.coerce.number().int().min(1).max(SEARCH_LIMITS.maxPageSize).default(SEARCH_LIMITS.defaultPageSize),
      sort: z.enum(SEARCH_SORTS).default("recent"),
    })
    .superRefine(priceOrder),
);
export type PropertySearchQuery = z.infer<typeof propertySearchQuerySchema>;

/** Recuadro visible del mapa, en grados. Incluye los bordes. */
export interface Bbox {
  south: number;
  west: number;
  north: number;
  east: number;
}

/** `bbox=sur,oeste,norte,este`. Sur < norte y oeste < este (el mapa no cruza el antimeridiano). */
const bboxSchema = z.string().transform((raw, ctx): Bbox => {
  const parts = raw.split(",").map((s) => s.trim());
  const nums = parts.map(Number);
  const fail = (message: string) => {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message });
    return z.NEVER;
  };
  if (parts.length !== 4 || parts.some((s) => s === "") || nums.some((n) => !Number.isFinite(n))) return fail("bbox debe ser sur,oeste,norte,este (4 números)");
  const [south, west, north, east] = nums as [number, number, number, number];
  if (south < -90 || north > 90 || west < -180 || east > 180) return fail("bbox fuera de rango (latitud ±90, longitud ±180)");
  if (south >= north) return fail("bbox: el sur debe ser menor que el norte");
  if (west >= east) return fail("bbox: el oeste debe ser menor que el este");
  return { south, west, north, east };
});

/** Entrada de `GET /properties/search/map`: los filtros más `bbox`. Sin page, pageSize ni sort. */
export const mapQuerySchema = z.preprocess(
  knownKeysOnly(MAP_QUERY_KEYS),
  z.object({ ...filtersShape, bbox: bboxSchema.optional() }).superRefine(priceOrder),
);
export type MapQuery = z.infer<typeof mapQuerySchema>;

export interface PropertySearchMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/** Páginas totales; mínimo 1 (la web trata «sin resultados» como la página 1 vacía). */
export const searchTotalPages = (total: number, pageSize: number) => Math.max(1, Math.ceil(total / pageSize));

export interface Range {
  min?: number | undefined;
  max?: number | undefined;
}

/** Filtros ya interpretados: ubicaciones como claves, texto libre como palabras y precios combinados. */
export interface ResolvedSearchFilters {
  operation?: OperationType | undefined;
  types: PropertyType[];
  /** Claves (`locationKey`) sin repetir. Vacío = sin filtro. */
  state: string[];
  city: string[];
  zone: string[];
  price: Range;
  bedrooms: Range;
  bathrooms: Range;
  built: Range;
  land: Range;
  words: string[];
}

const pickMax = (a?: number, b?: number) => (a === undefined ? b : b === undefined ? a : Math.max(a, b));
const pickMin = (a?: number, b?: number) => (a === undefined ? b : b === undefined ? a : Math.min(a, b));
const keysOf = (values?: string[]) => [...new Set((values ?? []).map(locationKey))].filter((k) => k !== "");

/**
 * Interpreta los filtros. El precio escrito en el texto libre ("hasta 2 millones") se combina con
 * `minPrice`/`maxPrice` por INTERSECCIÓN: el mayor de los mínimos y el menor de los máximos.
 */
export function resolveSearchFilters(f: SearchFilters): ResolvedSearchFilters {
  const parsed = parseQuery(f.q ?? "");
  return {
    operation: f.operation,
    types: [...new Set(f.type ?? [])],
    state: keysOf(f.state),
    city: keysOf(f.city),
    zone: keysOf(f.zone),
    price: { min: pickMax(f.minPrice, parsed.minPrice), max: pickMin(f.maxPrice, parsed.maxPrice) },
    bedrooms: { min: f.minBedrooms, max: f.maxBedrooms },
    bathrooms: { min: f.minBathrooms, max: f.maxBathrooms },
    built: { min: f.minBuilt, max: f.maxBuilt },
    land: { min: f.minLand, max: f.maxLand },
    words: parsed.words,
  };
}

/** Palabras de la operación que también cuentan para el texto libre. */
export const OPERATION_WORDS: Record<OperationType, string> = {
  rent: "renta rentar alquiler",
  sale: "venta vender comprar",
};

// ---------------------------------------------------------------------------------------------
// Implementación de referencia (TypeScript). El SQL de `apps/api` debe dar el mismo resultado.
// ---------------------------------------------------------------------------------------------

export interface SearchableProperty {
  id: string;
  title: string;
  description: string | null;
  type: PropertyType;
  operation: OperationType;
  price: number;
  state: string | null;
  city: string | null;
  zone: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  builtAreaM2: number | null;
  landAreaM2: number | null;
  /** Solo para el mapa. Ausente o nulo = sin coordenadas. */
  latitude?: number | null;
  longitude?: number | null;
  /** ISO 8601. Si es nula se usa `createdAt` para ordenar. */
  publishedAt: string | null;
  createdAt: string;
}

/** Zona tal como se muestra y se filtra: sin valor utilizable → «Centro» (regla de presentación heredada). */
export const effectiveZone = (zone: string | null | undefined) => (locationKey(zone ?? "") === "" ? DEFAULT_ZONE : (zone as string));

const inRange = (v: number, r: Range) => (r.min === undefined || v >= r.min) && (r.max === undefined || v <= r.max);
const keyIn = (keys: string[], value: string | null | undefined) => keys.length === 0 || keys.includes(locationKey(value ?? ""));

export type FilterGroup = "state" | "city" | "zone" | "type";

/** ¿Cumple el filtro de UN grupo? (Sin filtro en ese grupo, siempre.) Los facets cuentan sin el grupo propio. */
export function matchesGroup(p: SearchableProperty, r: ResolvedSearchFilters, group: FilterGroup): boolean {
  switch (group) {
    case "state":
      return keyIn(r.state, p.state);
    case "city":
      return keyIn(r.city, p.city);
    case "zone":
      return keyIn(r.zone, effectiveZone(p.zone));
    case "type":
      return r.types.length === 0 || r.types.includes(p.type);
  }
}

/** Todo lo que no es un filtro de lista: operación, precio, rangos y texto libre. */
export function matchesCommon(p: SearchableProperty, r: ResolvedSearchFilters): boolean {
  if (r.operation && p.operation !== r.operation) return false;
  if (!inRange(p.price, r.price)) return false;
  if (!inRange(p.bedrooms ?? 0, r.bedrooms) || !inRange(p.bathrooms ?? 0, r.bathrooms)) return false;
  if (!inRange(p.builtAreaM2 ?? p.landAreaM2 ?? 0, r.built) || !inRange(p.landAreaM2 ?? 0, r.land)) return false;
  if (r.words.length === 0) return true;
  const hay = norm(
    `${p.title} ${p.description ?? ""} ${p.city ?? ""} ${PROPERTY_TYPE_LABEL[p.type]} ${effectiveZone(p.zone)} ${p.state ?? ""} ${OPERATION_WORDS[p.operation]}`,
  );
  return r.words.every((w) => hay.includes(w));
}

export const matchesFilters = (p: SearchableProperty, r: ResolvedSearchFilters): boolean =>
  matchesCommon(p, r) && (["state", "city", "zone", "type"] as const).every((g) => matchesGroup(p, r, g));

const cmp = (a: string | number, b: string | number) => (a < b ? -1 : a > b ? 1 : 0);

/** Más recientes primero; empates por fecha de alta y por id, para que las páginas sean estables. */
const byRecent = (a: SearchableProperty, b: SearchableProperty) =>
  cmp(b.publishedAt ?? b.createdAt, a.publishedAt ?? a.createdAt) || cmp(b.createdAt, a.createdAt) || cmp(a.id, b.id);

export function sortProperties(items: SearchableProperty[], sort: SearchSort): SearchableProperty[] {
  const order =
    sort === "price_asc"
      ? (a: SearchableProperty, b: SearchableProperty) => cmp(a.price, b.price) || byRecent(a, b)
      : sort === "price_desc"
        ? (a: SearchableProperty, b: SearchableProperty) => cmp(b.price, a.price) || byRecent(a, b)
        : byRecent;
  return [...items].sort(order);
}

/** Resultado de referencia de una búsqueda: ids de la página pedida, en orden, y el total. */
export function referenceSearch(items: SearchableProperty[], query: PropertySearchQuery) {
  const resolved = resolveSearchFilters(query);
  const sorted = sortProperties(items.filter((p) => matchesFilters(p, resolved)), query.sort);
  const start = (query.page - 1) * query.pageSize;
  return {
    ids: sorted.slice(start, start + query.pageSize).map((p) => p.id),
    total: sorted.length,
    totalPages: searchTotalPages(sorted.length, query.pageSize),
  };
}

// ---------------------------------------------------------------------------------------------
// Mapa: contadores y referencia
// ---------------------------------------------------------------------------------------------

/**
 * Contadores de `GET /properties/search/map`. `bbox` solo restringe qué puntos se devuelven:
 * - `total`, `withCoordinates` y `withoutCoordinates` describen TODOS los resultados de los filtros (no cambian con `bbox`).
 * - `inViewport`: con coordenadas dentro del recuadro (sin `bbox`, igual a `withCoordinates`).
 * - `returned`: puntos que trae la respuesta = min(inViewport, limit).
 * Invariantes: withCoordinates + withoutCoordinates = total · returned ≤ inViewport ≤ withCoordinates · truncated ⇔ returned < inViewport.
 */
export interface MapMeta {
  total: number;
  withCoordinates: number;
  withoutCoordinates: number;
  inViewport: number;
  returned: number;
  limit: number;
  truncated: boolean;
}

/** Coordenadas utilizables: ambas presentes y dentro de rango (NaN, infinitos y valores absurdos cuentan como «sin coordenadas»). */
export const hasUsableCoordinates = (lat: number | null | undefined, lng: number | null | undefined): boolean =>
  typeof lat === "number" && typeof lng === "number" && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;

export const insideBbox = (lat: number, lng: number, b: Bbox) => lat >= b.south && lat <= b.north && lng >= b.west && lng <= b.east;

export function buildMapMeta(counts: { total: number; withCoordinates: number; inViewport: number; returned: number }, limit: number): MapMeta {
  return {
    ...counts,
    withoutCoordinates: counts.total - counts.withCoordinates,
    limit,
    truncated: counts.returned < counts.inViewport,
  };
}

/** Mapa de referencia: ids de los puntos (más recientes primero, máx. `limit`) y los contadores. */
export function referenceMap(items: SearchableProperty[], query: MapQuery, limit: number = MAP_LIMIT) {
  const resolved = resolveSearchFilters(query);
  const matching = sortProperties(items.filter((p) => matchesFilters(p, resolved)), "recent");
  const mappable = matching.filter((p) => hasUsableCoordinates(p.latitude, p.longitude));
  const visible = query.bbox ? mappable.filter((p) => insideBbox(p.latitude as number, p.longitude as number, query.bbox as Bbox)) : mappable;
  const returned = visible.slice(0, limit);
  return {
    ids: returned.map((p) => p.id),
    meta: buildMapMeta({ total: matching.length, withCoordinates: mappable.length, inViewport: visible.length, returned: returned.length }, limit),
  };
}
