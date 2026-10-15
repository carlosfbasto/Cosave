"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Foto de perfil DEMO por usuario (solo navegador, localStorage; una clave por usuario).
 * Se reemplazará por subida a Supabase Storage + `Profile.avatarUrl` vía el api.
 */
const key = (userId: string) => `cosave:avatar:${userId}`;
const EVENT = "cosave:avatar-change";
/** Lado (px) de la foto guardada: el recorte se exporta a este tamaño. */
export const PHOTO_SIDE = 320;

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

/** Devuelve la foto elegida por el usuario (o null) y `save(dataUrl)` para guardar la ya recortada. */
export function useProfilePhoto(userId: string): { photo: string | null; save: (dataUrl: string) => void } {
  const photo = useSyncExternalStore(
    subscribe,
    () => read(userId),
    () => null,
  );
  const save = useCallback(
    (data: string) => {
      try {
        localStorage.setItem(key(userId), data);
      } catch {
        throw new Error("No se pudo guardar la foto en este navegador");
      }
      window.dispatchEvent(new Event(EVENT));
    },
    [userId],
  );
  return { photo, save };
}
