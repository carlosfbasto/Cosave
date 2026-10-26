"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createContext, useContext, useMemo, useState } from "react";
import { emptyFilters, type Filters } from "@/components/properties/filters-sidebar";
import { draftFromSearch, SaveSearchModal } from "@/components/properties/save-search-modal";
import { loginUrl } from "@/lib/auth";
import { useCurrentUser } from "@/lib/current-user";
import { slugify, type ListedProperty } from "@/lib/mock-data";
import { parseQuery } from "@/lib/search";
import { useCatalog } from "@/lib/use-catalog";

type Operation = "all" | "sale" | "rent";

const TABS: { op: Operation; label: string; path: string }[] = [
  { op: "sale", label: "Comprar", path: "/properties/sale" },
  { op: "rent", label: "Rentar", path: "/properties/rentals" },
  { op: "all", label: "Todas", path: "/properties" },
];
const BEDS = [1, 2, 3, 4];

interface Criteria {
  operation: Operation;
  city: string;
  type: string;
  minPrice: string;
  maxPrice: string;
  beds: number | null;
}

const initial: Criteria = { operation: "sale", city: "", type: "", minPrice: "", maxPrice: "", beds: null };

interface HomeSearch {
  criteria: Criteria;
  set: (patch: Partial<Criteria>) => void;
  /** Abre "Guardar mi búsqueda" con los criterios de la consola (sin sesión, va al login). */
  saveSearch: () => void;
  saving: boolean;
}

const Ctx = createContext<HomeSearch | null>(null);

function useHomeSearch() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useHomeSearch fuera de <HomeSearchProvider>");
  return ctx;
}

/** Lo elegido en la consola, en el formato de los filtros del listado. */
function toFilters(c: Criteria): Filters {
  const n = (v: string) => (v ? Number(v) : undefined);
  return {
    ...emptyFilters,
    cities: c.city ? [c.city] : [],
    types: c.type ? [c.type] : [],
    price: { min: n(c.minPrice), max: n(c.maxPrice) },
    beds: { min: c.beds ?? undefined },
  };
}

function matches(p: ListedProperty, c: Criteria) {
  const f = toFilters(c);
  return (
    (c.operation === "all" || p.operation === c.operation) &&
    (!c.city || p.city === c.city) &&
    (!c.type || p.type === c.type) &&
    (f.price.min === undefined || p.price >= f.price.min) &&
    (f.price.max === undefined || p.price <= f.price.max) &&
    (c.beds === null || p.bedrooms >= c.beds)
  );
}

/** URL del listado con los mismos parámetros que usan sus filtros. */
function listUrl(c: Criteria) {
  const sp = new URLSearchParams();
  if (c.city) sp.set("ciudad", slugify(c.city));
  if (c.type) sp.set("tipo", slugify(c.type));
  if (c.minPrice) sp.set("precio_min", c.minPrice);
  if (c.maxPrice) sp.set("precio_max", c.maxPrice);
  if (c.beds !== null) sp.set("recamaras_min", String(c.beds));
  const qs = sp.toString();
  return `${TABS.find((t) => t.op === c.operation)!.path}${qs ? `?${qs}` : ""}`;
}

/** Estado compartido de la portada: la consola de búsqueda y los botones de "Guardar mi búsqueda". */
export function HomeSearchProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const me = useCurrentUser();
  const { items } = useCatalog();
  const [criteria, setCriteria] = useState<Criteria>(initial);
  const [open, setOpen] = useState(false);

  const facets = useMemo(() => {
    const uniq = (f: (p: ListedProperty) => string) => [...new Set(items.map(f))].filter(Boolean);
    return { states: uniq((p) => p.state), cities: uniq((p) => p.city) };
  }, [items]);

  const value: HomeSearch = {
    criteria,
    set: (patch) => setCriteria((c) => ({ ...c, ...patch })),
    saveSearch: () => {
      if (me.id) setOpen(true);
      else router.push(loginUrl("/home", "login", undefined, "/home"));
    },
    saving: me.loading,
  };

  return (
    <Ctx.Provider value={value}>
      {children}
      <SaveSearchModal
        open={open}
        initial={draftFromSearch(criteria.operation, toFilters(criteria), "", parseQuery(""), facets)}
        onClose={() => setOpen(false)}
      />
    </Ctx.Provider>
  );
}

/** Botón que abre "Guardar mi búsqueda" desde cualquier parte de la portada. */
export function SaveSearchButton({ className, children }: { className: string; children: React.ReactNode }) {
  const { saveSearch, saving } = useHomeSearch();
  return (
    <button type="button" onClick={saveSearch} disabled={saving} className={className}>
      {children}
    </button>
  );
}

const box = "flex min-w-0 flex-col gap-1 rounded-xl bg-slate-50 p-3 ring-1 ring-inset ring-slate-200/70 transition-colors focus-within:bg-white focus-within:ring-azure/40 hover:bg-slate-100/70";
const boxLabel = "label-sm flex items-center gap-1.5 text-slate-500";
const control = "w-full min-w-0 cursor-pointer bg-transparent text-[0.95rem] font-semibold text-ink focus:outline-none";
const hint = "text-[0.8rem] text-slate-500";
const iconCls = "h-4 w-4 shrink-0 text-azure";

/** Consola de búsqueda de la portada: operación, ubicación, tipo, presupuesto y recámaras. */
export function HeroSearch() {
  const router = useRouter();
  const { criteria: c, set } = useHomeSearch();
  const { items, ready } = useCatalog();
  const sorted = (f: (p: ListedProperty) => string) => [...new Set(items.map(f))].filter(Boolean).sort((a, b) => a.localeCompare(b, "es"));
  const cities = sorted((p) => p.city);
  const types = sorted((p) => p.type);
  const count = items.filter((p) => matches(p, c)).length;
  const url = listUrl(c);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        router.push(url);
      }}
      className="w-full max-w-5xl rounded-2xl border border-slate-200 bg-white p-4 text-left text-ink shadow-veil md:p-6"
    >
      <div role="tablist" aria-label="Operación" className="mb-4 inline-flex gap-1 rounded-xl bg-slate-100 p-1">
        {TABS.map((t) => (
          <button
            key={t.op}
            type="button"
            role="tab"
            aria-selected={c.operation === t.op}
            onClick={() => set({ operation: t.op })}
            className={`cursor-pointer rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors ${
              c.operation === t.op ? "bg-ink text-white" : "text-slate-600 hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className={box}>
          <span className={boxLabel}>
            <svg viewBox="0 0 24 24" className={iconCls} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M12 21s-7-6.2-7-11a7 7 0 0114 0c0 4.8-7 11-7 11z" strokeLinejoin="round" /><circle cx="12" cy="10" r="2.5" /></svg>
            Ubicación
          </span>
          <select value={c.city} onChange={(e) => set({ city: e.target.value })} className={control}>
            <option value="">Todas</option>
            {cities.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
          <span className={hint}>Municipio</span>
        </label>

        <label className={box}>
          <span className={boxLabel}>
            <svg viewBox="0 0 24 24" className={iconCls} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden><path d="M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6" /></svg>
            Tipo de propiedad
          </span>
          <select value={c.type} onChange={(e) => set({ type: e.target.value })} className={control}>
            <option value="">Todos</option>
            {types.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
          <span className={hint}>Casa, departamento, terreno…</span>
        </label>

        <div className={box}>
          <span className={boxLabel}>
            <svg viewBox="0 0 24 24" className={iconCls} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden><rect x="3" y="6" width="18" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /></svg>
            Presupuesto
          </span>
          <div className="flex items-center gap-1.5">
            <input
              inputMode="numeric"
              aria-label="Presupuesto mínimo"
              placeholder="Mínimo"
              value={c.minPrice}
              onChange={(e) => set({ minPrice: e.target.value.replace(/\D/g, "").slice(0, 12) })}
              className="w-full min-w-0 bg-transparent text-[0.95rem] font-semibold text-ink placeholder:font-normal placeholder:text-slate-400 focus:outline-none"
            />
            <span className="text-slate-400">–</span>
            <input
              inputMode="numeric"
              aria-label="Presupuesto máximo"
              placeholder="Máximo"
              value={c.maxPrice}
              onChange={(e) => set({ maxPrice: e.target.value.replace(/\D/g, "").slice(0, 12) })}
              className="w-full min-w-0 bg-transparent text-[0.95rem] font-semibold text-ink placeholder:font-normal placeholder:text-slate-400 focus:outline-none"
            />
          </div>
          <span className={hint}>En pesos mexicanos (MXN)</span>
        </div>

        <div className={box}>
          <span className={boxLabel} id="beds-label">
            <svg viewBox="0 0 24 24" className={iconCls} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 18v-7a2 2 0 012-2h14a2 2 0 012 2v7M3 15h18M7 9V6h10v3" /></svg>
            Recámaras
          </span>
          <div role="group" aria-labelledby="beds-label" className="flex gap-1.5">
            {BEDS.map((n) => (
              <button
                key={n}
                type="button"
                aria-pressed={c.beds === n}
                onClick={() => set({ beds: c.beds === n ? null : n })}
                className={`label-sm cursor-pointer rounded-md px-2.5 py-1 transition-colors ${
                  c.beds === n ? "bg-ink text-white" : "bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:text-ink"
                }`}
              >
                {n}+
              </button>
            ))}
          </div>
          <span className={hint}>Mínimo de recámaras</span>
        </div>
      </div>

      <div className="mt-4 flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-end">
        <Link href={url} className="btn btn-outline px-4 py-2.5 text-sm">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M4 6h16M7 12h10M10 18h4" /></svg>
          Más filtros
        </Link>
        <button type="submit" className="btn btn-accent px-6 py-2.5 text-sm">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" strokeLinecap="round" /></svg>
          Buscar
          {ready && <span className="rounded bg-white/20 px-1.5 py-0.5 text-xs font-semibold tabular-nums">{count.toLocaleString("es-MX")}</span>}
        </button>
      </div>
    </form>
  );
}
