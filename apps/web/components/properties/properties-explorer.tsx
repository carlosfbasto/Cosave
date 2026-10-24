"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { PropertyGrid } from "@/components/property-card";
import { loginUrl } from "@/lib/auth";
import { useCurrentUser } from "@/lib/current-user";
import { rememberResults } from "@/lib/last-results";
import { formatMxn, USD_RATE, type ListedProperty } from "@/lib/mock-data";
import { useCatalog } from "@/lib/use-catalog";
import { matchesQuery, parseQuery } from "@/lib/search";
import { emptyFilters, FiltersSidebar } from "./filters-sidebar";
import type { Range } from "./range-filter";
import { draftFromSearch, SaveSearchModal } from "./save-search-modal";
import { parseSearch, toQuery, type SearchState, type Sort } from "./url-state";

export type Operation = "all" | "sale" | "rent";

const inRange = (v: number, r: Range) => (r.min === undefined || v >= r.min) && (r.max === undefined || v <= r.max);

const tabs = [
  { href: "/properties", label: "Todas", op: "all" },
  { href: "/properties/sale", label: "Propiedades en venta", op: "sale" },
  { href: "/properties/rentals", label: "Propiedades en renta", op: "rent" },
] as const;

const tabBase = "rounded-lg px-4 py-2 text-[0.9rem] font-medium transition-colors";

export function PropertiesExplorer({ operation }: { operation: Operation }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const me = useCurrentUser();

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

  // Panel de filtros en móvil: Escape lo cierra y la página de fondo no se desplaza.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

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

  // Guardar la búsqueda requiere cuenta: sin sesión va al login y regresa a esta misma lista.
  const openSaveSearch = () => {
    if (me.id) setSaveOpen(true);
    else router.push(loginUrl(`${pathname}${query}`, "login", undefined, `${pathname}${query}`));
  };

  const title = operation === "sale" ? "Propiedades en venta" : operation === "rent" ? "Propiedades en renta" : "Todas las propiedades";

  return (
    <main className="flex-1 bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="mb-1 font-display text-3xl font-bold tracking-tight text-ink">{title}</h1>
        <p className="mb-6 text-sm text-slate-500">
          {!ready ? "Cargando propiedades…" : <>{results.length} {results.length === 1 ? "resultado" : "resultados"}</>}
          {q && <> para “{q}”{priceNote && <> ({priceNote})</>}</>}
        </p>

        {/* Barra superior: venta / renta · orden · mapa */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <nav aria-label="Tipo de operación" className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1">
            {tabs.map((t) => (
              <Link
                key={t.op}
                href={`${t.href}${query}`}
                aria-current={operation === t.op ? "page" : undefined}
                className={`${tabBase} ${operation === t.op ? "bg-ink text-white" : "text-slate-600 hover:bg-slate-50 hover:text-ink"}`}
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
              className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[0.9rem] font-medium text-ink transition-colors hover:border-slate-300 focus:border-azure focus:outline-none focus:ring-2 focus:ring-azure/15"
            >
              <option value="recent">Últimos publicados</option>
              <option value="asc">Precio de menor a mayor</option>
              <option value="desc">Precio de mayor a menor</option>
            </select>
            <Link
              href="/properties/map"
              className="btn btn-outline bg-white px-4 py-2.5 text-[0.9rem]"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden>
                <path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14" />
              </svg>
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
              aria-controls="filters-drawer"
              className="btn btn-outline mb-3 w-full bg-white px-4 py-2.5 text-[0.9rem] lg:hidden"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <path d="M4 6h16M7 12h10M10 18h4" />
              </svg>
              {open ? "Ocultar filtros" : "Mostrar filtros"}
            </button>
            {/* En móvil los filtros se abren como panel lateral sobre la lista; en escritorio son una columna fija. */}
            <div id="filters-drawer" className={`${open ? "fixed inset-0 z-50 flex" : "hidden"} lg:static lg:z-auto lg:block`}>
              <button type="button" aria-label="Cerrar filtros" onClick={() => setOpen(false)} className="scrim absolute inset-0 cursor-default lg:hidden" />
              <div
                role={open ? "dialog" : undefined}
                aria-modal={open ? true : undefined}
                aria-label="Filtros"
                className="relative flex h-full w-[88%] max-w-sm flex-col overflow-y-auto bg-slate-50 p-4 shadow-veil lg:h-auto lg:w-auto lg:max-w-none lg:overflow-visible lg:bg-transparent lg:p-0 lg:shadow-none"
              >
                <div className="mb-2 flex justify-end lg:hidden">
                  <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar filtros" className="grid h-9 w-9 cursor-pointer place-items-center rounded-full text-slate-500 transition-colors hover:bg-slate-200 hover:text-ink">
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
                  </button>
                </div>
                <FiltersSidebar facets={facets} filters={filters} counts={counts} isRent={operation === "rent"} onChange={(f) => update({ filters: f })} onReset={reset} />
                <div className="sticky bottom-0 -mx-4 mt-4 border-t border-slate-200 bg-white p-4 lg:hidden">
                  <button type="button" onClick={() => setOpen(false)} className="btn btn-primary w-full px-4 py-3">
                    Ver {results.length} {results.length === 1 ? "resultado" : "resultados"}
                  </button>
                </div>
              </div>
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
                <div className="flex flex-wrap gap-4 text-sm font-semibold text-ink">
                  <button type="button" onClick={openSaveSearch} disabled={me.loading} className="cursor-pointer text-azure underline">
                    Guardar mi búsqueda
                  </button>
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
      <SaveSearchModal
        open={saveOpen}
        initial={draftFromSearch(operation, filters, q, parsed, facets)}
        onClose={() => setSaveOpen(false)}
      />
    </main>
  );
}
