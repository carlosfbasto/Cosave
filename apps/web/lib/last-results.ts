"use client";

import { useSyncExternalStore } from "react";

/**
 * Última lista de resultados vista (ruta + filtros), para "Volver a resultados" desde la ficha.
 * Vive en sessionStorage: se pierde al cerrar la pestaña y eso es suficiente.
 */
const KEY = "cosave:last-results";
export const DEFAULT_RESULTS = "/properties";

export function rememberResults(url: string) {
  try {
    sessionStorage.setItem(KEY, url);
  } catch {
    /* almacenamiento bloqueado: se ignora */
  }
}

function read(): string {
  try {
    const v = sessionStorage.getItem(KEY);
    // Solo rutas internas de propiedades (evita redirecciones abiertas).
    return v && /^\/properties(\/(sale|rentals))?(\?|$)/.test(v) ? v : DEFAULT_RESULTS;
  } catch {
    return DEFAULT_RESULTS;
  }
}

export const useLastResults = () =>
  useSyncExternalStore(
    () => () => {},
    read,
    () => DEFAULT_RESULTS,
  );
