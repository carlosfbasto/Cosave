"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { getMockUser } from "./mock-users";

/**
 * Notificaciones DEMO por usuario (localStorage, una clave por usuario).
 * Equivalen a la tabla `Notification`; allí falta un campo de lectura (`readAt`) que habrá que
 * añadir con una migración al conectar el api. Se reemplazará por `GET /notifications` (Etapa 5).
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

/** Notificaciones de `userId` (null = sin sesión), más recientes primero. */
export function useNotifications(userId: string | null) {
  const raw = useSyncExternalStore(
    subscribe,
    () => (userId ? read(userId) : null),
    () => null,
  );
  const items = useMemo(
    () => (userId ? parse(raw, userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) : []),
    [raw, userId],
  );

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

  return {
    items,
    unread: items.filter((n) => !n.read).length,
    markRead: (id: string) => save(items.map((n) => (n.id === id ? { ...n, read: true } : n))),
    markAllRead: () => save(items.map((n) => ({ ...n, read: true }))),
    remove: (id: string) => save(items.filter((n) => n.id !== id)),
  };
}
