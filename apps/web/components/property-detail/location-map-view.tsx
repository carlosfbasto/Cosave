"use client";

import dynamic from "next/dynamic";

/** Leaflet usa `window`: el mapa de la ficha solo se carga en el navegador. */
export const LocationMapView = dynamic(() => import("./location-map").then((m) => m.LocationMap), {
  ssr: false,
  loading: () => <div className="grid h-80 place-items-center bg-slate-100 text-sm text-slate-500">Cargando mapa…</div>,
});
