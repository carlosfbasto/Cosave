"use client";

import { useState } from "react";

export interface Range {
  min?: number;
  max?: number;
}

export const categoryCls = "text-[0.9rem] font-medium text-navy";
export const subCls = "text-[0.8rem] text-[#666]";

const inputCls =
  "w-full min-w-0 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[0.8rem] text-[#444] transition-colors placeholder:text-[#666] hover:border-navy-light focus:border-navy focus:outline-none";

const toNum = (v: string) => (v.trim() === "" || Number.isNaN(Number(v)) ? undefined : Number(v));

const stepBtn =
  "grid h-4 w-5 place-items-center rounded-sm text-[#666] transition-colors hover:bg-navy hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-navy";

/** Input numérico con botones de aumentar / disminuir dentro del campo. */
function NumberInput({ value, onChange, step, label, placeholder }: { value: string; onChange: (v: string) => void; step: number; label: string; placeholder: string }) {
  const bump = (dir: 1 | -1) => onChange(String(Math.max(0, (toNum(value) ?? 0) + dir * step)));
  return (
    <div className="relative min-w-0 flex-1">
      <input
        inputMode="numeric"
        aria-label={label}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "ArrowUp") { e.preventDefault(); bump(1); }
          if (e.key === "ArrowDown") { e.preventDefault(); bump(-1); }
        }}
        className={`${inputCls} pr-7`}
      />
      <div className="absolute inset-y-0 right-1 flex flex-col justify-center">
        <button type="button" tabIndex={-1} aria-label={`Aumentar ${label}`} onClick={() => bump(1)} className={stepBtn}>
          <svg viewBox="0 0 10 6" className="h-1.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M1 5l4-4 4 4" /></svg>
        </button>
        <button type="button" tabIndex={-1} aria-label={`Disminuir ${label}`} onClick={() => bump(-1)} className={stepBtn}>
          <svg viewBox="0 0 10 6" className="h-1.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M1 1l4 4 4-4" /></svg>
        </button>
      </div>
    </div>
  );
}

/** Mínimo – máximo, (moneda opcional) y Aplicar debajo. */
export function RangeFilter({
  title,
  step = 1,
  value,
  onApply,
  currency,
}: {
  title: string;
  step?: number;
  value: Range;
  onApply: (r: Range, currency?: "MXN" | "USD") => void;
  currency?: "MXN" | "USD";
}) {
  const [min, setMin] = useState(value.min?.toString() ?? "");
  const [max, setMax] = useState(value.max?.toString() ?? "");
  const [cur, setCur] = useState<"MXN" | "USD">(currency ?? "MXN");

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <NumberInput value={min} onChange={setMin} step={step} label={`${title} mínimo`} placeholder="Mínimo" />
        <NumberInput value={max} onChange={setMax} step={step} label={`${title} máximo`} placeholder="Máximo" />
      </div>
      {currency && (
        <select
          aria-label="Tipo de moneda"
          value={cur}
          onChange={(e) => setCur(e.target.value as "MXN" | "USD")}
          className={`${inputCls} cursor-pointer`}
        >
          <option value="MXN">MXN (peso mexicano)</option>
          <option value="USD">USD (dólar)</option>
        </select>
      )}
      <button
        type="button"
        onClick={() => onApply({ min: toNum(min), max: toNum(max) }, currency ? cur : undefined)}
        className="w-full rounded-md bg-navy px-3 py-1.5 text-[0.8rem] font-semibold text-white transition-colors hover:bg-accent hover:text-navy"
      >
        Aplicar
      </button>
    </div>
  );
}
