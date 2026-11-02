"use client";

import Link from "next/link";
import { use } from "react";
import { INQUIRY_STATUS_LABEL, UNAVAILABLE_LABEL, type InquiryStatus } from "@cosave/shared";
import { loginUrl } from "@/lib/auth";
import { NoticeCard } from "@/components/notice-card";
import { ProfileIcon } from "@/components/user/profile-icons";
import { EmptyState, ErrorNote, Loading, ProfileSection, RowIcon } from "@/components/user/profile-section";
import { useCurrentUser } from "@/lib/current-user";
import { useMyInquiries, useReceivedInquiries, type InquiryItem } from "@/lib/inquiries";

const date = (iso: string) => new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
const badge = "rounded-full px-2.5 py-0.5 text-xs font-semibold";
const STATUS_TONE: Record<InquiryStatus, string> = {
  pending: "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200",
  answered: "bg-emerald-100 text-emerald-800",
};

function InquiryRow({ i, children }: { i: InquiryItem; children?: React.ReactNode }) {
  const off = i.property.status === "published" ? null : (UNAVAILABLE_LABEL[i.property.status] ?? "Retirada");
  return (
    <li className="card-surface card-hover flex gap-4 rounded-2xl p-5">
      <RowIcon name="chat" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <Link href={`/properties/${i.property.code}`} className="font-semibold text-ink transition-colors hover:text-azure-hover">
              {i.property.title}
            </Link>
            <p className="mt-0.5 text-xs text-slate-500">
              {i.property.code} · {date(i.createdAt)}
            </p>
          </div>
          <span className="flex flex-wrap gap-2">
            {off && <span className={`${badge} bg-slate-200 text-slate-600`}>{off}</span>}
            <span className={`${badge} ${STATUS_TONE[i.status]}`}>{INQUIRY_STATUS_LABEL[i.status]}</span>
          </span>
        </div>
        <p className="mt-3 whitespace-pre-line rounded-xl bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-700">{i.message}</p>
        {children}
      </div>
    </li>
  );
}

/** Consultas del usuario ("Me interesa") y, con cuenta real, las recibidas en sus propiedades. Solo el dueño de la sesión las ve. */
export default function OrdersPage({ params }: PageProps<"/profile/[id]/pedidos">) {
  const { id } = use(params);
  const me = useCurrentUser();
  const isOwner = me.id === id;
  const mine = useMyInquiries(isOwner ? me : { id: null, remote: false });
  const received = useReceivedInquiries(isOwner && me.remote);

  if (me.loading) return <p className="p-8 text-sm text-slate-600">Cargando…</p>;
  if (!me.id) return <NoticeCard title="Mis consultas" text="Inicia sesión para ver tus consultas." href={loginUrl(`/profile/${id}/pedidos`, "login")} cta="Iniciar sesión" />;
  if (!isOwner) {
    return <NoticeCard title="Sin acceso" text="Solo puedes ver tus propias consultas." href={`/profile/${me.id}/pedidos`} cta="Ir a mis consultas" />;
  }

  return (
    <ProfileSection title="Mis consultas" description="Las consultas que has enviado a anunciantes. Quedan pendientes hasta que respondan.">
      {!mine.ready ? (
        <Loading />
      ) : mine.error ? (
        <ErrorNote>No se pudieron cargar tus consultas. Inténtalo de nuevo más tarde.</ErrorNote>
      ) : mine.items.length === 0 ? (
        <EmptyState icon="chat" title="Aún no has enviado consultas" text="Cuando una propiedad te interese, escribe al anunciante desde su ficha y aquí verás el seguimiento." href="/properties" cta="Explorar propiedades" />
      ) : (
        <ul className="space-y-3">
          {mine.items.map((i) => (
            <InquiryRow key={i.id} i={i}>
              {i.status === "pending" && <p className="mt-2 text-xs text-slate-500">El anunciante aún no responde.</p>}
            </InquiryRow>
          ))}
        </ul>
      )}

      {received.length > 0 && (
        <section className="space-y-3 pt-4">
          <div className="flex items-center gap-2">
            <h2 className="headline-sm text-ink">Consultas recibidas</h2>
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-600">{received.length}</span>
          </div>
          <p className="text-sm text-slate-500">Personas interesadas en tus propiedades.</p>
          <ul className="space-y-3">
            {received.map((i) => (
              <InquiryRow key={i.id} i={i}>
                <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-slate-600">
                  <li className="flex items-center gap-1.5">
                    <ProfileIcon name="user" className="h-4 w-4 text-slate-400" />
                    {i.contactName}
                  </li>
                  <li className="flex items-center gap-1.5">
                    <ProfileIcon name="mail" className="h-4 w-4 text-slate-400" />
                    <a href={`mailto:${i.contactEmail}`} className="underline hover:text-ink">
                      {i.contactEmail}
                    </a>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <ProfileIcon name="phone" className="h-4 w-4 text-slate-400" />
                    {i.contactPhone}
                  </li>
                </ul>
              </InquiryRow>
            ))}
          </ul>
        </section>
      )}
    </ProfileSection>
  );
}
