"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { fetchCatalog, fetchProperty } from "./catalog";
import type { ListedProperty } from "./mock-data";

/** Una sola carga compartida por todas las pantallas; se refresca si tiene más de un minuto. */
let cache: { items: ListedProperty[]; at: number } | null = null;
let inflight: Promise<ListedProperty[]> | null = null;

type CatalogState = { items: ListedProperty[]; ready: boolean };
/** Lo que el servidor siempre pinta (sin catálogo). También es lo que React usa mientras hidrata. */
const NOT_READY: CatalogState = { items: [], ready: false };
let snapshot: CatalogState = NOT_READY;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

export function loadCatalog(): Promise<ListedProperty[]> {
  if (cache && Date.now() - cache.at < 60_000) return Promise.resolve(cache.items);
  inflight ??= fetchCatalog()
    .then(({ items }) => {
      cache = { items, at: Date.now() };
      snapshot = { items, ready: true };
      listeners.forEach((l) => l());
      return items;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/**
 * Catálogo compartido. Se lee con `useSyncExternalStore` y un snapshot de servidor «no listo»: durante la
 * hidratación el cliente parte del mismo HTML que mandó el servidor aunque el catálogo ya haya llegado
 * (antes, leer la caché en el render inicial causaba un error de hidratación). En navegaciones dentro de
 * la app, con la caché tibia, se muestra de inmediato, sin pasar por «Cargando».
 */
export function useCatalog(): CatalogState {
  const state = useSyncExternalStore(subscribe, () => snapshot, () => NOT_READY);
  useEffect(() => {
    void loadCatalog();
  }, []);
  return state;
}

/** Propiedades por código, incluso las que ya no están publicadas (vendida, pausada…). */
export function useProperties(codes: string[]): { items: ListedProperty[]; ready: boolean } {
  const { items: catalog, ready: catalogReady } = useCatalog();
  const [extra, setExtra] = useState<Record<string, ListedProperty | null>>({});
  const key = codes.join(",");
  const missing = useMemo(
    () => (catalogReady ? codes.filter((c) => !catalog.some((p) => p.code === c) && !(c in extra)) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [catalogReady, catalog, key, extra],
  );

  useEffect(() => {
    if (!missing.length) return;
    let alive = true;
    void Promise.all(missing.map((c) => fetchProperty(c).then((r) => [c, r.found ? r.property : null] as const))).then((pairs) => {
      if (alive) setExtra((prev) => ({ ...prev, ...Object.fromEntries(pairs) }));
    });
    return () => {
      alive = false;
    };
  }, [missing]);

  const items = codes.flatMap((c) => catalog.find((p) => p.code === c) ?? extra[c] ?? []);
  return { items, ready: catalogReady && missing.length === 0 };
}
