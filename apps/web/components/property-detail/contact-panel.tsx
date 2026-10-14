"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { INQUIRY_STATUS_LABEL, UNAVAILABLE_LABEL, type PropertyStatus } from "@cosave/shared";
import { useCurrentUser } from "@/lib/current-user";
import { fetchPropertyStatus, useMyInquiries } from "@/lib/inquiries";
import { ContactForm } from "./contact-form";

const date = (iso: string) => new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });

/**
 * Contenido de /contacto/[code] con sesión: si la publicación ya no está disponible bloquea el contacto nuevo (C05);
 * si no, muestra las consultas anteriores sobre esta propiedad (C06) y el formulario.
 */
export function ContactPanel({ code, title }: { code: string; title: string }) {
  const who = useCurrentUser();
  const { items, reload } = useMyInquiries(who, code);
  const [status, setStatus] = useState<PropertyStatus | null | undefined>(undefined);

  useEffect(() => {
    void fetchPropertyStatus(code).then(setStatus);
  }, [code]);

  if (status === undefined) return <p className="py-10 text-center text-sm text-slate-600">Cargando…</p>;

  if (status && status !== "published") {
    return (
      <div role="alert" className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <p className="mb-1 font-bold text-navy">Esta publicación ya no está disponible</p>
        <p className="mb-4 text-sm text-slate-600">
          {title} figura como {UNAVAILABLE_LABEL[status]?.toLowerCase() ?? "no disponible"}, por lo que no se pueden enviar nuevas consultas.
        </p>
        <Link href="/properties" className="inline-block rounded-md bg-accent px-5 py-2.5 font-semibold text-navy transition-colors hover:bg-accent-hover">
          Explorar propiedades
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {items.length > 0 && (
        <section aria-labelledby="prev-inquiries" className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 id="prev-inquiries" className="mb-3 text-lg font-bold text-navy">Tus consultas anteriores</h2>
          <ul className="space-y-3">
            {items.map((i) => (
              <li key={i.id} className="rounded-lg bg-slate-50 p-3 text-sm">
                <div className="mb-1 flex items-center justify-between gap-2 text-xs text-slate-500">
                  <span>{date(i.createdAt)}</span>
                  <span className="rounded-full bg-white px-2.5 py-0.5 font-semibold text-slate-600 ring-1 ring-slate-200">{INQUIRY_STATUS_LABEL[i.status]}</span>
                </div>
                <p className="text-slate-700">{i.message}</p>
                {i.status === "pending" && <p className="mt-1 text-xs text-slate-500">El anunciante aún no responde.</p>}
              </li>
            ))}
          </ul>
        </section>
      )}
      <ContactForm propertyCode={code} propertyTitle={title} variant="page" onSent={() => void reload()} />
    </div>
  );
}
