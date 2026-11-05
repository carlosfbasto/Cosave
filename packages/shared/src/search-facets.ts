import { PROPERTY_TYPE_LABEL } from "./property-enums.js";
import {
  effectiveZone,
  matchesCommon,
  matchesGroup,
  resolveSearchFilters,
  type FilterGroup,
  type ResolvedSearchFilters,
  type SearchFilters,
  type SearchableProperty,
} from "./property-search.js";
import { LOCATION_MAX_LENGTH, locationKey, slugify, tidyText } from "./text-search.js";

/**
 * Opciones de filtro (facets) de `GET /properties/search/facets`.
 *
 * - Cada opción es UNA ubicación (`key`): sus variantes de acentos, mayúsculas y espacios se agrupan en una sola
 *   opción con conteo combinado. Lugares realmente distintos (`Peña`/`Pena`, `San Pedro`/`San-Pedro`) siguen separados.
 * - El conteo de un grupo ignora el filtro de ese mismo grupo y conserva los demás (cada opción cuenta lo que daría al marcarla).
 * - Las opciones salen de TODO lo publicado: una opción sin coincidencias aparece con conteo 0.
 * - `slug` es único dentro del grupo (ver `assignSlugs`); `legacySlug` es el `slugify` de siempre, para enlaces existentes.
 */

export const LOCATION_FACET_GROUPS = ["state", "city", "zone"] as const;
export type LocationFacetGroup = (typeof LOCATION_FACET_GROUPS)[number];

export interface Facet {
  /** Lo que se envía al API como filtro. En ubicaciones es igual a `label`; en tipo, el valor del enum. */
  value: string;
  label: string;
  /** Identidad: `locationKey` (ubicaciones) o el valor del enum (tipo). */
  key: string;
  /** Único en el grupo; es el que se escribe en la URL. */
  slug: string;
  /** `slugify(label)`: el slug de antes, que puede coincidir entre lugares distintos. */
  legacySlug: string;
  /** Propiedades que daría marcar esta opción (con los demás filtros aplicados). */
  count: number;
  /** Escrituras distintas que se agruparon en esta opción (valores tal como están guardados). */
  variants: string[];
}

export interface AmbiguousSlug {
  group: LocationFacetGroup;
  /** El `legacySlug` compartido. */
  slug: string;
  options: { label: string; slug: string }[];
}

export interface FacetsResult {
  data: { state: Facet[]; city: Facet[]; zone: Facet[]; type: Facet[] };
  meta: {
    /** Resultados con TODOS los filtros. */
    total: number;
    /**
     * Propiedades sin valor utilizable en el grupo (vacío o de más de `LOCATION_MAX_LENGTH`): no son opción.
     * Por grupo: suma de conteos de sus opciones + `unlisted` = propiedades que cumplen los filtros salvo el del propio grupo
     * (y si ese grupo no tiene filtro, = `total`).
     */
    unlisted: { state: number; city: number; zone: number };
    ambiguousSlugs: AmbiguousSlug[];
  };
}

/** Una fila agregada que entrega el SQL (o `referenceFacetRows`). La fila `total` lleva el total en `n`. */
export interface FacetRow {
  g: LocationFacetGroup | "type" | "total";
  k: string | null;
  v: string | null;
  /** Propiedades publicadas con ese valor, sin filtros (sirve para elegir la etiqueta). */
  universe: number;
  /** Propiedades con ese valor que cumplen los demás filtros. */
  n: number;
}

// --- slugs únicos ---------------------------------------------------------------------------

/** Bytes UTF-8 de un texto (este paquete no tiene `TextEncoder`: no usa tipos de Node ni del navegador). Inyectivo. */
export function utf8Bytes(text: string): number[] {
  const out: number[] = [];
  for (const ch of text) {
    const cp = ch.codePointAt(0) as number;
    if (cp < 0x80) out.push(cp);
    else if (cp < 0x800) out.push(0xc0 | (cp >> 6), 0x80 | (cp & 63));
    else if (cp < 0x10000) out.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63));
    else out.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 63), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63));
  }
  return out;
}

/** FNV-1a de 32 bits sobre los bytes UTF-8. */
export function fnv1a32(text: string): number {
  let h = 0x811c9dc5;
  for (const byte of utf8Bytes(text)) h = Math.imul(h ^ byte, 0x01000193) >>> 0;
  return h;
}

const hex = (text: string) => utf8Bytes(text).map((b) => b.toString(16).padStart(2, "0")).join("");

/**
 * Slug único por clave dentro de un grupo. Tres formas, que se distinguen por su primer separador
 * (`legacySlug` solo contiene `[a-z0-9-]`, así que ninguna puede igualar a otra):
 * - base `tizimin`: la clave es la única del grupo con ese `legacySlug` (y no está vacío).
 * - con hash `san-pedro_k3f9a2b`: hay varias claves con el mismo `legacySlug` (o está vacío). 7 caracteres de FNV-1a, base 36.
 * - exacta `san-pedro.73616e…`: respaldo si dos claves chocan incluso en el hash completo; es la codificación hexadecimal
 *   (UTF-8) de la clave, así que es única por construcción y no depende de ningún hash.
 * El resultado depende solo del conjunto de claves: no del orden de las filas ni de las frecuencias.
 */
export function assignSlugs(
  entries: readonly { key: string; legacySlug: string }[],
  hash: (text: string) => number = fnv1a32,
): Map<string, string> {
  const legacyOf = new Map(entries.map((e) => [e.key, e.legacySlug]));
  const keysByLegacy = new Map<string, string[]>();
  for (const [key, legacy] of legacyOf) keysByLegacy.set(legacy, [...(keysByLegacy.get(legacy) ?? []), key]);

  const slugs = new Map<string, string>();
  const hashed = new Map<string, string[]>(); // candidato con hash → claves
  for (const [key, legacy] of legacyOf) {
    if (legacy !== "" && keysByLegacy.get(legacy)?.length === 1) {
      slugs.set(key, legacy);
      continue;
    }
    const candidate = `${legacy}_${(hash(key) >>> 0).toString(36).padStart(7, "0")}`;
    hashed.set(candidate, [...(hashed.get(candidate) ?? []), key]);
  }
  for (const [candidate, keys] of hashed) {
    for (const key of keys) slugs.set(key, keys.length === 1 ? candidate : `${legacyOf.get(key)}.${hex(key)}`);
  }
  return slugs;
}

// --- ensamblado -----------------------------------------------------------------------------

const nonAscii = (s: string) => Array.from(s).filter((c) => (c.codePointAt(0) ?? 0) > 127).length;
const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const byLabel = (a: Facet, b: Facet) => a.label.localeCompare(b.label, "es") || compare(a.key, b.key);

/** Etiqueta de una ubicación: la variante con más caracteres no ASCII (acentos); luego la más frecuente en lo publicado; luego la menor. */
function pickVariant(variants: readonly FacetRow[]): string {
  const best = [...variants].sort(
    (a, b) => nonAscii(b.v ?? "") - nonAscii(a.v ?? "") || b.universe - a.universe || compare(a.v ?? "", b.v ?? ""),
  )[0];
  return best?.v ?? "";
}

function locationFacets(rows: readonly FacetRow[], group: LocationFacetGroup) {
  const byKey = new Map<string, FacetRow[]>();
  let unlisted = 0;
  for (const row of rows.filter((r) => r.g === group)) {
    const key = row.k ?? "";
    if (key === "" || key.length > LOCATION_MAX_LENGTH) unlisted += row.n; // sin valor utilizable: no es opción
    else byKey.set(key, [...(byKey.get(key) ?? []), row]);
  }
  const labelled = [...byKey].map(([key, variants]) => ({ key, variants, label: tidyText(pickVariant(variants)) }));
  const slugs = assignSlugs(labelled.map((o) => ({ key: o.key, legacySlug: slugify(o.label) })));

  const options: Facet[] = labelled
    .map((o) => ({
      value: o.label,
      label: o.label,
      key: o.key,
      slug: slugs.get(o.key) as string,
      legacySlug: slugify(o.label),
      count: o.variants.reduce((sum, v) => sum + v.n, 0),
      variants: o.variants.map((v) => v.v ?? "").sort(compare),
    }))
    .sort(byLabel);

  const byLegacy = new Map<string, Facet[]>();
  for (const o of options) if (o.legacySlug !== "") byLegacy.set(o.legacySlug, [...(byLegacy.get(o.legacySlug) ?? []), o]);
  const ambiguous: AmbiguousSlug[] = [...byLegacy]
    .filter(([, list]) => list.length > 1)
    .map(([slug, list]) => ({ group, slug, options: list.map((o) => ({ label: o.label, slug: o.slug })) }));

  return { options, unlisted, ambiguous };
}

function typeFacets(rows: readonly FacetRow[]): Facet[] {
  return rows
    .filter((r) => r.g === "type" && r.k)
    .map((r) => {
      const value = r.k as string;
      const label = (PROPERTY_TYPE_LABEL as Record<string, string | undefined>)[value] ?? value;
      const legacySlug = slugify(label);
      return { value, label, key: value, slug: legacySlug, legacySlug, count: r.n, variants: [value] };
    })
    .sort(byLabel);
}

/** Convierte las filas agregadas en la respuesta de facets. Es pura: la comparten el SQL y la implementación de referencia. */
export function assembleFacets(rows: readonly FacetRow[]): FacetsResult {
  const state = locationFacets(rows, "state");
  const city = locationFacets(rows, "city");
  const zone = locationFacets(rows, "zone");
  return {
    data: { state: state.options, city: city.options, zone: zone.options, type: typeFacets(rows) },
    meta: {
      total: rows.find((r) => r.g === "total")?.n ?? 0,
      unlisted: { state: state.unlisted, city: city.unlisted, zone: zone.unlisted },
      ambiguousSlugs: [...state.ambiguous, ...city.ambiguous, ...zone.ambiguous],
    },
  };
}

// --- implementación de referencia -----------------------------------------------------------

const OTHERS: Record<FilterGroup, FilterGroup[]> = {
  state: ["city", "zone", "type"],
  city: ["state", "zone", "type"],
  zone: ["state", "city", "type"],
  type: ["state", "city", "zone"],
};
const GROUPS: FilterGroup[] = ["state", "city", "zone", "type"];

/** Las mismas filas que calcula el SQL, pero en TypeScript sobre propiedades publicadas. */
export function referenceFacetRows(items: readonly SearchableProperty[], r: ResolvedSearchFilters): FacetRow[] {
  const acc = new Map<string, FacetRow>();
  const bump = (g: FacetRow["g"], k: string | null, v: string | null, counts: boolean) => {
    const id = JSON.stringify([g, k, v]);
    const row = acc.get(id) ?? { g, k, v, universe: 0, n: 0 };
    row.universe += 1;
    if (counts) row.n += 1;
    acc.set(id, row);
  };
  let total = 0;
  for (const p of items) {
    const common = matchesCommon(p, r);
    const ok = (g: FilterGroup) => matchesGroup(p, r, g);
    const zone = effectiveZone(p.zone);
    if (common && GROUPS.every(ok)) total += 1;
    // Un estado o ciudad ausente (sin fila de ubicación) cae en la fila de clave nula, igual que en el SQL.
    const key = (s: string | null) => (s === null ? null : locationKey(s));
    bump("state", key(p.state), p.state, common && OTHERS.state.every(ok));
    bump("city", key(p.city), p.city, common && OTHERS.city.every(ok));
    bump("zone", locationKey(zone), zone, common && OTHERS.zone.every(ok));
    bump("type", p.type, p.type, common && OTHERS.type.every(ok));
  }
  return [...acc.values(), { g: "total", k: null, v: null, universe: 0, n: total }];
}

export function referenceFacets(items: readonly SearchableProperty[], filters: SearchFilters): FacetsResult {
  return assembleFacets(referenceFacetRows(items, resolveSearchFilters(filters)));
}
