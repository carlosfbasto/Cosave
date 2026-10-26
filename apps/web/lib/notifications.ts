"use client";

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { api, apiRaw } from "./api";
import { useSession } from "./auth";
import { getMockUser } from "./mock-users";

/**
 * Notificaciones por usuario (campana del header). Dos modos, con la misma interfaz:
 *  - Cuenta real (Supabase): avisos `in_app` del api (`/notifications`), p. ej. coincidencias de búsquedas guardadas.
 *  - Usuario demo: localStorage, una clave por usuario, con avisos de ejemplo.
 */
export interface AppNotification {
  id: string;
  kind: "match" | "system";
  title: string;
  body: string;
  createdAt: string; // YYYY-MM-DD
  read: boolean;
  /** Si el aviso es por una coincidencia, la propiedad encontrada. */
  propertyCode?: string;
}

/* ---------- Modo demo: localStorage ---------- */

const key = (userId: string) => `cosave:notifications:${userId}`;
const EVENT = "cosave:notifications-change";

function seed(userId: string): AppNotification[] {
  const role = getMockUser(userId)?.role;
  if (role === "buyer") {
    return [
      { id: "n1", kind: "match", title: "Encontramos una propiedad para ti", body: "Loft con plantas y luz natural coincide con tu búsqueda «Departamento en renta».", createdAt: "2026-10-06", read: false, propertyCode: "COS-000006" },
      { id: "n2", kind: "match", title: "Nueva coincidencia", body: "Casa en privada ya está disponible en Tizimín, dentro de tu presupuesto.", createdAt: "2026-10-03", read: false, propertyCode: "COS-000005" },
      { id: "n3", kind: "system", title: "Bienvenido a COSAVE", body: "Guarda tus búsquedas y te avisaremos cuando aparezca una propiedad que coincida.", createdAt: "2026-06-02", read: true },
    ];
  }
  if (role === "admin") {
    return [
      { id: "n1", kind: "system", title: "Publicaciones por revisar", body: "Hay 6 publicaciones esperando moderación.", createdAt: "2026-10-07", read: false },
      { id: "n2", kind: "system", title: "Nuevo usuario registrado", body: "Se creó una cuenta nueva en la plataforma.", createdAt: "2026-10-05", read: true },
    ];
  }
  return [];
}

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

function parse(raw: string | null, userId: string): AppNotification[] {
  if (raw !== null) {
    try {
      const v: unknown = JSON.parse(raw);
      if (Array.isArray(v)) return v as AppNotification[];
    } catch {
      /* dato corrupto: se parte de la lista base */
    }
  }
  return seed(userId);
}

/* ---------- Modo cuenta real: almacén compartido (campana y página leen la misma carga) ---------- */

interface RemoteNotification {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  propertyCode: string | null;
}

interface RemoteState {
  userId: string | null;
  items: AppNotification[];
}

let remote: RemoteState = { userId: null, items: [] };
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

const fromApi = (n: RemoteNotification): AppNotification => ({
  id: n.id,
  kind: n.propertyCode ? "match" : "system",
  title: n.title,
  body: n.body,
  createdAt: n.createdAt.slice(0, 10),
  read: n.read,
  ...(n.propertyCode && { propertyCode: n.propertyCode }),
});

/** Carga (o recarga) los avisos de la cuenta. Sin conexión con el api deja la lista como estaba. */
async function loadRemote(userId: string) {
  if (loading === userId) return;
  loading = userId;
  try {
    const { data } = await apiRaw<{ data: RemoteNotification[] }>("/notifications");
    setRemote({ userId, items: data.map(fromApi) });
  } catch {
    if (remote.userId !== userId) setRemote({ userId, items: [] });
  } finally {
    loading = null;
  }
}

/** Cambio optimista; si el api falla, se recarga la lista real. */
function mutateRemote(userId: string, next: AppNotification[], call: () => Promise<unknown>) {
  setRemote({ userId, items: next });
  call().catch(() => loadRemote(userId));
}

/** Notificaciones de `userId` (null = sin sesión), más recientes primero. */
export function useNotifications(userId: string | null) {
  const { session } = useSession();
  const isRemote = !!userId && session?.user.id === userId;

  const raw = useSyncExternalStore(
    subscribe,
    () => (userId && !isRemote ? read(userId) : null),
    () => null,
  );
  const remoteState = useSyncExternalStore(subscribeRemote, () => remote, () => remote);

  // Cuenta real: carga al entrar y al volver a la pestaña (por si llegó una coincidencia nueva).
  useEffect(() => {
    if (!isRemote || !userId) return;
    void loadRemote(userId);
    const onFocus = () => void loadRemote(userId);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [isRemote, userId]);

  const items = useMemo(() => {
    if (!userId) return [];
    const list = isRemote ? (remoteState.userId === userId ? remoteState.items : []) : parse(raw, userId);
    return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [raw, remoteState, userId, isRemote]);

  const save = useCallback(
    (next: AppNotification[]) => {
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

  const markRead = (id: string) => {
    const next = items.map((n) => (n.id === id ? { ...n, read: true } : n));
    if (!isRemote) return save(next);
    mutateRemote(userId, next, () => api(`/notifications/${id}/read`, { method: "PATCH" }));
  };
  const markAllRead = () => {
    const next = items.map((n) => ({ ...n, read: true }));
    if (!isRemote) return save(next);
    mutateRemote(userId, next, () => api("/notifications/read-all", { method: "POST" }));
  };
  const remove = (id: string) => {
    const next = items.filter((n) => n.id !== id);
    if (!isRemote) return save(next);
    mutateRemote(userId, next, () => api(`/notifications/${id}`, { method: "DELETE" }));
  };

  return { items, unread: items.filter((n) => !n.read).length, markRead, markAllRead, remove };
}
