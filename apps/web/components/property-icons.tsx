/** Íconos de características de una propiedad (tarjetas del portal y del listado). */
const paths = {
  bed: "M3 18v-7a2 2 0 012-2h14a2 2 0 012 2v7M3 15h18M7 9V6h10v3",
  bath: "M3 12h18v2a5 5 0 01-5 5H8a5 5 0 01-5-5v-2zM6 12V6a2 2 0 014 0",
  area: "M4 4h16v16H4zM4 9h5M9 4v5",
  land: "M3 20h18M5 20V9l7-5 7 5v11M9 20v-5h6v5",
  car: "M5 16h14M6 16l1.5-5h9L18 16M6 16v3M18 16v3M8 13.5h.01M16 13.5h.01",
} as const;

export type StatIconName = keyof typeof paths;

export function StatIcon({ name, className = "h-4 w-4 text-slate-500" }: { name: StatIconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d={paths[name]} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
