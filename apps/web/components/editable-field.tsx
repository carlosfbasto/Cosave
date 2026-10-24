"use client";

import { useEffect, useRef, useState } from "react";
import { regions } from "@/components/property-detail/contact-utils";

const inputBase =
  "w-full rounded-lg border bg-white py-2 pl-3 pr-10 text-sm transition-colors placeholder:text-slate-400 focus:border-azure focus:outline-none focus:ring-2 focus:ring-azure/15";

/**
 * Campo con un dato precargado: gris mientras está guardado, negro mientras se edita.
 * Los cambios solo se aplican con la palomita verde (o Enter); el lápiz vuelve a abrir la edición.
 * Lo usan los modales "Me interesa" y "Guardar mi búsqueda".
 */
export function EditableField({
  id,
  label,
  value,
  region,
  options,
  optional = false,
  type = "text",
  placeholder,
  autoComplete,
  inputMode,
  sanitize = (v) => v,
  format = (v) => v,
  validate,
  onSave,
  onEditing,
}: {
  id: string;
  label: string;
  value: string;
  /** Solo teléfono: lada guardada; activa el selector. */
  region?: string;
  /** Si viene, el campo es una lista de opciones en lugar de texto. */
  options?: { value: string; label: string }[];
  /** Un campo opcional vacío y sin tocar no cuenta como pendiente de confirmar. */
  optional?: boolean;
  type?: string;
  placeholder: string;
  autoComplete?: string;
  inputMode?: "numeric";
  sanitize?: (v: string) => string;
  format?: (v: string) => string;
  validate: (v: string) => string | null;
  onSave: (value: string, region: string) => void;
  onEditing: (id: string, editing: boolean) => void;
}) {
  const [editing, setEditing] = useState(!value); // sin dato: nace editable
  const [draft, setDraft] = useState(value);
  const [draftRegion, setDraftRegion] = useState(region ?? "+52");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement & HTMLSelectElement>(null);

  const pending = editing && !(optional && !value && !draft.trim());
  useEffect(() => onEditing(id, pending), [id, pending, onEditing]);

  function open() {
    setDraft(value);
    setDraftRegion(region ?? "+52");
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function confirm() {
    const msg = validate(draft);
    setError(msg);
    if (msg) return;
    onSave(draft.trim(), draftRegion);
    setEditing(false);
  }

  const cls = `${inputBase} ${error ? "border-red-500" : "border-slate-300"} ${editing ? "text-slate-900" : "text-slate-500"}`;
  const common = {
    ref: inputRef,
    id,
    "aria-invalid": !!error,
    "aria-describedby": error ? `err-${id}` : undefined,
  };

  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-[0.9rem] font-medium text-ink">{label}</label>
      <div className="flex gap-2">
        {region !== undefined && (
          <select
            aria-label="Lada"
            value={editing ? draftRegion : region}
            disabled={!editing}
            onChange={(e) => setDraftRegion(e.target.value)}
            className={`w-[4.5rem] shrink-0 rounded-lg border border-slate-300 bg-white px-1.5 py-2 text-sm focus:border-azure focus:outline-none focus:ring-2 focus:ring-azure/15 disabled:appearance-none disabled:text-slate-500 ${editing ? "cursor-pointer text-slate-900" : "cursor-default"}`}
          >
            {regions.map((r) => (
              <option key={r.code} value={r.code}>{r.code}</option>
            ))}
          </select>
        )}
        <div className="relative min-w-0 flex-1">
          {options ? (
            <select
              {...common}
              value={editing ? draft : value}
              disabled={!editing}
              onChange={(e) => setDraft(e.target.value)}
              className={`${cls} disabled:appearance-none disabled:opacity-100 ${editing ? "cursor-pointer" : "cursor-default"}`}
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
              readOnly={!editing}
              value={editing ? format(draft) : format(value)}
              onChange={(e) => setDraft(sanitize(e.target.value))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (editing) confirm();
                }
              }}
              className={cls}
            />
          )}
          {editing ? (
            <button
              type="button"
              onClick={confirm}
              aria-label={`Guardar ${label.toLowerCase()}`}
              title="Guardar cambios"
              className="absolute right-1.5 top-1/2 grid h-7 w-7 -translate-y-1/2 cursor-pointer place-items-center rounded-lg text-green-600 transition-colors hover:bg-green-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ) : (
            <button
              type="button"
              onClick={open}
              aria-label={`Editar ${label.toLowerCase()}`}
              title={`Editar ${label.toLowerCase()}`}
              className="absolute right-1.5 top-1/2 grid h-7 w-7 -translate-y-1/2 cursor-pointer place-items-center rounded-lg text-slate-500 transition-colors hover:bg-azure hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M4 20h4L19 9a2.8 2.8 0 00-4-4L4 16v4zM13.5 6.5l4 4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </div>
      </div>
      {error && <p id={`err-${id}`} role="alert" className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
