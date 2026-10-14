"use client";

import dynamic from "next/dynamic";
import { useCatalog } from "@/lib/use-catalog";

const PropertiesMap = dynamic(() => import("./properties-map").then((m) => m.PropertiesMap), {
  ssr: false,
  loading: () => <div className="grid h-[32rem] place-items-center rounded-xl border border-slate-200 bg-slate-100 text-sm text-slate-500">Cargando mapa…</div>,
});

export function MapView() {
  const { items, ready } = useCatalog();
  if (!ready) return <div className="grid h-[32rem] place-items-center rounded-xl border border-slate-200 bg-slate-100 text-sm text-slate-500">Cargando propiedades…</div>;
  return <PropertiesMap items={items} />;
}
