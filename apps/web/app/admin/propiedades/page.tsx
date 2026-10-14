"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { PROPERTY_STATUSES, type PropertyStatus } from "@cosave/shared";
import { PageHeader } from "@/components/admin/admin-shell";
import { ErrorNote, Loading, panel, td, th } from "@/components/admin/ui";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { StatusBadge } from "@/components/status-badge";
import { api, apiRaw } from "@/lib/api";
import { formatMxn } from "@/lib/mock-data";
import { formatDate } from "@/lib/mock-users";
import type { MyProperty } from "@/lib/my-properties";
import { showToast } from "@/lib/toast";

type Row = MyProperty & { owner: { fullName: string; email: string } };
type Dialog = { kind: "reject" | "archive"; row: Row } | null;

const PAGE = 15;
const field = "w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-navy focus:border-navy focus:outline-none focus:ring-2 focus:ring-accent/60";
const act = "cursor-pointer rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50";

function PropertiesTable() {
  const router = useRouter();
  const params = useSearchParams();
  const status = (PROPERTY_STATUSES as readonly string[]).includes(params.get("status") ?? "") ? (params.get("status") as PropertyStatus) : null;
  const urlQ = params.get("q") ?? "";
  const [text, setText] = useState(urlQ);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ key: string; rows: Row[]; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  // Búsqueda con pausa al escribir; la URL guarda estado y búsqueda para poder compartir el enlace.
  useEffect(() => {
    const t = setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (text.trim()) next.set("q", text.trim());
      else next.delete("q");
      if (next.toString() !== params.toString()) {
        setPage(1);
        router.replace(`/admin/propiedades${next.size ? `?${next}` : ""}`);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [text, params, router]);

  const key = `${status ?? "all"}|${urlQ}|${page}`;
  useEffect(() => {
    let alive = true;
    const qs = new URLSearchParams({ page: String(page), pageSize: String(PAGE) });
    if (status) qs.set("status", status);
    if (urlQ) qs.set("q", urlQ);
    apiRaw<{ data: Row[]; meta: { total: number } }>(`/admin/properties?${qs}`)
      .then((r) => alive && (setData({ key, rows: r.data, total: r.meta.total }), setError(null)))
      .catch((err) => alive && setError(err instanceof Error ? err.message : "No se pudieron cargar las propiedades"));
    return () => {
      alive = false;
    };
  }, [key, status, urlQ, page]);

  function setStatus(s: PropertyStatus | null) {
    setPage(1);
    const next = new URLSearchParams(params.toString());
    if (s) next.set("status", s);
    else next.delete("status");
    router.replace(`/admin/propiedades${next.size ? `?${next}` : ""}`);
  }

  async function run(row: Row, path: string, body: object, done: string) {
    setBusy(row.id);
    try {
      const updated = await api<MyProperty>(`/admin/properties/${row.id}/${path}`, { method: "POST", body: JSON.stringify(body) });
      // Fuera del filtro actual desaparece; si no, se actualiza en su lugar.
      setData((d) => d && { ...d, rows: d.rows.flatMap((r) => (r.id !== row.id ? r : status && updated.status !== status ? [] : [{ ...r, ...updated }])) });
      showToast(done);
      setDialog(null);
      setReason("");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "No se pudo completar la acción", "info");
    } finally {
      setBusy(null);
    }
  }

  const current = data && data.key === key ? data : null;
  const pages = current ? Math.max(1, Math.ceil(current.total / PAGE)) : 1;
  const chips: [PropertyStatus | null, string][] = [[null, "Todas"], ["pending", "Pendientes"], ["published", "Publicadas"], ["paused", "Pausadas"], ["rejected", "Rechazadas"], ["sold", "Vendidas"], ["rented", "Rentadas"], ["archived", "Retiradas"], ["draft", "Borradores"]];

  return (
    <>
      <PageHeader title="Propiedades" subtitle="Revisa publicaciones nuevas y administra las existentes." />
      <div className="flex flex-wrap items-center gap-3">
        <input type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder="Buscar por título, clave, ciudad o dueño…" aria-label="Buscar propiedades" className={`${field} max-w-sm bg-white`} />
        <div role="group" aria-label="Filtrar por estado" className="flex flex-wrap gap-2">
          {chips.map(([s, label]) => (
            <button
              key={label}
              type="button"
              aria-pressed={status === s}
              onClick={() => setStatus(s)}
              className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${status === s ? "bg-navy text-white" : "border border-slate-300 bg-white text-slate-700 hover:border-navy"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <ErrorNote message={error} />
      ) : !current ? (
        <Loading />
      ) : current.rows.length === 0 ? (
        <p className={`${panel} p-6 text-center text-sm text-slate-600`}>No hay propiedades con estos criterios.</p>
      ) : (
        <div className={`${panel} overflow-x-auto`}>
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200">
              <tr><th className={th}>Propiedad</th><th className={th}>Dueño</th><th className={th}>Precio</th><th className={th}>Estado</th><th className={th}>Acciones</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {current.rows.map((r) => (
                <tr key={r.id}>
                  <td className={td}>
                    <div className="flex items-center gap-3">
                      <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded bg-slate-100">
                        {r.images[0] && <Image src={r.images[0].url} alt="" fill sizes="64px" className="object-cover" />}
                      </div>
                      <div className="min-w-0">
                        <p className="max-w-[16rem] truncate font-semibold text-navy">{r.title || "Sin título"}</p>
                        <p className="text-xs text-slate-500">{r.code} · {[r.city, r.state].filter(Boolean).join(", ")} · {r.operation === "rent" ? "Renta" : "Venta"}</p>
                        {r.reviewNote && <p className="max-w-[16rem] truncate text-xs text-amber-700" title={r.reviewNote}>Nota: {r.reviewNote}</p>}
                      </div>
                    </div>
                  </td>
                  <td className={td}><p className="text-navy">{r.owner.fullName}</p><p className="text-xs text-slate-500">{r.owner.email}</p></td>
                  <td className={`${td} whitespace-nowrap`}>{formatMxn(r.price)}</td>
                  <td className={td}><StatusBadge status={r.status} /><p className="mt-1 text-xs text-slate-500">{formatDate((r.submittedAt ?? r.updatedAt).slice(0, 10))}</p></td>
                  <td className={td}>
                    <div className="flex flex-wrap gap-2">
                      {r.status === "pending" && (
                        <>
                          <button type="button" disabled={busy === r.id} onClick={() => void run(r, "review", { decision: "approve" }, `${r.code} publicada`)} className={`${act} border-transparent bg-accent text-navy hover:bg-accent-hover`}>Aprobar</button>
                          <button type="button" disabled={busy === r.id} onClick={() => setDialog({ kind: "reject", row: r })} className={`${act} border-slate-300 text-slate-700 hover:border-red-500 hover:text-red-600`}>Rechazar</button>
                        </>
                      )}
                      {(r.status === "published" || r.status === "paused") && (
                        <>
                          {r.status === "published" && <Link href={`/properties/${r.code}`} className={`${act} border-slate-300 text-slate-700 hover:border-navy hover:text-navy`}>Ver</Link>}
                          <button type="button" disabled={busy === r.id} onClick={() => setDialog({ kind: "archive", row: r })} className={`${act} border-slate-300 text-slate-700 hover:border-red-500 hover:text-red-600`}>Retirar</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {current && current.total > PAGE && (
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>{current.total} propiedades · página {page} de {pages}</span>
          <div className="flex gap-2">
            <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="cursor-pointer rounded-md border border-slate-300 bg-white px-3 py-1.5 font-semibold text-navy disabled:opacity-50">Anterior</button>
            <button type="button" disabled={page >= pages} onClick={() => setPage(page + 1)} className="cursor-pointer rounded-md border border-slate-300 bg-white px-3 py-1.5 font-semibold text-navy disabled:opacity-50">Siguiente</button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!dialog}
        title={dialog?.kind === "reject" ? "Rechazar publicación" : "Retirar publicación"}
        confirmLabel={dialog?.kind === "reject" ? "Rechazar" : "Retirar"}
        danger
        busy={!!busy}
        onConfirm={() => {
          if (!dialog) return;
          if (!reason.trim()) return showToast("Escribe el motivo", "info");
          void (dialog.kind === "reject"
            ? run(dialog.row, "review", { decision: "reject", note: reason.trim() }, `${dialog.row.code} rechazada`)
            : run(dialog.row, "archive", { note: reason.trim() }, `${dialog.row.code} retirada`));
        }}
        onClose={() => {
          setDialog(null);
          setReason("");
        }}
      >
        <p>{dialog?.kind === "reject" ? "El dueño verá este motivo y podrá corregir y volver a enviarla." : "Dejará de estar disponible y de recibir consultas. Se conserva su historial y el dueño recibirá el motivo."}</p>
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={500} aria-label="Motivo" placeholder="Escribe el motivo" className={field} />
      </ConfirmDialog>
    </>
  );
}

export default function AdminPropertiesPage() {
  return (
    <Suspense fallback={<Loading />}>
      <PropertiesTable />
    </Suspense>
  );
}
