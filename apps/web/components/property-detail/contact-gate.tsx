"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { loginUrl } from "@/lib/auth";
import { useCurrentUser } from "@/lib/current-user";

/** Muestra el formulario solo con sesión; sin ella manda al login y regresa aquí al entrar. */
export function ContactGate({ code, children }: { code: string; children: React.ReactNode }) {
  const router = useRouter();
  const { id, loading } = useCurrentUser();
  const allowed = !!id;

  useEffect(() => {
    if (!loading && !allowed) router.replace(loginUrl(`/contacto/${code}`, "login", "contacto", `/properties/${code}`));
  }, [loading, allowed, router, code]);

  return allowed ? <>{children}</> : <p className="py-10 text-center text-sm text-slate-600">Verificando tu sesión…</p>;
}
