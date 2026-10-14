"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/admin/admin-shell";
import { ErrorNote, Loading, panel, td, th } from "@/components/admin/ui";
import { api, apiRaw } from "@/lib/api";
import { formatDate } from "@/lib/mock-users";
import { showToast } from "@/lib/toast";

type Status = "open" | "assigned" | "closed";
interface Row { id: string; kind: "self_publish" | "find_agent" | "services"; status: Status; notes: string | null; createdAt: string; seller: { fullName: string; email: string } }

const KIND: Record<Row["kind"], string> = { self_publish: "Publicar por su cuenta", find_agent: "Buscar un asesor", services: "Servicios (foto, video…)" };
const STATUS: Record<Status, { label: string; style: string }> = {
  open: { label: "Nueva", style: "bg-accent/30 text-navy" },
  assigned: { label: "Asignada", style: "bg-sky-100 text-sky-800" },
  closed: { label: "Cerrada", style: "bg-slate-200 text-slate-600" },
};
const FILTERS: [Status | null, string][] = [[null, "Todas"], ["open", "Nuevas"], ["assigned", "Asignadas"], ["closed", "Cerradas"]];

/** Solicitudes de vendedores: publicar solo, buscar asesor o contratar servicios. */
export default function AdminRequestsPage() {
  const [filter, setFilter] = useState<Status | null>(null);
  const [data, setData] = useState<{ filter: Status | null; rows: Row[]; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    apiRaw<{ data: Row[]; meta: { total: number } }>(`/admin/seller-requests?pageSize=50${filter ? `&status=${filter}` : ""}`)
      .then((r) => alive && (setData({ filter, rows: r.data, total: r.meta.total }), setError(null)))
      .catch((err) => alive && setError(err instanceof Error ? err.message : "No se pudieron cargar las solicitudes"));
    return () => {
      alive = false;
    };
  }, [filter]);

  async function change(id: string, status: Status) {
    try {
      await api(`/admin/seller-requests/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
      setData((d) => d && { ...d, rows: d.rows.flatMap((r) => (r.id !== id ? r : filter && filter !== status ? [] : [{ ...r, status }])) });
      showToast("Solicitud actualizada");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "No se pudo actualizar", "info");
    }
  }

  const current = data && data.filter === filter ? data : null;
  return (
    <>
      <PageHeader title="Solicitudes" subtitle="Vendedores que piden publicar, un asesor o servicios." />
      <div role="group" aria-label="Filtrar por estado" className="flex flex-wrap gap-2">
        {FILTERS.map(([s, label]) => (
          <button key={label} type="button" aria-pressed={filter === s} onClick={() => setFilter(s)} className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${filter === s ? "bg-navy text-white" : "border border-slate-300 bg-white text-slate-700 hover:border-navy"}`}>
            {label}
          </button>
        ))}
      </div>
      {error ? (
        <ErrorNote message={error} />
      ) : !current ? (
        <Loading />
      ) : current.rows.length === 0 ? (
        <p className={`${panel} p-6 text-center text-sm text-slate-600`}>Aún no hay solicitudes. Aparecerán aquí cuando los vendedores las envíen.</p>
      ) : (
        <div className={`${panel} overflow-x-auto`}>
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200"><tr><th className={th}>Vendedor</th><th className={th}>Tipo</th><th className={th}>Notas</th><th className={th}>Fecha</th><th className={th}>Estado</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {current.rows.map((r) => (
                <tr key={r.id}>
                  <td className={td}><p className="font-medium text-navy">{r.seller.fullName}</p><p className="text-xs text-slate-500">{r.seller.email}</p></td>
                  <td className={td}>{KIND[r.kind]}</td>
                  <td className={`${td} max-w-xs text-slate-600`}>{r.notes ?? "—"}</td>
                  <td className={`${td} whitespace-nowrap text-slate-600`}>{formatDate(r.createdAt.slice(0, 10))}</td>
                  <td className={td}>
                    <select value={r.status} onChange={(e) => void change(r.id, e.target.value as Status)} aria-label={`Estado de la solicitud de ${r.seller.fullName}`} className={`cursor-pointer rounded-full border-0 px-3 py-1 text-xs font-semibold ${STATUS[r.status].style}`}>
                      {(Object.keys(STATUS) as Status[]).map((s) => <option key={s} value={s}>{STATUS[s].label}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
