"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useRef, useState } from "react";
import { MapGestureHint } from "./map-gesture-hint";
import { controlledGestures } from "./map-gestures";

export interface LatLng {
  lat: number;
  lng: number;
}

/** Zona a la que debe ir el mapa: centro y, si se conoce, el recuadro que la contiene (p. ej. el municipio). */
export interface MapArea {
  center: LatLng;
  bounds: [[number, number], [number, number]] | null;
}

// Centro inicial: Mérida, Yucatán.
const CENTER: [number, number] = [20.9674, -89.5926];
/** Si la marca ya está dentro de la zona (o a esta distancia de su centro), el mapa se queda en la marca. */
const NEAR_METERS = 5_000;

const pin = L.divIcon({
  className: "",
  html: '<span style="display:block;width:22px;height:22px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#0284c7;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></span>',
  iconSize: [22, 22],
  iconAnchor: [4, 22],
});

/**
 * Mapa (OpenStreetMap) donde el usuario hace clic para marcar la ubicación de su propiedad.
 * `area`: zona elegida (p. ej. el municipio del código postal); el mapa la encuadra cuando cambia.
 */
export function LocationPicker({
  value,
  onChange,
  area = null,
  className = "h-72",
}: {
  value: LatLng | null;
  onChange: (v: LatLng) => void;
  area?: MapArea | null;
  className?: string;
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const marker = useRef<L.Marker | null>(null);
  const cb = useRef(onChange);
  const initial = useRef(value);
  const latest = useRef(value);
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    cb.current = onChange;
    latest.current = value;
  });

  useEffect(() => {
    if (!el.current || map.current) return;
    // Si ya hay una marca (borrador guardado), el mapa abre centrado en ella.
    const first = initial.current;
    const m = L.map(el.current, { zoomControl: false }).setView(first ? [first.lat, first.lng] : CENTER, first ? 16 : 12);
    L.control.zoom({ position: "bottomright", zoomInTitle: "Acercar", zoomOutTitle: "Alejar" }).addTo(m);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(m);
    m.on("click", (e: L.LeafletMouseEvent) => cb.current({ lat: e.latlng.lat, lng: e.latlng.lng }));
    const release = controlledGestures(m, el.current, setHint);
    map.current = m;
    return () => {
      release();
      m.remove();
      map.current = null;
      marker.current = null;
    };
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    if (!value) {
      marker.current?.remove();
      marker.current = null;
      return;
    }
    if (marker.current) marker.current.setLatLng(value);
    else marker.current = L.marker(value, { icon: pin, keyboard: false }).addTo(m);
  }, [value]);

  // Nueva zona → el mapa la encuadra completa, salvo que la marca ya esté dentro.
  const areaKey = area ? JSON.stringify(area) : "";
  useEffect(() => {
    const m = map.current;
    if (!m || !areaKey) return;
    const a = JSON.parse(areaKey) as MapArea;
    const center = L.latLng(a.center.lat, a.center.lng);
    const bounds = a.bounds ? L.latLngBounds(a.bounds) : null;
    const mark = latest.current;
    if (mark && ((bounds && bounds.contains([mark.lat, mark.lng])) || center.distanceTo([mark.lat, mark.lng]) < NEAR_METERS)) return;
    // Un recuadro muy chico (código con un solo punto) se trata como centro.
    if (bounds && bounds.getNorthEast().distanceTo(bounds.getSouthWest()) > 2_000) {
      m.flyToBounds(bounds, { padding: [24, 24], maxZoom: 14, duration: 0.8 });
    } else {
      m.flyTo(center, 13, { duration: 0.8 });
    }
  }, [areaKey]);

  return (
    <div className={`relative z-0 w-full overflow-hidden ${className}`}>
      <div ref={el} className="h-full w-full" />
      <MapGestureHint text={hint} />
    </div>
  );
}
