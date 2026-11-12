"use client";

import { useState } from "react";

const inputBase =
  "w-full rounded-lg border bg-white py-2 pl-3 pr-10 text-sm text-slate-900 transition-colors placeholder:text-slate-400 focus:border-azure focus:outline-none focus:ring-2 focus:ring-azure/15";

/**
 * Campo de formulario con validación automática (para formularios sin datos precargados).
 * - El error aparece debajo del campo al salir de él (o al intentar enviar con `showErrors`) y se
 *   actualiza mientras se escribe.
 * - La palomita verde es solo un indicador: el dato escrito es válido. No es un botón.
 * Para datos precargados que se confirman uno a uno, ver `EditableField`.
 */
export function ValidatedField({
  id,
  label,
  value,
  options,
  type = "text",
  placeholder,
  autoComplete,
  inputMode,
  sanitize = (v) => v,
  format = (v) => v,
  validate,
  onChange,
  showErrors = false,
}: {
  id: string;
  label: string;
  value: string;
  /** Si viene, el campo es una lista de opciones en lugar de texto. */
  options?: { value: string; label: string }[];
  type?: string;
  placeholder: string;
  autoComplete?: string;
  inputMode?: "numeric";
  sanitize?: (v: string) => string;
  format?: (v: string) => string;
  validate: (v: string) => string | null;
  onChange: (value: string) => void;
  /** Muestra el error aunque el campo no se haya tocado (p. ej. tras pulsar «Guardar»). */
  showErrors?: boolean;
}) {
  const [touched, setTouched] = useState(false);
  const error = validate(value);
  const visibleError = touched || showErrors ? error : null;
  const valid = !error && value.trim() !== "";

  const common = {
    id,
    "aria-invalid": !!visibleError,
    "aria-describedby": visibleError ? `err-${id}` : undefined,
    className: `${inputBase} ${visibleError ? "border-red-500" : "border-slate-300"}`,
  };

  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-[0.9rem] font-medium text-ink">{label}</label>
      <div className="relative">
        {options ? (
          <select
            {...common}
            value={value}
            onChange={(e) => {
              setTouched(true);
              onChange(e.target.value);
            }}
            className={`${common.className} cursor-pointer`}
          >
            <option value="">{placeholder}</option>
            {options.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        ) : (
          <input
            {...common}
            type={type}
            inputMode={inputMode}
            autoComplete={autoComplete}
            placeholder={placeholder}
            value={format(value)}
            onChange={(e) => onChange(sanitize(e.target.value))}
            onBlur={() => setTouched(true)}
          />
        )}
        {valid && !visibleError && (
          <span
            title="Dato válido"
            className={`pointer-events-none absolute top-1/2 grid h-5 w-5 -translate-y-1/2 place-items-center text-green-600 ${options ? "right-8" : "right-3"}`}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
              <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        )}
      </div>
      {visibleError && <p id={`err-${id}`} role="alert" className="mt-1 text-xs text-red-600">{visibleError}</p>}
    </div>
  );
}
