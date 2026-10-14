import type { ReactNode } from "react";

export const panel = "rounded-xl border border-slate-200 bg-white shadow-sm";

export function StatCard({ value, label, tone = "navy" }: { value: ReactNode; label: string; tone?: "navy" | "accent" }) {
  return (
    <div className={`${panel} p-5`}>
      <p className={`text-3xl font-bold ${tone === "accent" ? "text-amber-600" : "text-navy"}`}>{value}</p>
      <p className="mt-1 text-sm text-slate-600">{label}</p>
    </div>
  );
}

export function Loading() {
  return <p className="text-sm text-slate-600">Cargando…</p>;
}

export function ErrorNote({ message }: { message: string }) {
  return <p role="alert" className="text-sm text-red-600">{message}</p>;
}

export const th = "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500";
export const td = "px-4 py-3 align-middle";
