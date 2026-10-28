"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { PropertyGrid } from "@/components/property-card";
import { loginUrl } from "@/lib/auth";
import { useCurrentUser } from "@/lib/current-user";
import { rememberResults } from "@/lib/last-results";
import { formatMxn, USD_RATE, type ListedProperty } from "@/lib/mock-data";
import { useCatalog } from "@/lib/use-catalog";
import { matchesQuery, parseQuery } from "@/lib/search";
import { emptyFilters, FiltersSidebar } from "./filters-sidebar";
import { MapView } from "./map-view";
import { PAGE_SIZE, Pagination } from "./pagination";
import { PropertyRowCard } from "./property-row-card";
import type { Range } from "./range-filter";
import { draftFromSearch, SaveSearchModal } from "./save-search-modal";
import { parseSearch, toQuery, type SearchState, type Sort, type View } from "./url-state";

export type Operation = "all" | "sale" | "rent";

const inRange = (v: number, r: Range) => (r.min === undefined || v >= r.min) && (r.max === undefined || v <= r.max);

const tabs = [
  { href: "/properties", label: "Todas", op: "all" },
  { href: "/properties/sale", label: "Venta", op: "sale" },
  { href: "/properties/rentals", label: "Renta", op: "rent" },
] as const;

const views: { view: View; label: string; icon: string }[] = [
  { view: "split", label: "Lista y mapa", icon: "M3 5h8v14H3zM14 5l3.5-1 3.5 1v14l-3.5-1-3.5 1z" },
  { view: "grid", label: "Cuadrícula", icon: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" },
  { view: "map", label: "Solo mapa", icon: "M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14" },
];

const segment = "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[0.85rem] font-medium transition-colors";
const segmentOn = "bg-white text-ink shadow-sm ring-1 ring-slate-200";
const segmentOff = "text-slate-600 hover:text-ink";

const hasRange = (r: Range) => r.min !== undefined || r.max !== undefined;
const rangeText = (r: Range, fmt: (n: number) => string) =>
  r.min !== undefined && r.max !== undefined ? `${fmt(r.min)} – ${fmt(r.max)}` : r.min !== undefined ? `desde ${fmt(r.min)}` : `hasta ${fmt(r.max!)}`;

/** Un chip por cada filtro aplicado; `remove` es el cambio que lo quita. */
function activeChips({ filters, q }: SearchState, isRent: boolean): { key: string; label: string; remove: Partial<SearchState> }[] {
  const money = (n: number) =>
    filters.currency === "USD" ? n.toLocaleString("es-MX", { style: "currency", currency: "USD", maximumFractionDigits: 0 }) : formatMxn(n);
  const m2 = (n: number) => `${n.toLocaleString("es-MX")} m²`;
  const lists = (["states", "cities", "zones", "types"] as const).flatMap((k) =>
    filters[k].map((v) => ({ key: `${k}-${v}`, label: v, remove: { filters: { ...filters, [k]: filters[k].filter((x) => x !== v) } } })),
  );
  const ranges = [
    hasRange(filters.price) && { key: "price", label: `${isRent ? "Renta" : "Precio"}: ${rangeText(filters.price, money)}`, remove: { filters: { ...filters, price: {}, currency: "MXN" as const } } },
    hasRange(filters.beds) && { key: "beds", label: `Recámaras: ${rangeText(filters.beds, String)}`, remove: { filters: { ...filters, beds: {} } } },
    hasRange(filters.baths) && { key: "baths", label: `Baños: ${rangeText(filters.baths, String)}`, remove: { filters: { ...filters, baths: {} } } },
    hasRange(filters.build) && { key: "build", label: `Construcción: ${rangeText(filters.build, m2)}`, remove: { filters: { ...filters, build: {} } } },
    hasRange(filters.land) && { key: "land", label: `Terreno: ${rangeText(filters.land, m2)}`, remove: { filters: { ...filters, land: {} } } },
  ].filter((c) => c !== false);
  return [...(q ? [{ key: "q", label: `“${q}”`, remove: { q: "" } }] : []), ...lists, ...ranges];
}

export function PropertiesExplorer({ operation }: { operation: Operation }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  // `hovered`: tarjeta bajo el mouse (resalta su pin). `selected`: pin abierto en el mapa (marca su tarjeta).
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const listTop = useRef<HTMLDivElement>(null);
  const me = useCurrentUser();

  // Filtros, orden, vista, página y búsqueda viven en la URL: sobreviven a "atrás", a recargar y se pueden compartir.
  const search = searchParams.toString();
  const { items: catalog, ready } = useCatalog();
  const facets = useMemo(() => {
    const uniq = (f: (p: ListedProperty) => string) => [...new Set(catalog.map(f))].filter(Boolean).sort((a, b) => a.localeCompare(b, "es"));
    return { states: uniq((p) => p.state), cities: uniq((p) => p.city), zones: uniq((p) => p.zone), types: uniq((p) => p.type) };
  }, [catalog]);
  const state = useMemo(() => parseSearch(new URLSearchParams(search), facets), [search, facets]);
  const { filters, sort, q, view } = state;
  const parsed = useMemo(() => parseQuery(q), [q]);

  // Cambiar filtros, orden o búsqueda regresa a la primera página.
  const update = (patch: Partial<SearchState>) => {
    const next = { ...state, ...patch };
    if (!("page" in patch) && ("filters" in patch || "sort" in patch || "q" in patch)) next.page = 1;
    router.replace(`${pathname}${toQuery(next)}`, { scroll: false });
  };
  const query = toQuery(state);

  // Recuerda esta lista para el botón "Volver a resultados" de la ficha.
  useEffect(() => rememberResults(`${pathname}${query}`), [pathname, query]);

  // Panel de filtros: Escape lo cierra y la página de fondo no se desplaza.
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

  // El mapa muestra todos los resultados; la lista, solo la página actual.
  const lastPage = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const page = Math.min(state.page, lastPage);
  const pageItems = results.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const isRent = operation === "rent";
  const chips = activeChips(state, isRent);
  const filterCount = chips.filter((c) => c.key !== "q").length;
  const reset = () => update({ filters: emptyFilters });
  const hasFilters = filterCount > 0;
  const priceNote = [
    parsed.minPrice !== undefined && `desde ${formatMxn(parsed.minPrice)}`,
    parsed.maxPrice !== undefined && `hasta ${formatMxn(parsed.maxPrice)}`,
  ].filter(Boolean).join(" ");

  // Guardar la búsqueda requiere cuenta: sin sesión va al login y regresa a esta misma lista.
  const openSaveSearch = () => {
    if (me.id) setSaveOpen(true);
    else router.push(loginUrl(`${pathname}${query}`, "login", undefined, `${pathname}${query}`));
  };

  const goToPage = (n: number) => {
    update({ page: n });
    listTop.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Al abrir un pin, su tarjeta se trae a la vista si está en esta página.
  const selectFromMap = (code: string | null) => {
    setSelected(code);
    if (code && view === "split") document.getElementById(`prop-${code}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  const title = operation === "sale" ? "Propiedades en venta" : operation === "rent" ? "Propiedades en renta" : "Todas las propiedades";
  const crumb = operation === "sale" ? "Venta" : operation === "rent" ? "Renta" : null;
  const resultsLabel = `${results.length} ${results.length === 1 ? "propiedad" : "propiedades"}`;

  const map = (cls: string) => (
    <div className={cls}>
      <MapView items={results} activeCode={hovered ?? selected} onSelect={selectFromMap} className="h-full" />
    </div>
  );

  const emptyState = (
    <div className="flex flex-col items-start gap-3 rounded-3xl border border-slate-200 bg-white p-6">
      <p className="text-slate-700">
        {q ? <>No encontramos propiedades para “{q}”{hasFilters && " con estos filtros"}.</> : "No hay propiedades con estos filtros."}
      </p>
      <p className="text-sm text-slate-500">Guarda tu búsqueda y te avisamos cuando se publique una propiedad que coincida.</p>
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
  );

  const list = !ready ? (
    <p className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Cargando propiedades…</p>
  ) : results.length === 0 ? (
    emptyState
  ) : (
    <div className="flex flex-col gap-6">
      {view === "grid" ? (
        <PropertyGrid items={pageItems} cols={3} />
      ) : (
        <div className="flex flex-col gap-5">
          {pageItems.map((p) => (
            <PropertyRowCard key={p.code} p={p} active={selected === p.code} onHover={setHovered} />
          ))}
        </div>
      )}
      <Pagination page={page} total={results.length} onChange={goToPage} />
    </div>
  );

  return (
    <main className="flex-1 bg-slate-50">
      {/* Barra de resultados: migas, total, vista, orden, operación y filtros activos */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-[1440px] px-4 py-5 md:px-8">
          <nav aria-label="Ruta" className="text-xs text-slate-500">
            <Link href="/" className="hover:text-ink">Inicio</Link>
            <span className="mx-1.5" aria-hidden>/</span>
            {crumb ? (
              <>
                <Link href={`/properties${toQuery({ ...state, page: 1 })}`} className="hover:text-ink">Propiedades</Link>
                <span className="mx-1.5" aria-hidden>/</span>
                <span className="text-ink" aria-current="page">{crumb}</span>
              </>
            ) : (
              <span className="text-ink" aria-current="page">Propiedades</span>
            )}
          </nav>

          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <h1 className="font-display text-2xl font-bold tracking-tight text-ink md:text-3xl">{title}</h1>
              <p className="mt-0.5 text-sm text-slate-500">
                {!ready ? "Cargando propiedades…" : resultsLabel}
                {q && <> para “{q}”{priceNote && <> ({priceNote})</>}</>}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div role="group" aria-label="Vista de resultados" className="hidden items-center gap-1 rounded-lg bg-slate-100 p-1 md:flex">
                {views.map((v) => (
                  <button
                    key={v.view}
                    type="button"
                    onClick={() => update({ view: v.view })}
                    aria-pressed={view === v.view}
                    className={`${segment} cursor-pointer ${view === v.view ? segmentOn : segmentOff}`}
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden>
                      <path d={v.icon} />
                    </svg>
                    {v.label}
                  </button>
                ))}
              </div>
              <select
                aria-label="Ordenar propiedades"
                value={sort}
                onChange={(e) => update({ sort: e.target.value as Sort })}
                className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2 text-[0.85rem] font-medium text-ink transition-colors hover:border-slate-300 focus:border-azure focus:outline-none focus:ring-2 focus:ring-azure/15"
              >
                <option value="recent">Últimos publicados</option>
                <option value="asc">Precio de menor a mayor</option>
                <option value="desc">Precio de mayor a menor</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <nav aria-label="Tipo de operación" className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
              {tabs.map((t) => (
                <Link
                  key={t.op}
                  href={`${t.href}${toQuery({ ...state, page: 1 })}`}
                  aria-current={operation === t.op ? "page" : undefined}
                  className={`${segment} ${operation === t.op ? "bg-ink text-white" : segmentOff}`}
                >
                  {t.label}
                </Link>
              ))}
            </nav>
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-expanded={open}
              aria-controls="filters-drawer"
              className="btn btn-outline bg-white px-3 py-2 text-[0.85rem]"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <path d="M4 6h16M7 12h10M10 18h4" />
              </svg>
              Filtros
              {filterCount > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-azure px-1 text-[0.7rem] text-white">{filterCount}</span>}
            </button>
            {chips.length > 0 && (
              <ul aria-label="Filtros activos" className="flex flex-wrap items-center gap-2">
                {chips.map((c) => (
                  <li key={c.key}>
                    <button
                      type="button"
                      onClick={() => update(c.remove)}
                      aria-label={`Quitar filtro: ${c.label}`}
                      className="flex cursor-pointer items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 py-1 pl-3 pr-2 text-[0.8rem] font-medium text-azure transition-colors hover:border-sky-300 hover:bg-sky-100"
                    >
                      {c.label}
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
                        <path d="M6 6l12 12M18 6L6 18" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {chips.length > 0 && (
              <button type="button" onClick={() => update({ filters: emptyFilters, q: "" })} className="cursor-pointer px-1 text-[0.8rem] font-semibold text-azure hover:underline">
                Restablecer todo
              </button>
            )}
            <button type="button" onClick={openSaveSearch} disabled={me.loading} className="btn btn-outline ml-auto bg-white px-3 py-2 text-[0.85rem]">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden>
                <path d="M6 4h12v17l-6-4-6 4z" />
              </svg>
              Guardar alerta
            </button>
          </div>
        </div>
      </div>

      {/* Resultados según la vista elegida */}
      <div ref={listTop} className="mx-auto max-w-[1440px] scroll-mt-20 px-4 py-6 md:px-8">
        {view === "map" ? (
          map("h-[calc(100dvh-12rem)] min-h-[26rem]")
        ) : view === "grid" ? (
          list
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,11fr)_minmax(0,9fr)]">
            <section aria-label="Resultados" className="min-w-0">
              {list}
            </section>
            {/* En pantallas chicas el mapa se abre con el botón flotante. */}
            {map("hidden lg:sticky lg:top-[81px] lg:block lg:h-[calc(100dvh-97px)]")}
          </div>
        )}
      </div>

      {/* Lista ⇄ mapa en pantallas chicas */}
      <button
        type="button"
        onClick={() => update({ view: view === "map" ? "split" : "map" })}
        className="btn btn-primary fixed bottom-6 left-1/2 z-[900] -translate-x-1/2 rounded-full px-5 py-3 text-[0.9rem] shadow-veil lg:hidden"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d={view === "map" ? "M4 6h16M4 12h16M4 18h16" : views[2].icon} />
        </svg>
        {view === "map" ? "Ver lista" : "Ver mapa"}
      </button>

      {/* Panel lateral de filtros */}
      <div id="filters-drawer" className={open ? "fixed inset-0 z-[1100] flex justify-end" : "hidden"}>
        <button type="button" aria-label="Cerrar filtros" onClick={() => setOpen(false)} className="scrim absolute inset-0 cursor-default" />
        <div role="dialog" aria-modal="true" aria-label="Filtros" className="relative flex h-full w-[88%] max-w-sm flex-col bg-slate-50 shadow-veil">
          <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
            <p className="font-display text-lg font-semibold text-ink">Más filtros</p>
            <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar filtros" className="grid h-9 w-9 cursor-pointer place-items-center rounded-full text-slate-500 transition-colors hover:bg-slate-200 hover:text-ink">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <FiltersSidebar facets={facets} filters={filters} counts={counts} isRent={isRent} onChange={(f) => update({ filters: f })} onReset={reset} />
          </div>
          <div className="border-t border-slate-200 bg-white p-4">
            <button type="button" onClick={() => setOpen(false)} className="btn btn-primary w-full px-4 py-3">
              Ver {resultsLabel}
            </button>
          </div>
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
