"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { allowedTransitions, editScope, PROPERTY_STATUS_LABEL, type PropertyStatus } from "@cosave/shared";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { STATUS_STYLE } from "@/components/status-badge";
import { NoticeCard } from "@/components/notice-card";
import { InquiriesPanel } from "@/components/user/inquiries-panel";
import { ApiError } from "@/lib/api";
import { loginUrl } from "@/lib/auth";
import { useCurrentUser } from "@/lib/current-user";
import { formatMxn } from "@/lib/mock-data";
import { formatDate } from "@/lib/mock-users";
import { mineApi, useMyProperties, type MyProperty } from "@/lib/my-properties";
import { showToast } from "@/lib/toast";

const TYPE_LABEL = { house: "Casa", apartment: "Departamento", land: "Terreno", commercial: "Local / bodega comercial", other: "Otro" } as const;

const btn = "cursor-pointer rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-navy hover:text-navy disabled:cursor-not-allowed disabled:opacity-50";
const btnPrimary = "cursor-pointer rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-navy transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50";

type Action = { label: string; to: PropertyStatus; tone?: "danger"; confirm?: string };

/** Acciones de estado que ofrece la tarjeta; salen de las mismas reglas que valida el api. */
function actionsFor(p: MyProperty): Action[] {
  const out: Action[] = [];
  for (const to of allowedTransitions(p.status, "owner", p.operation)) {
    if (to === "pending") continue; // se envía desde el formulario (con vista previa)
    if (to === "draft") out.push({ label: "Regresar a borrador", to });
    else if (to === "paused") out.push({ label: "Pausar", to });
    else if (to === "published") out.push({ label: "Reactivar", to });
    else if (to === "sold") out.push({ label: "Marcar como vendida", to, confirm: "Dejará de aparecer entre las disponibles y no recibirá más consultas. Conservamos su registro." });
    else if (to === "rented") out.push({ label: "Marcar como rentada", to, confirm: "Dejará de aparecer entre las disponibles y no recibirá más consultas. Conservamos su registro." });
    else if (to === "archived") out.push({ label: "Retirar", to, tone: "danger", confirm: "La publicación dejará de estar disponible y de recibir consultas. Conservamos su historial; esta acción no se puede deshacer." });
  }
  return out;
}

function Card({ p, onUpdate }: { p: MyProperty; onUpdate: (next: MyProperty) => void }) {
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<Action | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showInquiries, setShowInquiries] = useState(false);
  const actions = actionsFor(p);
  const scope = editScope(p.status);
  const cover = p.images[0]?.url;
  const isRent = p.operation === "rent";

  async function run(a: Action) {
    setBusy(true);
    setError(null);
    try {
      onUpdate(await mineApi.setStatus(p.id, a.to));
      showToast(`Propiedad: ${PROPERTY_STATUS_LABEL[a.to].toLowerCase()}`);
      setConfirm(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo completar la acción");
      setConfirm(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col sm:flex-row">
        <div className="relative aspect-[4/3] bg-slate-100 sm:aspect-auto sm:w-56 sm:shrink-0">
          {cover ? (
            <Image src={cover} alt={p.title || "Propiedad"} fill sizes="(min-width: 640px) 224px, 100vw" className={`object-cover ${p.status === "archived" ? "opacity-60 grayscale" : ""}`} />
          ) : (
            <span className="absolute inset-0 grid place-items-center text-xs text-slate-500">Sin fotos</span>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-2 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-bold text-navy">{p.title || "Borrador sin título"}</h2>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[p.status]}`}>{PROPERTY_STATUS_LABEL[p.status]}</span>
          </div>
          <p className="text-lg font-bold text-navy">
            {p.price > 0 ? formatMxn(p.price) : "Sin precio"}
            {isRent && p.price > 0 && <span className="text-sm font-normal text-slate-600"> /mes</span>}
          </p>
          <p className="text-sm text-slate-600">
            {TYPE_LABEL[p.type]} en {isRent ? "renta" : "venta"}
            {(p.city || p.zone) && ` · ${[p.zone, p.city].filter(Boolean).join(", ")}`}
          </p>
          <p className="text-xs text-slate-500">
            {p.code} · actualizada el {formatDate(p.updatedAt.slice(0, 10))}
          </p>
          {p.status === "rejected" && p.reviewNote && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">Motivo del rechazo: {p.reviewNote}</p>}
          {p.status === "pending" && <p className="text-sm text-slate-600">En revisión: no se puede editar hasta que sea aprobada o regreses a borrador.</p>}
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

          <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
            {scope !== "locked" ? (
              <Link href={`/vender/${p.id}`} className={btnPrimary}>
                {p.status === "draft" || p.status === "rejected" ? "Continuar / enviar" : "Editar"}
              </Link>
            ) : (
              <Link href={`/vender/${p.id}`} className={btn}>Ver</Link>
            )}
            {p.status === "published" && <Link href={`/properties/${p.code}`} className={btn}>Ver publicación</Link>}
            {actions.map((a) => (
              <button
                key={a.to}
                type="button"
                disabled={busy}
                onClick={() => (a.confirm ? setConfirm(a) : void run(a))}
                className={`${btn} ${a.tone === "danger" ? "hover:border-red-500 hover:text-red-600" : ""}`}
              >
                {a.label}
              </button>
            ))}
            {p.status !== "draft" && (
              <button type="button" onClick={() => setShowInquiries((s) => !s)} aria-expanded={showInquiries} className={btn}>
                Consultas{p.pendingInquiries ? ` (${p.pendingInquiries} nuevas)` : ""}
              </button>
            )}
          </div>
        </div>
      </div>
      {showInquiries && <InquiriesPanel code={p.code} />}
      <ConfirmDialog
        open={!!confirm}
        title={confirm?.label ?? ""}
        confirmLabel={confirm?.label ?? "Confirmar"}
        danger={confirm?.tone === "danger"}
        busy={busy}
        onConfirm={() => confirm && void run(confirm)}
        onClose={() => setConfirm(null)}
      >
        <p>{confirm?.confirm}</p>
      </ConfirmDialog>
    </li>
  );
}

/** «Mis propiedades» de una cuenta real: todos los estados, con las acciones que corresponden a cada uno. */
export function AccountListings({ id }: { id: string }) {
  const me = useCurrentUser();
  const isOwner = me.id === id && me.remote;
  const { items, error, replace } = useMyProperties(isOwner);
  const sorted = useMemo(() => items ?? [], [items]);

  if (me.loading) return <p className="p-8 text-sm text-slate-600">Cargando…</p>;
  if (!me.id) return <NoticeCard title="Mis propiedades" text="Inicia sesión para ver tus propiedades." href={loginUrl(`/profile/${id}/publicados`, "login")} cta="Iniciar sesión" />;
  if (!isOwner) return <NoticeCard title="Perfil no disponible" text="Este perfil no existe o no es público." href={`/profile/${me.id}`} cta="Ir a mi perfil" />;
  if (error) return <p role="alert" className="p-8 text-sm text-red-600">{error}</p>;
  if (!items) return <p className="p-8 text-sm text-slate-600">Cargando…</p>;

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-6 py-10">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-semibold text-navy">Mis propiedades</h1>
          <p className="mt-1 text-sm text-slate-600">
            {sorted.length === 0 ? "Aún no has publicado propiedades." : `${sorted.length} ${sorted.length === 1 ? "propiedad" : "propiedades"}.`}
          </p>
        </div>
        {sorted.length > 0 && (
          <Link href="/vender" className="rounded-md bg-accent px-4 py-2 text-[0.9rem] font-semibold text-navy transition-colors hover:bg-accent-hover">
            Publicar propiedad
          </Link>
        )}
      </header>
      {sorted.length === 0 ? (
        <div className="py-10 text-center">
          <Link href="/vender" className="inline-block rounded-md bg-accent px-5 py-2.5 font-semibold text-navy transition-colors hover:bg-accent-hover">
            Quiero vender o rentar mi propiedad
          </Link>
        </div>
      ) : (
        <ul className="space-y-4">
          {sorted.map((p) => (
            <Card key={p.id} p={p} onUpdate={replace} />
          ))}
        </ul>
      )}
    </main>
  );
}
