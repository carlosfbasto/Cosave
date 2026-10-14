import { slugify } from "@/lib/mock-data";
import { emptyFilters, type Filters } from "./filters-sidebar";
import type { Range } from "./range-filter";

export type Sort = "recent" | "asc" | "desc";

export interface SearchState {
  filters: Filters;
  sort: Sort;
  q: string;
}

/** Valores posibles de cada filtro de lista; salen del catálogo cargado. */
export interface Facets {
  cities: string[];
  types: string[];
  states: string[];
  zones: string[];
}

/** Filtros de lista (varios valores) → nombre del parámetro. */
const lists = [
  ["cities", "ciudad"],
  ["types", "tipo"],
  ["states", "estado"],
  ["zones", "zona"],
] as const;

/** Rangos → prefijo del parámetro (`precio_min`, `precio_max`…). */
const ranges = [
  ["price", "precio"],
  ["beds", "recamaras"],
  ["baths", "banos"],
  ["build", "construccion"],
  ["land", "terreno"],
] as const;

const num = (v: string | null) => {
  if (v === null || v.trim() === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};

/** Lee filtros, orden y búsqueda de la URL. Valores desconocidos se ignoran. */
export function parseSearch(sp: URLSearchParams, facets: Facets): SearchState {
  const filters: Filters = { ...emptyFilters };
  for (const [key, param] of lists) {
    const wanted = sp.getAll(param);
    filters[key] = facets[key].filter((o) => wanted.includes(slugify(o)));
  }
  for (const [key, param] of ranges) {
    const r: Range = { min: num(sp.get(`${param}_min`)), max: num(sp.get(`${param}_max`)) };
    filters[key] = r;
  }
  filters.currency = sp.get("moneda") === "USD" ? "USD" : "MXN";
  const orden = sp.get("orden");
  return { filters, sort: orden === "asc" || orden === "desc" ? orden : "recent", q: (sp.get("q") ?? "").trim().slice(0, 100) };
}

/** Estado → query string ("" si no hay nada que guardar, o "?a=b&…"). */
export function toQuery({ filters, sort, q }: SearchState): string {
  const sp = new URLSearchParams();
  if (q) sp.set("q", q);
  for (const [key, param] of lists) for (const v of filters[key]) sp.append(param, slugify(v));
  for (const [key, param] of ranges) {
    const r = filters[key];
    if (r.min !== undefined) sp.set(`${param}_min`, String(r.min));
    if (r.max !== undefined) sp.set(`${param}_max`, String(r.max));
  }
  if (filters.currency === "USD") sp.set("moneda", "USD");
  if (sort !== "recent") sp.set("orden", sort);
  const s = sp.toString();
  return s ? `?${s}` : "";
}
