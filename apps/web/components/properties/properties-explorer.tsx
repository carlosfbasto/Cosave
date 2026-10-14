"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { PropertyGrid } from "@/components/property-card";
import { rememberResults } from "@/lib/last-results";
import { formatMxn, USD_RATE, type ListedProperty } from "@/lib/mock-data";
import { useCatalog } from "@/lib/use-catalog";
import { matchesQuery, parseQuery } from "@/lib/search";
import { emptyFilters, FiltersSidebar } from "./filters-sidebar";
import type { Range } from "./range-filter";
import { parseSearch, toQuery, type SearchState, type Sort } from "./url-state";

export type Operation = "all" | "sale" | "rent";

const inRange = (v: number, r: Range) => (r.min === undefined || v >= r.min) && (r.max === undefined || v <= r.max);

const tabs = [
  { href: "/properties", label: "Todas", op: "all" },
  { href: "/properties/sale", label: "Propiedades en venta", op: "sale" },
  { href: "/properties/rentals", label: "Propiedades en renta", op: "rent" },
] as const;

const tabBase = "rounded-md px-4 py-2 text-[0.9rem] font-medium transition-colors";

export function PropertiesExplorer({ operation }: { operation: Operation }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  // Filtros, orden y búsqueda viven en la URL: sobreviven a "atrás", a recargar y se pueden compartir.
  const search = searchParams.toString();
  const { items: catalog, ready } = useCatalog();
  const facets = useMemo(() => {
    const uniq = (f: (p: ListedProperty) => string) => [...new Set(catalog.map(f))].filter(Boolean).sort((a, b) => a.localeCompare(b, "es"));
    return { states: uniq((p) => p.state), cities: uniq((p) => p.city), zones: uniq((p) => p.zone), types: uniq((p) => p.type) };
  }, [catalog]);
  const state = useMemo(() => parseSearch(new URLSearchParams(search), facets), [search, facets]);
  const { filters, sort, q } = state;
  const parsed = useMemo(() => parseQuery(q), [q]);

  const update = (patch: Partial<SearchState>) => router.replace(`${pathname}${toQuery({ ...state, ...patch })}`, { scroll: false });
  const query = toQuery(state);

  // Recuerda esta lista para el botón "Volver a resultados" de la ficha.
  useEffect(() => rememberResults(`${pathname}${query}`), [pathname, query]);

  // `skip` ignora un filtro de lista: así cada opción cuenta lo que daría al marcarla, con lo demás ya aplicado.
  const matches = useMemo(() => {
    const rate = filters.currency === "USD" ? USD_RATE : 1;
    const price: Range = {
      min: filters.price.min === undefined ? undefined : filters.price.min * rate,
      max: filters.price.max === undefined ? undefined : filters.price.max * rate,
    };
    return (p: ListedProperty, skip?: "states" | "cities" | "zones" | "types") =>
      (operation === "all" || p.operation === operation) &&
      matchesQuery(p, parsed) &&
      (skip === "states" || !filters.states.length || filters.states.includes(p.state)) &&
      (skip === "cities" || !filters.cities.length || filters.cities.includes(p.city)) &&
      (skip === "zones" || !filters.zones.length || filters.zones.includes(p.zone)) &&
      (skip === "types" || !filters.types.length || filters.types.includes(p.type)) &&
      inRange(p.price, price) &&
      inRange(p.bedrooms, filters.beds) &&
      inRange(p.bathrooms, filters.baths) &&
      inRange(p.area, filters.build) &&
      inRange(p.landArea, filters.land);
  }, [filters, operation, parsed]);

  const results = useMemo(
    () =>
      catalog
        .filter((p) => matches(p))
        .sort((a, b) =>
          sort === "asc" ? a.price - b.price : sort === "desc" ? b.price - a.price : b.publishedAt.localeCompare(a.publishedAt),
        ),
    [catalog, matches, sort],
  );

  const counts = useMemo(() => {
    const tally = (skip: "states" | "cities" | "zones" | "types", key: "state" | "city" | "zone" | "type") =>
      catalog.reduce<Record<string, number>>((acc, p) => (matches(p, skip) ? { ...acc, [p[key]]: (acc[p[key]] ?? 0) + 1 } : acc), {});
    return { states: tally("states", "state"), cities: tally("cities", "city"), zones: tally("zones", "zone"), types: tally("types", "type") };
  }, [catalog, matches]);

  const reset = () => update({ filters: emptyFilters });
  const hasFilters = toQuery({ ...state, q: "", sort: "recent" }) !== "";
  const priceNote = [
    parsed.minPrice !== undefined && `desde ${formatMxn(parsed.minPrice)}`,
    parsed.maxPrice !== undefined && `hasta ${formatMxn(parsed.maxPrice)}`,
  ].filter(Boolean).join(" ");

  const title = operation === "sale" ? "Propiedades en venta" : operation === "rent" ? "Propiedades en renta" : "Todas las propiedades";

  return (
    <main className="flex-1 bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="mb-1 text-3xl font-bold tracking-tight text-navy">{title}</h1>
        <p className="mb-6 text-sm text-slate-600">
          {!ready ? "Cargando propiedades…" : <>{results.length} {results.length === 1 ? "resultado" : "resultados"}</>}
          {q && <> para “{q}”{priceNote && <> ({priceNote})</>}</>}
        </p>

        {/* Barra superior: venta / renta · orden · mapa */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <nav aria-label="Tipo de operación" className="flex flex-wrap gap-2">
            {tabs.map((t) => (
              <Link
                key={t.op}
                href={`${t.href}${query}`}
                aria-current={operation === t.op ? "page" : undefined}
                className={`${tabBase} ${operation === t.op ? "bg-navy text-white" : "border border-slate-300 bg-white text-navy hover:border-navy hover:bg-slate-100"}`}
              >
                {t.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <select
              aria-label="Ordenar propiedades"
              value={sort}
              onChange={(e) => update({ sort: e.target.value as Sort })}
              className="cursor-pointer rounded-md border border-slate-300 bg-white px-3 py-2 text-[0.9rem] font-medium text-navy transition-colors hover:border-navy focus:border-navy focus:outline-none"
            >
              <option value="recent">Últimos publicados</option>
              <option value="asc">Precio de menor a mayor</option>
              <option value="desc">Precio de mayor a menor</option>
            </select>
            <Link
              href="/properties/map"
              className="rounded-md bg-accent px-4 py-2 text-[0.9rem] font-semibold text-navy transition-colors hover:bg-accent-hover"
            >
              Ver mapa
            </Link>
          </div>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <aside>
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              className="mb-3 w-full rounded-md border border-navy px-4 py-2 text-[0.9rem] font-semibold text-navy transition-colors hover:bg-navy hover:text-white lg:hidden"
            >
              {open ? "Ocultar filtros" : "Mostrar filtros"}
            </button>
            <div className={`${open ? "block" : "hidden"} lg:block`}>
              <FiltersSidebar facets={facets} filters={filters} counts={counts} isRent={operation === "rent"} onChange={(f) => update({ filters: f })} onReset={reset} />
            </div>
          </aside>

          <section className="min-w-0 flex-1">
            {!ready ? (
              <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Cargando propiedades…</p>
            ) : results.length > 0 ? (
              <PropertyGrid items={results} cols={2} compact />
            ) : (
              <div className="flex flex-col items-start gap-3 rounded-xl border border-slate-200 bg-white p-6">
                <p className="text-slate-700">
                  {q ? <>No encontramos propiedades para “{q}”{hasFilters && " con estos filtros"}.</> : "No hay propiedades con estos filtros."}
                </p>
                <div className="flex flex-wrap gap-4 text-sm font-semibold text-navy">
                  {hasFilters && (
                    <button type="button" onClick={reset} className="cursor-pointer underline">
                      Limpiar filtros
                    </button>
                  )}
                  {q && (
                    <button type="button" onClick={() => update({ q: "" })} className="cursor-pointer underline">
                      Quitar búsqueda
                    </button>
                  )}
                  <button type="button" onClick={() => router.push("/properties")} className="cursor-pointer underline">
                    Ver todas las propiedades
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
