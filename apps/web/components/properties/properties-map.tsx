"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo, useRef } from "react";
import { formatMxn, type ListedProperty } from "@/lib/mock-data";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Mapa real (OpenStreetMap) con un marcador de precio por cada propiedad que tiene coordenadas. */
export function PropertiesMap({ items }: { items: ListedProperty[] }) {
  const el = useRef<HTMLDivElement>(null);
  const withCoords = useMemo(() => items.filter((p) => typeof p.latitude === "number" && typeof p.longitude === "number"), [items]);

  useEffect(() => {
    if (!el.current) return;
    const map = L.map(el.current).setView([20.9674, -89.5926], 9);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    const bounds = L.latLngBounds([]);
    for (const p of withCoords) {
      const pos: [number, number] = [p.latitude!, p.longitude!];
      const icon = L.divIcon({
        className: "",
        html: `<span style="display:inline-block;transform:translate(-50%,-100%);white-space:nowrap;border-radius:9999px;background:#10264a;color:#fff;font:700 12px sans-serif;padding:4px 10px;box-shadow:0 1px 4px rgba(0,0,0,.35)">${esc(formatMxn(p.price))}</span>`,
        iconSize: [0, 0],
      });
      L.marker(pos, { icon, title: p.title })
        .addTo(map)
        .bindPopup(
          `<a href="/properties/${encodeURIComponent(p.code)}" style="color:#10264a;font-weight:600">${esc(p.title)}</a><br><span style="font-size:12px;color:#475569">${esc(p.city)}</span>`,
        );
      bounds.extend(pos);
    }
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    return () => {
      map.remove();
    };
  }, [withCoords]);

  return (
    <div className="space-y-2">
      <div ref={el} className="z-0 h-[32rem] w-full overflow-hidden rounded-xl border border-slate-200" />
      {withCoords.length < items.length && (
        <p className="text-xs text-slate-500">
          {items.length - withCoords.length} {items.length - withCoords.length === 1 ? "propiedad no tiene" : "propiedades no tienen"} ubicación en el mapa; las encuentras en el listado.
        </p>
      )}
    </div>
  );
}
