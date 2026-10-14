"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchCatalog, fetchProperty } from "./catalog";
import type { ListedProperty } from "./mock-data";

/** Una sola carga compartida por todas las pantallas; se refresca si tiene más de un minuto. */
let cache: { items: ListedProperty[]; at: number } | null = null;
let inflight: Promise<ListedProperty[]> | null = null;

export function loadCatalog(): Promise<ListedProperty[]> {
  if (cache && Date.now() - cache.at < 60_000) return Promise.resolve(cache.items);
  inflight ??= fetchCatalog()
    .then(({ items }) => {
      cache = { items, at: Date.now() };
      return items;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export function useCatalog(): { items: ListedProperty[]; ready: boolean } {
  const [state, setState] = useState<{ items: ListedProperty[]; ready: boolean }>(() => ({ items: cache?.items ?? [], ready: !!cache }));
  useEffect(() => {
    let alive = true;
    void loadCatalog().then((items) => alive && setState({ items, ready: true }));
    return () => {
      alive = false;
    };
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
