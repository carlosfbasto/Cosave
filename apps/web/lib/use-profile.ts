"use client";

import { useEffect, useState } from "react";
import type { UserRole } from "@cosave/shared";
import { api, type Profile } from "./api";
import { useCurrentUser } from "./current-user";

/** Perfil de la cuenta real (con su rol interno); null mientras carga, para usuarios demo o sin sesión. */
export function useProfile(): { profile: Profile | null; role: UserRole | null; loading: boolean } {
  const me = useCurrentUser();
  const [state, setState] = useState<{ id: string; profile: Profile | null } | null>(null);

  useEffect(() => {
    if (!me.id || !me.remote) return;
    let alive = true;
    api<Profile>("/me")
      .then((profile) => alive && setState({ id: me.id!, profile }))
      .catch(() => alive && setState({ id: me.id!, profile: null }));
    return () => {
      alive = false;
    };
  }, [me.id, me.remote]);

  const mine = state && state.id === me.id ? state.profile : null;
  const loading = me.loading || (!!me.id && me.remote && !(state && state.id === me.id));
  return { profile: mine, role: mine?.role ?? null, loading };
}
