"use client";

import type { ReactNode } from "react";
import { NoticeCard } from "@/components/notice-card";
import { RequireAuth } from "@/components/require-auth";
import { useCurrentUser } from "@/lib/current-user";

/** Publicar exige sesión (si no, va a iniciar sesión) y una cuenta registrada: las demo no publican. */
export function SellerGate({ children }: { children: (userId: string) => ReactNode }) {
  return (
    <RequireAuth>
      <Inner>{children}</Inner>
    </RequireAuth>
  );
}

function Inner({ children }: { children: (userId: string) => ReactNode }) {
  const me = useCurrentUser();
  if (me.loading) return <p className="p-8 text-sm text-slate-600">Cargando…</p>;
  if (!me.id || !me.remote) {
    return <NoticeCard title="Publicar propiedad" text="Para publicar necesitas una cuenta registrada. Las cuentas de demostración solo pueden explorar." href="/registro" cta="Crear una cuenta" />;
  }
  return <>{children(me.id)}</>;
}
