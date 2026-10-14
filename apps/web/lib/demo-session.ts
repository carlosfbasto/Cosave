"use client";

import { useCallback, useSyncExternalStore } from "react";
import { getMockUser, type MockUser } from "./mock-users";

/**
 * Sesión DEMO con usuarios ficticios (solo navegador, localStorage).
 * No sustituye a Supabase Auth: es temporal para diseñar la experiencia por rol.
 */
const KEY = "cosave:demo-user";
const EVENT = "cosave:demo-user-change";

function read(): string | null {
  try {
    return localStorage.getItem(KEY);
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

export function useDemoUser(): { user: MockUser | null; signIn: (id: string) => void; signOut: () => void } {
  const id = useSyncExternalStore(subscribe, read, () => null);
  const write = useCallback((value: string | null) => {
    try {
      if (value) localStorage.setItem(KEY, value);
      else localStorage.removeItem(KEY);
    } catch {
      /* almacenamiento bloqueado: se ignora */
    }
    window.dispatchEvent(new Event(EVENT));
  }, []);
  return { user: id ? (getMockUser(id) ?? null) : null, signIn: write, signOut: () => write(null) };
}
