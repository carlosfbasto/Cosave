"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useRef } from "react";

export interface LatLng {
  lat: number;
  lng: number;
}

// Centro inicial: Mérida, Yucatán.
const CENTER: [number, number] = [20.9674, -89.5926];

const pin = L.divIcon({
  className: "",
  html: '<span style="display:block;width:22px;height:22px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#f5b800;border:3px solid #10264a;box-shadow:0 1px 4px rgba(0,0,0,.4)"></span>',
  iconSize: [22, 22],
  iconAnchor: [4, 22],
});

/** Mapa (OpenStreetMap) donde el usuario hace clic para marcar la ubicación de su propiedad. */
export function LocationPicker({ value, onChange }: { value: LatLng | null; onChange: (v: LatLng) => void }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const marker = useRef<L.Marker | null>(null);
  const cb = useRef(onChange);

  useEffect(() => {
    cb.current = onChange;
  });

  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current).setView(CENTER, 12);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(m);
    m.on("click", (e: L.LeafletMouseEvent) => cb.current({ lat: e.latlng.lat, lng: e.latlng.lng }));
    map.current = m;
    return () => {
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

  return <div ref={el} className="z-0 h-72 w-full overflow-hidden rounded-lg border border-slate-300" />;
}
