import type { ReactNode } from "react";

export const input =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-ink focus:border-azure focus:outline-none focus:ring-2 focus:ring-azure/15 focus:ring-2 focus:ring-azure/15 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500";
export const card = "space-y-4 rounded-xl border border-slate-200 bg-white p-6";
export const primaryBtn =
  "cursor-pointer rounded-lg bg-ink px-5 py-2.5 text-[0.9rem] font-semibold text-white transition-colors hover:bg-ink-hover disabled:cursor-not-allowed disabled:opacity-60";
export const outlineBtn =
  "cursor-pointer rounded-lg border border-slate-300 px-5 py-2.5 text-[0.9rem] font-semibold text-ink transition-colors hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60";

export function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-ink">
      {label}
      {children}
      {hint && !error && <span className="text-xs font-normal text-slate-500">{hint}</span>}
      {error && <span role="alert" className="text-xs font-normal text-red-600">{error}</span>}
    </label>
  );
}

export const STEPS = ["Datos", "Fotos", "Vista previa"] as const;

/** Indicador de pasos: el activo en ink, los hechos con acento. */
export function Stepper({ step, onGo, max }: { step: number; onGo: (i: number) => void; max: number }) {
  return (
    <ol className="flex items-center gap-2 text-sm" aria-label="Pasos para publicar">
      {STEPS.map((label, i) => {
        const reachable = i <= max;
        return (
          <li key={label} className="flex items-center gap-2">
            <button
              type="button"
              disabled={!reachable}
              onClick={() => onGo(i)}
              aria-current={i === step ? "step" : undefined}
              className={`flex cursor-pointer items-center gap-2 rounded-full px-3 py-1.5 font-semibold transition-colors disabled:cursor-not-allowed ${
                i === step ? "bg-ink text-white" : reachable ? "bg-sky-50 text-azure hover:bg-sky-100" : "bg-slate-100 text-slate-500"
              }`}
            >
              <span className="grid h-5 w-5 place-items-center rounded-full bg-white/80 text-xs text-ink">{i + 1}</span>
              <span className="hidden sm:inline">{label}</span>
            </button>
            {i < STEPS.length - 1 && <span className="h-px w-4 bg-slate-300" aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}
