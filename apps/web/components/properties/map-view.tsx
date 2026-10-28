"use client";

import dynamic from "next/dynamic";

/** Leaflet usa `window`: el mapa solo se carga en el navegador. */
export const MapView = dynamic(() => import("./properties-map").then((m) => m.PropertiesMap), {
  ssr: false,
  loading: () => <div className="grid h-full min-h-[20rem] place-items-center rounded-3xl border border-slate-200 bg-slate-100 text-sm text-slate-500">Cargando mapa…</div>,
});
