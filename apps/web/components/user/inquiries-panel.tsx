"use client";

import { useEffect, useState } from "react";
import { INQUIRY_STATUS_LABEL } from "@cosave/shared";
import { api } from "@/lib/api";
import type { ReceivedInquiry } from "@/lib/inquiries";
import { formatDate } from "@/lib/mock-users";
import { showToast } from "@/lib/toast";

interface Row extends Omit<ReceivedInquiry, "property"> {
  property: { publicCode: string };
}

const link = "font-semibold text-navy underline transition-colors hover:text-accent-hover";

/** Consultas recibidas en una propiedad: datos de contacto compartidos y respuesta por correo, teléfono o WhatsApp. */
export function InquiriesPanel({ code }: { code: string }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    api<Row[]>("/inquiries/received")
      .then((all) => alive && setRows(all.filter((r) => r.property.publicCode === code)))
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [code]);

  async function markAnswered(id: string) {
    try {
      await api(`/inquiries/${id}`, { method: "PATCH", body: JSON.stringify({ status: "answered" }) });
      setRows((prev) => prev && prev.map((r) => (r.id === id ? { ...r, status: "answered" } : r)));
      showToast("Consulta marcada como respondida");
    } catch {
      showToast("No se pudo actualizar la consulta", "info");
    }
  }

  return (
    <div className="border-t border-slate-100 bg-slate-50 p-5">
      <h3 className="mb-3 text-sm font-bold text-navy">Consultas recibidas</h3>
      {error ? (
        <p role="alert" className="text-sm text-red-600">No se pudieron cargar las consultas.</p>
      ) : !rows ? (
        <p className="text-sm text-slate-600">Cargando…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-slate-600">Todavía nadie ha consultado esta propiedad.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => {
            const phone = r.contactPhone.replace(/\D/g, "");
            return (
              <li key={r.id} className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-navy">{r.contactName}</p>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${r.status === "answered" ? "bg-emerald-100 text-emerald-800" : "bg-accent/30 text-navy"}`}>
                    {INQUIRY_STATUS_LABEL[r.status]}
                  </span>
                </div>
                <p className="mt-1 whitespace-pre-line text-slate-700">{r.message}</p>
                <p className="mt-2 text-xs text-slate-500">{formatDate(r.createdAt.slice(0, 10))}</p>
                <div className="mt-2 flex flex-wrap gap-4 text-xs">
                  <a href={`mailto:${r.contactEmail}`} className={link}>Escribir a {r.contactEmail}</a>
                  <a href={`tel:+${phone}`} className={link}>Llamar {r.contactPhone}</a>
                  <a href={`https://wa.me/${phone}`} target="_blank" rel="noreferrer" className={link}>WhatsApp</a>
                  {r.status === "pending" && (
                    <button type="button" onClick={() => void markAnswered(r.id)} className="cursor-pointer font-semibold text-slate-600 underline hover:text-navy">
                      Marcar como respondida
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
