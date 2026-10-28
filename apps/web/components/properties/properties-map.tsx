"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo, useRef, useState } from "react";
import { MapGestureHint } from "@/components/map-gesture-hint";
import { controlledGestures } from "@/components/map-gestures";
import { formatMxn, type ListedProperty } from "@/lib/mock-data";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Pin de precio: `ink` normal, `azure` cuando la propiedad está resaltada o seleccionada. */
const pin = (p: ListedProperty, active: boolean) =>
  L.divIcon({
    className: "",
    html: `<span style="display:inline-block;transform:translate(-50%,-100%)${active ? " scale(1.1)" : ""};transform-origin:bottom center;white-space:nowrap;border-radius:9999px;background:${active ? "#0284c7" : "#0f172a"};color:#fff;font:700 12px/1 var(--font-inter),sans-serif;padding:6px 10px;border:2px solid #fff;box-shadow:0 4px 12px -2px rgba(15,23,42,.35);transition:background .15s">${esc(formatMxn(p.price))}</span>`,
    iconSize: [0, 0],
  });

/** Vista previa al tocar un pin: foto, precio, zona y enlace a la ficha. */
function popupHtml(p: ListedProperty): string {
  const facts = [p.bedrooms > 0 && `${p.bedrooms} rec.`, p.bathrooms > 0 && `${p.bathrooms} ${p.bathrooms === 1 ? "baño" : "baños"}`].filter(Boolean).join(" · ");
  return `<a href="/properties/${encodeURIComponent(p.code)}" style="display:block;width:220px;color:inherit;text-decoration:none">
    <img src="${esc(p.image)}" alt="" style="display:block;width:100%;height:120px;object-fit:cover;border-radius:12px" />
    <div style="margin-top:8px;font:700 16px/1.3 var(--font-jakarta),sans-serif;color:#0f172a">${esc(formatMxn(p.price))} <span style="font:600 11px var(--font-inter),sans-serif;color:#64748b">MXN${p.operation === "rent" ? " /mes" : ""}</span></div>
    <div style="margin-top:2px;font:600 12px/1.4 var(--font-inter),sans-serif;color:#334155">${esc(p.title)}</div>
    <div style="font:400 12px/1.4 var(--font-inter),sans-serif;color:#64748b">${esc(p.zone)} • ${esc(p.city)}${p.area > 0 ? ` (${p.area.toLocaleString("es-MX")} m²)` : ""}</div>
    <div style="display:flex;justify-content:space-between;gap:8px;margin-top:8px;padding-top:8px;border-top:1px solid #e2e8f0;font:400 12px var(--font-inter),sans-serif;color:#64748b"><span>${esc(facts)}</span><span style="color:#0284c7;font-weight:600">Ver detalle →</span></div>
  </a>`;
}

/**
 * Mapa real (OpenStreetMap) con un pin de precio por cada propiedad que tiene coordenadas.
 * `activeCode` resalta un pin; `onSelect` avisa qué pin se abrió (o `null` al cerrarlo).
 */
export function PropertiesMap({
  items,
  activeCode = null,
  onSelect,
  className = "h-[32rem]",
}: {
  items: ListedProperty[];
  activeCode?: string | null;
  onSelect?: (code: string | null) => void;
  className?: string;
}) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const markers = useRef(new Map<string, { marker: L.Marker; p: ListedProperty }>());
  const onSelectRef = useRef(onSelect);
  const activeRef = useRef(activeCode);
  const [hint, setHint] = useState<string | null>(null);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  const withCoords = useMemo(() => items.filter((p) => typeof p.latitude === "number" && typeof p.longitude === "number"), [items]);

  // El mapa se crea una sola vez; al filtrar solo cambian los pines.
  useEffect(() => {
    if (!el.current) return;
    const map = L.map(el.current, { zoomControl: false }).setView([20.9674, -89.5926], 9);
    L.control.zoom({ position: "bottomright", zoomInTitle: "Acercar", zoomOutTitle: "Alejar" }).addTo(map);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    map.on("popupclose", () => onSelectRef.current?.(null));
    // La rueda y un dedo desplazan la página; el mapa se mueve con Ctrl + rueda o con dos dedos.
    const release = controlledGestures(map, el.current, setHint);
    mapRef.current = map;
    // Al cambiar de vista o de tamaño de ventana el contenedor cambia de medida.
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(el.current);
    return () => {
      ro.disconnect();
      release();
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    markers.current.clear();
    const bounds = L.latLngBounds([]);
    for (const p of withCoords) {
      const pos: [number, number] = [p.latitude!, p.longitude!];
      const active = p.code === activeRef.current;
      const marker = L.marker(pos, { icon: pin(p, active), title: p.title, zIndexOffset: active ? 1000 : 0 })
        .bindPopup(popupHtml(p), { minWidth: 220, maxWidth: 240 })
        .on("popupopen", () => onSelectRef.current?.(p.code))
        .addTo(layer);
      markers.current.set(p.code, { marker, p });
      bounds.extend(pos);
    }
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [48, 48], maxZoom: 14 });
  }, [withCoords]);

  // Resalta el pin activo sin volver a dibujar los demás.
  useEffect(() => {
    const prev = activeRef.current;
    activeRef.current = activeCode;
    for (const code of [prev, activeCode]) {
      const m = code ? markers.current.get(code) : undefined;
      if (m) {
        const on = code === activeCode;
        m.marker.setIcon(pin(m.p, on)).setZIndexOffset(on ? 1000 : 0);
      }
    }
  }, [activeCode]);

  const missing = items.length - withCoords.length;
  return (
    <div className={`relative isolate overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 ${className}`}>
      <div ref={el} className="absolute inset-0 z-0" />
      <p className="pointer-events-none absolute left-3 top-3 z-[500] flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-ink shadow-glow ring-1 ring-slate-200">
        <span className="h-1.5 w-1.5 rounded-full bg-azure" aria-hidden />
        {withCoords.length} {withCoords.length === 1 ? "propiedad" : "propiedades"} en el mapa
        {missing > 0 && <span className="font-normal text-slate-500">· {missing} sin ubicación</span>}
      </p>
      <MapGestureHint text={hint} />
    </div>
  );
}
