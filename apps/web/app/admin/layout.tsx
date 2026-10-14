"use client";

import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { NoticeCard } from "@/components/notice-card";
import { RequireAuth } from "@/components/require-auth";
import { useProfile } from "@/lib/use-profile";

function Gate({ children }: { children: ReactNode }) {
  const { profile, role, loading } = useProfile();
  if (loading) return <p className="p-8 text-sm text-slate-600">Cargando…</p>;
  if (!profile || role !== "admin") {
    return <NoticeCard title="Sin acceso" text="Esta sección es solo para administradores de COSAVE." href="/home" cta="Ir al inicio" />;
  }
  return <AdminShell profile={profile}>{children}</AdminShell>;
}

/** Panel de administración: interfaz propia (menú lateral), separada del sitio público. */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <Gate>{children}</Gate>
    </RequireAuth>
  );
}
