"use client";

import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { useDemoUser } from "./demo-session";
import { getSupabase } from "./supabase";

/** Sesión actual de Supabase. `loading` es true hasta saber si hay sesión. */
export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let supabase;
    try {
      supabase = getSupabase();
    } catch {
      // Supabase sin configurar: se trata como visitante.
      queueMicrotask(() => setLoading(false));
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  return { session, loading };
}

/** Sesión real (Supabase) o demo. `loading` es true hasta saber si hay sesión de Supabase. */
export function useAuthState() {
  const { session, loading } = useSession();
  const { user: demo, signOut: demoSignOut } = useDemoUser();
  return { session, demo, loading, authed: !!session || !!demo, demoSignOut };
}

/** Cierra la sesión demo y la de Supabase (si existe): la persona vuelve a ser visitante. */
export async function signOutAll(demoSignOut: () => void) {
  demoSignOut();
  try {
    await getSupabase().auth.signOut();
  } catch {
    /* Supabase sin configurar o sin sesión: nada más que cerrar */
  }
}

/** Solo rutas internas: evita redirecciones abiertas (//otro.sitio, http://...). */
export function safeNext(next: string | null | undefined): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/perfil";
}

/** Páginas de cuenta: nunca sirven como "volver" (llevarían de nuevo a un formulario). */
const ACCOUNT_PATH = /^\/(login|registro|recuperar|restablecer)(\/|\?|$)/;

/** Página desde la que se pidió iniciar sesión (`volver`), solo si es una ruta interna que no sea de cuenta. */
export function safeFrom(from: string | null | undefined): string | null {
  return from && from.startsWith("/") && !from.startsWith("//") && !ACCOUNT_PATH.test(from) ? from : null;
}

/**
 * `reason` explica en la pantalla de acceso por qué se pidió la cuenta (ver AuthForm).
 * `from` es la página donde estaba la persona: "← Volver" regresa ahí aunque `next` sea una página privada.
 */
export const loginUrl = (next: string, mode: "login" | "registro" = "registro", reason?: "favorito" | "contacto", from?: string) =>
  `/${mode}?next=${encodeURIComponent(next)}${reason ? `&motivo=${reason}` : ""}${from ? `&volver=${encodeURIComponent(from)}` : ""}`;
