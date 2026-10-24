"use client";

import { useCallback, useEffect, useState } from "react";
import type { OperationType, PropertyType, SavedSearchCriteria } from "@cosave/shared";
import { api } from "./api";

/**
 * Búsquedas guardadas ("No encontré lo que busco"). Dos modos, igual que favoritos y consultas:
 *  - Cuenta real: viven en el api (`/saved-searches`, tabla `SavedSearch`).
 *  - Usuario demo: localStorage por usuario.
 */
export interface SavedSearchItem {
  id: string;
  operation: OperationType;
  propertyType: PropertyType | null;
  state: string | null;
  city: string | null;
  minPrice: number | null;
  maxPrice: number | null;
  createdAt: string;
}

type Who = { id: string | null; remote: boolean };

const key = (userId: string) => `cosave:saved-searches:${userId}`;

function readLocal(userId: string): SavedSearchItem[] {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(key(userId)) ?? "[]");
    return Array.isArray(v) ? (v as SavedSearchItem[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(userId: string, items: SavedSearchItem[]) {
  try {
    localStorage.setItem(key(userId), JSON.stringify(items));
  } catch {
    /* almacenamiento bloqueado: se ignora */
  }
}

/** Guarda los criterios. En modo api lanza `ApiError` si falla. */
export async function saveSearch(who: { id: string; remote: boolean }, c: SavedSearchCriteria): Promise<void> {
  if (who.remote) {
    await api("/saved-searches", { method: "POST", body: JSON.stringify(c) });
    return;
  }
  const item: SavedSearchItem = {
    id: crypto.randomUUID(),
    operation: c.operation,
    propertyType: c.propertyType ?? null,
    state: c.state ?? null,
    city: c.city ?? null,
    minPrice: c.minPrice ?? null,
    maxPrice: c.maxPrice ?? null,
    createdAt: new Date().toISOString(),
  };
  writeLocal(who.id, [item, ...readLocal(who.id)]);
}

/** Mis búsquedas guardadas (más recientes primero) y cómo eliminar una. */
export function useMySavedSearches(who: Who) {
  const [items, setItems] = useState<SavedSearchItem[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async (): Promise<SavedSearchItem[]> => {
    if (!who.id) return [];
    if (!who.remote) return readLocal(who.id);
    return api<SavedSearchItem[]>("/saved-searches");
  }, [who.id, who.remote]);

  useEffect(() => {
    let alive = true;
    load().then(
      (rows) => {
        if (!alive) return;
        setItems(rows);
        setError(false);
        setReady(true);
      },
      () => {
        if (!alive) return;
        setError(true);
        setReady(true);
      },
    );
    return () => {
      alive = false;
    };
  }, [load]);

  /** Elimina una búsqueda. En modo api lanza `ApiError` si falla. */
  const remove = useCallback(
    async (id: string) => {
      if (!who.id) return;
      if (who.remote) await api(`/saved-searches/${encodeURIComponent(id)}`, { method: "DELETE" });
      else writeLocal(who.id, readLocal(who.id).filter((s) => s.id !== id));
      setItems((list) => list.filter((s) => s.id !== id));
    },
    [who.id, who.remote],
  );

  return { items, ready, error, remove };
}
