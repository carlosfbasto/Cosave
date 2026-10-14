"use client";

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import type { PropertyStatus } from "@cosave/shared";
import { api, ApiError } from "./api";
import { useSession } from "./auth";
import { getMockUser } from "./mock-users";
import { showToast } from "./toast";

/**
 * Favoritos por usuario. Dos modos, con la misma interfaz:
 *  - Cuenta real (Supabase): viven en el api (`/favorites`), asociados a la cuenta → se ven desde cualquier dispositivo.
 *  - Usuario demo: localStorage, una clave por usuario (nunca lee ni escribe la lista de otro).
 * Los compradores demo arrancan con las propiedades de su ficha ficticia.
 */

/** Favorito tal como lo devuelve el api (incluye el estado actual de la propiedad). */
export interface RemoteFavorite {
  code: string;
  status: PropertyStatus;
}

/* ---------- Modo demo: localStorage ---------- */

const key = (userId: string) => `cosave:favorites:${userId}`;
const EVENT = "cosave:favorites-change";

function read(userId: string): string | null {
  try {
    return localStorage.getItem(key(userId));
  } catch {
    return null;
  }
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

function parse(raw: string | null, userId: string): string[] {
  if (raw !== null) {
    try {
      const v: unknown = JSON.parse(raw);
      if (Array.isArray(v)) return v.filter((c): c is string => typeof c === "string");
    } catch {
      /* dato corrupto: se parte de la lista base */
    }
  }
  const u = getMockUser(userId);
  return u?.role === "buyer" ? u.propertyCodes : [];
}

/* ---------- Modo cuenta real: almacén compartido (una sola carga para todas las cards) ---------- */

interface RemoteState {
  userId: string | null;
  items: RemoteFavorite[];
  loaded: boolean;
}

const EMPTY: RemoteState = { userId: null, items: [], loaded: false };
let remote: RemoteState = EMPTY;
const remoteListeners = new Set<() => void>();
let loading: string | null = null;

function setRemote(next: RemoteState) {
  remote = next;
  remoteListeners.forEach((l) => l());
}

function subscribeRemote(cb: () => void) {
  remoteListeners.add(cb);
  return () => void remoteListeners.delete(cb);
}

async function loadRemote(userId: string) {
  if (loading === userId || (remote.userId === userId && remote.loaded)) return;
  loading = userId;
  try {
    const rows = await api<{ publicCode: string; status: PropertyStatus }[]>("/favorites");
    setRemote({ userId, items: rows.map((r) => ({ code: r.publicCode, status: r.status })), loaded: true });
  } catch {
    // Sin conexión con el api: lista vacía, sin romper la pantalla.
    setRemote({ userId, items: [], loaded: true });
    showToast("No se pudieron cargar tus favoritos", "info");
  } finally {
    loading = null;
  }
}

/** Cambia la lista en el api con actualización optimista; si falla, vuelve atrás y avisa. */
async function mutateRemote(userId: string, code: string, save: boolean): Promise<boolean> {
  const before = remote;
  const without = remote.items.filter((i) => i.code !== code);
  setRemote({ ...remote, userId, items: save ? [{ code, status: "published" }, ...without] : without });
  try {
    await api(`/favorites/${encodeURIComponent(code)}`, { method: save ? "PUT" : "DELETE" });
    return true;
  } catch (err) {
    setRemote(before);
    showToast(err instanceof ApiError && err.status === 409 ? "Esa propiedad ya no está disponible" : "No se pudo actualizar tus favoritos", "info");
    return false;
  }
}

/**
 * Favoritos de `userId` (null = sin sesión). `ready` es false mientras se sabe si la cuenta es real
 * o se carga su lista, para no mostrar una lista vacía falsa. `statusOf` solo informa con cuenta real.
 */
export function useFavorites(userId: string | null) {
  const { session, loading: sessionLoading } = useSession();
  const isRemote = !!userId && session?.user.id === userId;

  const raw = useSyncExternalStore(
    subscribe,
    () => (userId && !isRemote ? read(userId) : null),
    () => null,
  );
  const remoteState = useSyncExternalStore(subscribeRemote, () => remote, () => EMPTY);

  useEffect(() => {
    if (isRemote && userId) void loadRemote(userId);
  }, [isRemote, userId]);

  const localCodes = useMemo(() => (userId && !isRemote ? parse(raw, userId) : []), [raw, userId, isRemote]);
  const remoteReady = remoteState.userId === userId && remoteState.loaded;
  const remoteItems = useMemo(() => (isRemote && remoteReady ? remoteState.items : []), [isRemote, remoteReady, remoteState]);
  const codes = useMemo(() => (isRemote ? remoteItems.map((i) => i.code) : localCodes), [isRemote, remoteItems, localCodes]);
  const ready = !userId || (isRemote ? remoteReady : !sessionLoading);

  const saveLocal = useCallback(
    (next: string[]) => {
      if (!userId) return;
      try {
        localStorage.setItem(key(userId), JSON.stringify(next));
      } catch {
        /* almacenamiento bloqueado: se ignora */
      }
      window.dispatchEvent(new Event(EVENT));
    },
    [userId],
  );

  /** Guardar la misma propiedad dos veces no duplica (F06). Devuelve si quedó guardada. */
  const add = useCallback(
    async (code: string) => {
      if (!userId) return false;
      if (isRemote) return mutateRemote(userId, code, true);
      saveLocal(localCodes.includes(code) ? localCodes : [code, ...localCodes]);
      return true;
    },
    [userId, isRemote, localCodes, saveLocal],
  );
  const remove = useCallback(
    async (code: string) => {
      if (!userId) return false;
      if (isRemote) return mutateRemote(userId, code, false);
      saveLocal(localCodes.filter((c) => c !== code));
      return true;
    },
    [userId, isRemote, localCodes, saveLocal],
  );

  const statusOf = useCallback((code: string): PropertyStatus => remoteItems.find((i) => i.code === code)?.status ?? "published", [remoteItems]);
  return { codes, ready, has: (code: string) => codes.includes(code), add, remove, statusOf };
}
