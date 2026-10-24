"use client";

import Link from "next/link";
import { useLastResults } from "@/lib/last-results";

/** "Ver listado" del mapa: vuelve a la última lista con sus filtros, no a "Todas". */
export function BackToList() {
  const href = useLastResults();
  return (
    <Link href={href} className="rounded-lg border border-slate-300 px-4 py-2 text-[0.9rem] font-semibold text-ink transition-colors hover:border-slate-400 hover:bg-slate-50">
      ← Ver listado
    </Link>
  );
}
