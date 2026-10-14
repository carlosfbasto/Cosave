"use client";

import { PROPERTY_STATUSES, PROPERTY_STATUS_LABEL } from "@cosave/shared";
import { PageHeader } from "@/components/admin/admin-shell";
import { ErrorNote, Loading, panel } from "@/components/admin/ui";
import { useAdminData, type AdminStats } from "@/lib/admin";

const TYPE: Record<string, string> = { house: "Casas", apartment: "Departamentos", land: "Terrenos", commercial: "Locales y bodegas", other: "Otros" };
const ROLE: Record<string, string> = { buyer: "Compradores", seller: "Vendedores", agent: "Asesores", admin: "Administradores" };
const KIND: Record<string, string> = { self_publish: "Publicar por su cuenta", find_agent: "Buscar un asesor", services: "Servicios" };

/** Barra de proporción simple (sin librería de gráficas). */
function Rows({ title, rows }: { title: string; rows: [string, number][] }) {
  const max = Math.max(1, ...rows.map(([, n]) => n));
  return (
    <section className={`${panel} p-5`}>
      <h2 className="mb-4 font-bold text-navy">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-600">Sin datos todavía.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map(([label, n]) => (
            <li key={label}>
              <div className="mb-1 flex justify-between text-sm"><span className="text-slate-700">{label}</span><span className="font-semibold text-navy">{n.toLocaleString("es-MX")}</span></div>
              <div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-navy" style={{ width: `${(n / max) * 100}%` }} /></div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Reportes: cifras reales de propiedades, usuarios y solicitudes. */
export default function AdminReportsPage() {
  const { data: s, error } = useAdminData<AdminStats>("/admin/stats");
  const entries = (o: Record<string, number>, labels: Record<string, string>): [string, number][] => Object.entries(o).map(([k, n]) => [labels[k] ?? k, n]);
  return (
    <>
      <PageHeader title="Reportes" subtitle="Cifras actuales de la plataforma." />
      {error ? <ErrorNote message={error} /> : !s ? <Loading /> : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Rows title="Propiedades por estado" rows={PROPERTY_STATUSES.filter((st) => s.properties.byStatus[st]).map((st) => [PROPERTY_STATUS_LABEL[st], s.properties.byStatus[st]!])} />
          <Rows title="Publicadas por tipo" rows={entries(s.properties.publishedByType, TYPE)} />
          <Rows title="Usuarios por rol" rows={entries(s.users.byRole, ROLE)} />
          <Rows title="Solicitudes por tipo" rows={entries(s.requests.byKind, KIND)} />
        </div>
      )}
    </>
  );
}
