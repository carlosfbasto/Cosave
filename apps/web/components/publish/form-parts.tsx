import type { ReactNode } from "react";
import type { PropertyType } from "@cosave/shared";

export const input =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-[0.95rem] text-ink placeholder:text-slate-400 focus:border-azure focus:outline-none focus:ring-2 focus:ring-azure/15 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500";
export const card = "space-y-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-8";
export const primaryBtn = "btn btn-primary px-5 py-2.5 text-[0.9rem]";
export const outlineBtn = "btn btn-outline px-5 py-2.5 text-[0.9rem]";

export function Field({ label, error, hint, aside, children }: { label: string; error?: string; hint?: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
      <span className="flex items-center justify-between gap-3">
        {label}
        {aside && <span className="text-xs font-normal text-slate-500">{aside}</span>}
      </span>
      {children}
      {hint && !error && <span className="text-xs font-normal text-slate-500">{hint}</span>}
      {error && <span role="alert" className="text-xs font-normal text-red-600">{error}</span>}
    </label>
  );
}

/** Título de un grupo del formulario. */
export function GroupTitle({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="space-y-0.5">
      <h3 className="text-sm font-semibold text-ink">{children}</h3>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

const svg = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;

/** Íconos de los tipos de inmueble (mosaicos del paso 1). */
export const TYPE_ICON: Record<PropertyType, ReactNode> = {
  house: <path d="M3 11l9-7 9 7M5 10v10h14V10M10 20v-6h4v6" />,
  apartment: <path d="M5 21V4h10v17M15 9h4v12M3 21h18M8 8h1M11 8h1M8 12h1M11 12h1M8 16h1M11 16h1" />,
  land: <path d="M3 20l6-9 4 5 3-4 5 8zM15 6a2 2 0 100-4 2 2 0 000 4z" />,
  commercial: <path d="M4 10l1-6h14l1 6M4 10h16v10H4zM4 10a2.7 2.7 0 005.3 0 2.7 2.7 0 005.4 0 2.7 2.7 0 005.3 0M10 20v-5h4v5" />,
  commercial_warehouse: <path d="M3 21V9l9-5 9 5v12M7 21v-8h10v8M7 17h10" />,
  industrial_warehouse: <path d="M3 21V11l5 3v-3l5 3v-3l5 3V5h3v16zM7 18h2M12 18h2" />,
  other: <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 12l8-4.5M12 12v9M12 12L4 7.5" />,
};

export function Icon({ children, className = "h-5 w-5" }: { children: ReactNode; className?: string }) {
  return <svg {...svg} className={className}>{children}</svg>;
}

export const STEPS = [
  { title: "Datos y ubicación", hint: "Tipo, precio, superficies y mapa" },
  { title: "Fotografías", hint: "" },
  { title: "Vista previa", hint: "Revisa antes de enviar a revisión" },
] as const;

/** Pasos en tarjetas: el activo resaltado, los completados con palomita, los que faltan deshabilitados. */
export function StepTabs({ step, onGo, max, photos }: { step: number; onGo: (i: number) => void; max: number; photos: number }) {
  return (
    <ol className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-2 md:grid-cols-3" aria-label="Pasos para publicar">
      {STEPS.map((s, i) => {
        const reachable = i <= max;
        const active = i === step;
        const done = i < step;
        const hint = i === 1 ? (photos ? `${photos} ${photos === 1 ? "foto cargada" : "fotos cargadas"}` : "Sube al menos una foto") : s.hint;
        return (
          <li key={s.title}>
            <button
              type="button"
              disabled={!reachable}
              onClick={() => onGo(i)}
              aria-current={active ? "step" : undefined}
              className={`flex w-full cursor-pointer items-center gap-4 rounded-xl p-3 text-left transition-colors disabled:cursor-not-allowed sm:p-4 ${
                active ? "bg-slate-100" : reachable ? "hover:bg-slate-50" : "opacity-60"
              }`}
            >
              <span
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-full font-display text-base font-bold ${
                  active ? "bg-ink text-white" : done ? "bg-sky-100 text-azure" : "bg-slate-100 text-slate-500"
                }`}
              >
                {done ? <Icon className="h-5 w-5"><path d="M5 12l5 5L20 7" /></Icon> : i + 1}
              </span>
              <span className="min-w-0">
                <span className={`label-sm block ${active ? "text-azure" : "text-slate-500"}`}>Paso {i + 1}</span>
                <span className="block truncate font-display text-[1.05rem] font-semibold text-ink">{s.title}</span>
                <span className="block truncate text-xs text-slate-500">{hint}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

/** Casillas en forma de chip para elegir varias opciones (características, materiales). */
export function ChipChecklist<K extends string>({
  options,
  value,
  onChange,
  disabled,
  label,
}: {
  options: { key: K; label: string }[];
  value: K[];
  onChange: (next: K[]) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <ul className="flex flex-wrap gap-2" aria-label={label}>
      {options.map((o) => {
        const on = value.includes(o.key);
        return (
          <li key={o.key}>
            <label
              className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-azure/30 ${
                on ? "border-azure bg-sky-50 font-semibold text-ink" : "border-slate-300 text-slate-600 hover:border-slate-400"
              } ${disabled ? "pointer-events-none opacity-60" : ""}`}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={on}
                disabled={disabled}
                onChange={() => onChange(on ? value.filter((k) => k !== o.key) : [...value, o.key])}
              />
              {on && <Icon className="h-3.5 w-3.5 text-azure"><path d="M5 12l5 5L20 7" /></Icon>}
              {o.label}
            </label>
          </li>
        );
      })}
    </ul>
  );
}
