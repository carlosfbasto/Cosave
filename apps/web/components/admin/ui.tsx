import type { ReactNode } from "react";

export const panel = "card-surface rounded-xl";

export function StatCard({ value, label, tone = "ink" }: { value: ReactNode; label: string; tone?: "ink" | "accent" }) {
  return (
    <div className={`${panel} p-5`}>
      <p className={`metric-price text-3xl ${tone === "accent" ? "text-azure" : "text-ink"}`}>{value}</p>
      <p className="mt-1 text-sm text-slate-500">{label}</p>
    </div>
  );
}

export function Loading() {
  return <p className="text-sm text-slate-500">Cargando…</p>;
}

export function ErrorNote({ message }: { message: string }) {
  return <p role="alert" className="text-sm text-red-600">{message}</p>;
}

export const th = "label-sm px-4 py-3 text-left text-slate-500";
export const td = "px-4 py-3 align-middle";
