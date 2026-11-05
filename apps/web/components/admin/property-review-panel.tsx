"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { AMENITY_LABEL, MATERIAL_LABEL, PROPERTY_TYPE_LABEL } from "@cosave/shared";
import { StatusBadge } from "@/components/status-badge";
import { formatMxn } from "@/lib/mock-data";
import { formatDate } from "@/lib/mock-users";
import type { MyProperty } from "@/lib/my-properties";

/** Propiedad tal como la lista el panel: la vista completa del api más los datos del dueño. */
export type ReviewRow = MyProperty & { owner: { fullName: string; email: string } };

const day = (iso: string | null) => (iso ? formatDate(iso.slice(0, 10)) : "—");

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="label-sm text-slate-400">{title}</h3>
      {children}
    </section>
  );
}

function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="text-sm font-semibold text-ink">{value}</dd>
    </div>
  );
}

function Gallery({ images, title }: { images: ReviewRow["images"]; title: string }) {
  const [index, setIndex] = useState(0);
  if (images.length === 0) {
    return <p className="rounded-xl border border-dashed border-slate-300 py-10 text-center text-sm text-slate-500">Sin fotografías. No se puede aprobar sin fotos.</p>;
  }
  const current = images[Math.min(index, images.length - 1)]!;
  return (
    <div className="space-y-2">
      <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-slate-100">
        <Image src={current.url} alt={title} fill sizes="(min-width: 640px) 36rem, 100vw" className="object-cover" />
        <span className="label-sm absolute bottom-2 right-2 rounded-md bg-ink/70 px-2 py-1 text-white">{Math.min(index, images.length - 1) + 1} / {images.length}</span>
      </div>
      {images.length > 1 && (
        <ul className="grid grid-cols-5 gap-2">
          {images.map((img, i) => (
            <li key={img.id}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Ver foto ${i + 1}`}
                aria-current={i === index ? "true" : undefined}
                className={`relative block aspect-[4/3] w-full cursor-pointer overflow-hidden rounded-lg bg-slate-100 ring-2 transition-colors ${i === index ? "ring-azure" : "ring-transparent hover:ring-slate-300"}`}
              >
                <Image src={img.url} alt="" fill sizes="96px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Details({ row, busy, onApprove, onReject, onArchive }: Pick<Props, "busy" | "onApprove" | "onReject" | "onArchive"> & { row: ReviewRow }) {
  const place = [row.zone, row.city, row.state].filter(Boolean).join(", ");
  const facts: [string, ReactNode][] = [
    ["Tipo", PROPERTY_TYPE_LABEL[row.type]],
    ["Operación", row.operation === "rent" ? "Renta" : "Venta"],
    ...(row.builtAreaM2 ? ([["Construcción", `${row.builtAreaM2.toLocaleString("es-MX")} m²`]] as [string, ReactNode][]) : []),
    ...(row.landAreaM2 ? ([["Terreno", `${row.landAreaM2.toLocaleString("es-MX")} m²`]] as [string, ReactNode][]) : []),
    ...(row.bedrooms ? ([["Recámaras", row.bedrooms]] as [string, ReactNode][]) : []),
    ...(row.bathrooms ? ([["Baños", row.bathrooms]] as [string, ReactNode][]) : []),
    ...(row.parkingSpots ? ([["Estacionamientos", row.parkingSpots]] as [string, ReactNode][]) : []),
    ...(row.maintenanceFee ? ([["Mantenimiento", `${formatMxn(row.maintenanceFee)} /mes`]] as [string, ReactNode][]) : []),
  ];
  const amenities = row.amenities.map((a) => AMENITY_LABEL[a]).filter(Boolean);
  const materials = row.materials.map((m) => MATERIAL_LABEL[m]).filter(Boolean);
  const mapHref = row.latitude !== null && row.longitude !== null ? `https://www.openstreetmap.org/?mlat=${row.latitude}&mlon=${row.longitude}#map=17/${row.latitude}/${row.longitude}` : null;

  return (
    <>
      <div className="flex-1 space-y-6 overflow-y-auto p-6">
        <Gallery images={row.images} title={row.title || row.code} />

        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={row.status} />
            <span className="label-sm rounded-md bg-slate-100 px-2 py-1 text-slate-600">{row.code}</span>
          </div>
          <p className="metric-price text-ink">{formatMxn(row.price)} <span className="text-sm font-medium text-slate-500">MXN{row.operation === "rent" ? " /mes" : ""}</span></p>
        </div>

        {row.reviewNote && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <strong>Nota de revisión:</strong> {row.reviewNote}
          </p>
        )}

        <Section title="Datos del inmueble">
          <dl className="grid grid-cols-2 gap-2">{facts.map(([label, value]) => <Fact key={label} label={label} value={value} />)}</dl>
        </Section>

        <Section title="Descripción">
          {row.description ? (
            <p className="whitespace-pre-line text-sm leading-6 text-slate-700">{row.description}</p>
          ) : (
            <p className="text-sm text-slate-500">Sin descripción.</p>
          )}
        </Section>

        <Section title="Ubicación">
          <p className="text-sm text-slate-700">{place || "Sin ubicación"}</p>
          <p className="text-sm text-slate-500">
            {row.address ? `${row.address}` : "Sin dirección exacta"}
            {row.postalCode && ` · C.P. ${row.postalCode}`}
          </p>
          {mapHref && (
            <a href={mapHref} target="_blank" rel="noopener noreferrer" className="inline-block text-sm font-semibold text-azure transition-colors hover:text-azure-hover">
              Ver coordenadas en el mapa ↗
            </a>
          )}
        </Section>

        {(amenities.length > 0 || materials.length > 0) && (
          <Section title="Características">
            <ul className="flex flex-wrap gap-2">
              {[...amenities, ...materials].map((t) => (
                <li key={t} className="label-sm rounded-md bg-slate-100 px-2.5 py-1 text-slate-600">{t}</li>
              ))}
            </ul>
          </Section>
        )}

        <Section title="Dueño y fechas">
          <p className="text-sm font-semibold text-ink">{row.owner.fullName}</p>
          <p className="text-sm text-slate-500">{row.owner.email}</p>
          <p className="text-sm text-slate-500">
            Creada {day(row.createdAt)} · Enviada {day(row.submittedAt)} · Actualizada {day(row.updatedAt)}
          </p>
        </Section>
      </div>

      <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-white px-6 py-4">
        {row.status === "published" && <Link href={`/properties/${row.code}`} className="btn btn-outline px-4 py-2 text-sm">Ver ficha pública</Link>}
        {(row.status === "published" || row.status === "paused") && (
          <button type="button" disabled={busy} onClick={() => onArchive(row)} className="btn btn-outline px-4 py-2 text-sm">Retirar</button>
        )}
        {row.status === "pending" && (
          <>
            <button type="button" disabled={busy} onClick={() => onReject(row)} className="btn btn-outline px-4 py-2 text-sm">Rechazar</button>
            <button type="button" disabled={busy} onClick={() => onApprove(row)} className="btn btn-accent px-4 py-2 text-sm">Aprobar</button>
          </>
        )}
      </div>
    </>
  );
}

interface Props {
  row: ReviewRow | null;
  busy: boolean;
  onClose: () => void;
  onApprove: (row: ReviewRow) => void;
  onReject: (row: ReviewRow) => void;
  onArchive: (row: ReviewRow) => void;
}

/** Panel lateral con toda la publicación para revisarla (elemento <dialog> nativo: Esc cierra y el foco queda atrapado). */
export function PropertyReviewPanel({ row, busy, onClose, onApprove, onReject, onArchive }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (row && !d.open) d.showModal();
    if (!row && d.open) d.close();
  }, [row]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-label="Detalle de la publicación"
      onClick={(e) => e.target === ref.current && onClose()}
      className="ml-auto h-dvh max-h-none w-full max-w-xl bg-slate-50 p-0 shadow-veil backdrop:bg-ink/40 backdrop:backdrop-blur-sm"
    >
      {row && (
        <div className="flex h-full flex-col">
          <header className="flex items-start justify-between gap-3 border-b border-slate-200 bg-white px-6 py-4">
            <div className="min-w-0">
              <p className="label-sm text-slate-400">Revisión de publicación</p>
              <h2 className="headline-sm truncate text-ink">{row.title || "Sin título"}</h2>
            </div>
            <button type="button" onClick={onClose} aria-label="Cerrar" className="cursor-pointer rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-ink">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </header>
          <Details key={row.id} row={row} busy={busy} onApprove={onApprove} onReject={onReject} onArchive={onArchive} />
        </div>
      )}
    </dialog>
  );
}
