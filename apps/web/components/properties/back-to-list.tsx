"use client";

import Link from "next/link";
import { useLastResults } from "@/lib/last-results";

/** "Ver listado" del mapa: vuelve a la última lista con sus filtros, no a "Todas". */
export function BackToList() {
  const href = useLastResults();
  return (
    <Link href={href} className="rounded-md border border-navy px-4 py-2 text-[0.9rem] font-semibold text-navy transition-colors hover:bg-navy hover:text-white">
      ← Ver listado
    </Link>
  );
}
