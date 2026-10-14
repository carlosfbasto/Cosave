"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Foto de perfil DEMO por usuario (solo navegador, localStorage; una clave por usuario).
 * Se reemplazará por subida a Supabase Storage + `Profile.avatarUrl` vía el api.
 */
const key = (userId: string) => `cosave:avatar:${userId}`;
const EVENT = "cosave:avatar-change";
const MAX_SIDE = 320;

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

/** Reduce la imagen a un cuadrado de MAX_SIDE px (recorte centrado) para no llenar el localStorage. */
function toThumbnail(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const side = Math.min(img.width, img.height);
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = Math.min(side, MAX_SIDE);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("canvas no disponible"));
        return;
      }
      ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("imagen no válida"));
    };
    img.src = url;
  });
}

/** Devuelve la foto elegida por el usuario (o null) y `change(file)` para guardar una nueva. */
export function useProfilePhoto(userId: string): { photo: string | null; change: (file: File) => Promise<void> } {
  const photo = useSyncExternalStore(
    subscribe,
    () => read(userId),
    () => null,
  );
  const change = useCallback(
    async (file: File) => {
      const data = await toThumbnail(file);
      try {
        localStorage.setItem(key(userId), data);
      } catch {
        throw new Error("No se pudo guardar la foto en este navegador");
      }
      window.dispatchEvent(new Event(EVENT));
    },
    [userId],
  );
  return { photo, change };
}
