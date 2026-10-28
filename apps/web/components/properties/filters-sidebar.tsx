"use client";

import { useState } from "react";
import { categoryCls, RangeFilter, subCls, type Range } from "./range-filter";

export interface Filters {
  states: string[];
  cities: string[];
  zones: string[];
  types: string[];
  price: Range;
  currency: "MXN" | "USD";
  beds: Range;
  baths: Range;
  build: Range;
  land: Range;
}

export const emptyFilters: Filters = {
  states: [],
  cities: [],
  zones: [],
  types: [],
  price: {},
  currency: "MXN",
  beds: {},
  baths: {},
  build: {},
  land: {},
};

/** Categoría tipo acordeón: al hacer clic muestra/oculta sus subcategorías. */
function Accordion({ title, defaultOpen = false, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="border-b border-slate-100 pb-3 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`${categoryCls} flex w-full items-center justify-between rounded px-2 py-1.5 text-left transition-colors hover:bg-slate-100`}
      >
        {title}
        <svg viewBox="0 0 10 6" className={`h-2 w-3 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
          <path d="M1 1l4 4 4-4" />
        </svg>
      </button>
      <div hidden={!open} className="mt-1 px-1">
        {children}
      </div>
    </section>
  );
}

function CheckList({ options, counts, selected, onToggle }: { options: readonly string[]; counts: Record<string, number>; selected: string[]; onToggle: (o: string) => void }) {
  return (
    <ul>
      {options.map((o) => {
        const on = selected.includes(o);
        const empty = !on && !counts[o];
        return (
          <li key={o}>
            <label
              className={`${subCls} flex cursor-pointer items-center gap-2 rounded px-2 py-1 transition-colors hover:bg-slate-100 hover:text-ink ${on ? "bg-slate-100 font-semibold text-ink" : ""} ${empty ? "opacity-50" : ""}`}
            >
              <input type="checkbox" checked={on} onChange={() => onToggle(o)} className="h-3.5 w-3.5 accent-ink" />
              {o} ({counts[o] ?? 0})
            </label>
          </li>
        );
      })}
    </ul>
  );
}

const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

export interface FilterCounts {
  states: Record<string, number>;
  zones: Record<string, number>;
  cities: Record<string, number>;
  types: Record<string, number>;
}

export function FiltersSidebar({
  facets,
  filters,
  counts,
  isRent,
  onChange,
  onReset,
}: {
  facets: { states: string[]; cities: string[]; zones: string[]; types: string[] };
  filters: Filters;
  counts: FilterCounts;
  isRent: boolean;
  onChange: (f: Filters) => void;
  onReset: () => void;
}) {
  return (
    <div className="flex w-full flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="headline-sm text-ink">Filtros</h2>
        <button type="button" onClick={onReset} className="cursor-pointer text-[0.8rem] text-slate-500 underline transition-colors hover:text-ink">
          Limpiar
        </button>
      </div>
      <Accordion title="Estado" defaultOpen>
        <CheckList options={facets.states} counts={counts.states} selected={filters.states} onToggle={(o) => onChange({ ...filters, states: toggle(filters.states, o) })} />
      </Accordion>
      <Accordion title="Municipio" defaultOpen={filters.cities.length > 0}>
        <CheckList options={facets.cities} counts={counts.cities} selected={filters.cities} onToggle={(o) => onChange({ ...filters, cities: toggle(filters.cities, o) })} />
      </Accordion>
      <Accordion title="Zona" defaultOpen={filters.zones.length > 0}>
        <CheckList options={facets.zones} counts={counts.zones} selected={filters.zones} onToggle={(o) => onChange({ ...filters, zones: toggle(filters.zones, o) })} />
      </Accordion>
      <Accordion title="Tipo de propiedad" defaultOpen={filters.types.length > 0}>
        <CheckList options={facets.types} counts={counts.types} selected={filters.types} onToggle={(o) => onChange({ ...filters, types: toggle(filters.types, o) })} />
      </Accordion>
      {/* `key`: si el rango cambia desde la URL (atrás/adelante), los campos se vuelven a llenar. */}
      <Accordion title={isRent ? "Precio de renta" : "Precio"} defaultOpen={filters.price.min !== undefined || filters.price.max !== undefined}>
        <RangeFilter key={`${filters.price.min}-${filters.price.max}-${filters.currency}`} title={isRent ? "Precio de renta" : "Precio"} step={isRent ? 1000 : 50000} value={filters.price} currency={filters.currency} onApply={(r, c) => onChange({ ...filters, price: r, currency: c ?? "MXN" })} />
      </Accordion>
      <Accordion title="Recámaras">
        <RangeFilter key={`${filters.beds.min}-${filters.beds.max}`} title="Recámaras" value={filters.beds} onApply={(r) => onChange({ ...filters, beds: r })} />
      </Accordion>
      <Accordion title="Baños">
        <RangeFilter key={`${filters.baths.min}-${filters.baths.max}`} title="Baños" value={filters.baths} onApply={(r) => onChange({ ...filters, baths: r })} />
      </Accordion>
      <Accordion title="Construcción (m²)">
        <RangeFilter key={`${filters.build.min}-${filters.build.max}`} title="Construcción" step={10} value={filters.build} onApply={(r) => onChange({ ...filters, build: r })} />
      </Accordion>
      <Accordion title="Terreno (m²)">
        <RangeFilter key={`${filters.land.min}-${filters.land.max}`} title="Terreno" step={10} value={filters.land} onApply={(r) => onChange({ ...filters, land: r })} />
      </Accordion>
    </div>
  );
}
