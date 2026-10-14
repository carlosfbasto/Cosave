"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { loginUrl } from "@/lib/auth";
import { useCurrentUser } from "@/lib/current-user";

/** Atajo: lleva al perfil propio (`/profile/<id>`), o al login si no hay sesión. */
export default function ProfileRedirect() {
  const router = useRouter();
  const { id, loading } = useCurrentUser();

  useEffect(() => {
    if (loading) return;
    router.replace(id ? `/profile/${id}` : loginUrl("/perfil", "login"));
  }, [id, loading, router]);

  return <p className="p-8 text-sm text-slate-600">Cargando…</p>;
}
