"use client";

import Link from "next/link";
import { PageHeader } from "@/components/admin/admin-shell";
import { ErrorNote, Loading, panel, StatCard } from "@/components/admin/ui";
import { StatusBadge } from "@/components/status-badge";
import { useAdminData, type AdminStats } from "@/lib/admin";
import type { MyProperty } from "@/lib/my-properties";

/** Resumen general: indicadores reales y las publicaciones que esperan revisión. */
export default function AdminHome() {
  const stats = useAdminData<AdminStats>("/admin/stats");
  const pending = useAdminData<(MyProperty & { owner: { fullName: string } })[]>("/admin/properties?status=pending&pageSize=5");
  const s = stats.data;

  return (
    <>
      <PageHeader title="Resumen general" subtitle="Control general de la plataforma" />

      {stats.error ? (
        <ErrorNote message={stats.error} />
      ) : !s ? (
        <Loading />
      ) : (
        <section aria-label="Indicadores" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard value={s.properties.published.toLocaleString("es-MX")} label="Propiedades publicadas" />
          <StatCard value={s.properties.pending.toLocaleString("es-MX")} label="Pendientes de revisión" tone="accent" />
          <StatCard value={s.users.total.toLocaleString("es-MX")} label="Usuarios registrados" />
          <StatCard value={s.requests.open.toLocaleString("es-MX")} label="Solicitudes nuevas" />
        </section>
      )}

      <section className={panel}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="font-bold text-navy">Propiedades por revisar</h2>
          <Link href="/admin/propiedades?status=pending" className="text-sm font-semibold text-navy underline transition-colors hover:text-accent-hover">Ver todas →</Link>
        </div>
        {pending.error ? (
          <div className="p-5"><ErrorNote message={pending.error} /></div>
        ) : !pending.data ? (
          <div className="p-5"><Loading /></div>
        ) : pending.data.length === 0 ? (
          <p className="p-5 text-sm text-slate-600">No hay publicaciones pendientes. ¡Todo al día!</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {pending.data.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-navy">{p.title}</p>
                  <p className="truncate text-sm text-slate-600">{[p.city, p.state].filter(Boolean).join(", ")} · {p.owner.fullName}</p>
                </div>
                <StatusBadge status={p.status} />
                <Link href={`/admin/propiedades?status=pending&q=${encodeURIComponent(p.code)}`} className="text-sm font-semibold text-navy underline transition-colors hover:text-accent-hover">
                  Revisar →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
