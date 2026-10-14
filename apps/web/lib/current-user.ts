"use client";

import { useSession } from "./auth";
import { useDemoUser } from "./demo-session";

/**
 * Quién tiene la sesión. `remote` = cuenta real de Supabase (favoritos y consultas viven en el api,
 * asociados a la cuenta); si no, es un usuario demo (localStorage). La cuenta real tiene prioridad.
 */
export function useCurrentUser(): { id: string | null; remote: boolean; loading: boolean } {
  const { session, loading } = useSession();
  const { user: demo } = useDemoUser();
  if (session) return { id: session.user.id, remote: true, loading: false };
  if (demo) return { id: demo.id, remote: false, loading: false };
  return { id: null, remote: false, loading };
}
