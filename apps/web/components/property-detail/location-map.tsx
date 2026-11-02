"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useRef, useState } from "react";
import { MapGestureHint } from "@/components/map-gesture-hint";
import { controlledGestures } from "@/components/map-gestures";

const pin = L.divIcon({
  className: "",
  html: '<span style="display:block;width:22px;height:22px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#0284c7;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></span>',
  iconSize: [22, 22],
  iconAnchor: [4, 22],
});

/**
 * Mapa de solo lectura de la ficha. Mismos gestos que en /properties y /vender:
 * la rueda desplaza la página y el zoom es con Ctrl/⌘ + rueda (dos dedos en pantallas táctiles).
 * `exact`: con coordenadas reales se marca el punto; si no, un círculo de ubicación aproximada.
 */
export function LocationMap({ lat, lng, exact }: { lat: number; lng: number; exact: boolean }) {
  const el = useRef<HTMLDivElement>(null);
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    if (!el.current) return;
    const m = L.map(el.current, { zoomControl: false }).setView([lat, lng], exact ? 16 : 14);
    L.control.zoom({ position: "bottomright", zoomInTitle: "Acercar", zoomOutTitle: "Alejar" }).addTo(m);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(m);
    if (exact) L.marker([lat, lng], { icon: pin, keyboard: false }).addTo(m);
    else L.circle([lat, lng], { radius: 600, color: "#0284c7", weight: 2, fillOpacity: 0.12 }).addTo(m);
    const release = controlledGestures(m, el.current, setHint);
    return () => {
      release();
      m.remove();
    };
  }, [lat, lng, exact]);

  return (
    <div className="relative z-0 h-80 w-full overflow-hidden">
      <div ref={el} className="h-full w-full" />
      <MapGestureHint text={hint} />
    </div>
  );
}
