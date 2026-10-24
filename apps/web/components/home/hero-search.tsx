"use client";

import Form from "next/form";
import { useState } from "react";
import { slugify } from "@/lib/mock-data";

const OPERATIONS = [
  { value: "/properties", label: "Todas" },
  { value: "/properties/sale", label: "Venta" },
  { value: "/properties/rentals", label: "Renta" },
] as const;

const segment = "flex min-w-0 flex-1 flex-col gap-0.5 px-4 py-2.5";
const label = "label-sm text-slate-500";
const control = "w-full min-w-0 cursor-pointer bg-transparent text-[0.95rem] font-medium text-ink focus:outline-none";

/**
 * Buscador segmentado de la portada (Ubicación | Tipo | Precio).
 * Solo arma la URL del listado con los mismos parámetros que usan los filtros (`ciudad`, `tipo`, `precio_max`).
 */
export function HeroSearch({ cities, types }: { cities: string[]; types: string[] }) {
  const [action, setAction] = useState<string>(OPERATIONS[0].value);
  const [city, setCity] = useState("");
  const [type, setType] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  return (
    <Form
      action={action}
      className="flex w-full max-w-3xl flex-col divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-veil sm:flex-row sm:items-center sm:divide-x sm:divide-y-0"
    >
      <label className={segment}>
        <span className={label}>Operación</span>
        <select value={action} onChange={(e) => setAction(e.target.value)} className={control}>
          {OPERATIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </label>
      <label className={segment}>
        <span className={label}>Ubicación</span>
        {/* Sin `name` cuando está vacío para no ensuciar la URL. */}
        <select name={city ? "ciudad" : undefined} value={city} onChange={(e) => setCity(e.target.value)} className={control}>
          <option value="">Todas</option>
          {cities.map((c) => (
            <option key={c} value={slugify(c)}>{c}</option>
          ))}
        </select>
      </label>
      <label className={segment}>
        <span className={label}>Tipo</span>
        <select name={type ? "tipo" : undefined} value={type} onChange={(e) => setType(e.target.value)} className={control}>
          <option value="">Todos</option>
          {types.map((t) => (
            <option key={t} value={slugify(t)}>{t}</option>
          ))}
        </select>
      </label>
      <label className={segment}>
        <span className={label}>Precio máximo</span>
        <input
          name={maxPrice ? "precio_max" : undefined}
          inputMode="numeric"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value.replace(/\D/g, ""))}
          placeholder="Sin límite"
          className="w-full min-w-0 bg-transparent text-[0.95rem] font-medium text-ink placeholder:font-normal placeholder:text-slate-400 focus:outline-none"
        />
      </label>
      <div className="p-1.5 sm:pl-3">
        <button type="submit" className="btn btn-accent w-full px-6 py-3 sm:w-auto">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
            <circle cx="11" cy="11" r="6.5" />
            <path d="M16 16l4.5 4.5" strokeLinecap="round" />
          </svg>
          Buscar
        </button>
      </div>
    </Form>
  );
}
