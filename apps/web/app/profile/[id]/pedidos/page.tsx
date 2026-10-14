"use client";

import Link from "next/link";
import { use } from "react";
import { INQUIRY_STATUS_LABEL, UNAVAILABLE_LABEL } from "@cosave/shared";
import { loginUrl } from "@/lib/auth";
import { NoticeCard } from "@/components/notice-card";
import { useCurrentUser } from "@/lib/current-user";
import { useMyInquiries, useReceivedInquiries, type InquiryItem } from "@/lib/inquiries";

const date = (iso: string) => new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
const badge = "rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600";

function InquiryRow({ i, children }: { i: InquiryItem; children?: React.ReactNode }) {
  const off = i.property.status === "published" ? null : (UNAVAILABLE_LABEL[i.property.status] ?? "Retirada");
  return (
    <li className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href={`/properties/${i.property.code}`} className="font-semibold text-navy transition-colors hover:text-accent-hover">
          {i.property.title}
        </Link>
        <span className="flex gap-2">
          {off && <span className={badge}>{off}</span>}
          <span className={badge}>{INQUIRY_STATUS_LABEL[i.status]}</span>
        </span>
      </div>
      <p className="mt-0.5 text-xs text-slate-500">{i.property.code} · {date(i.createdAt)}</p>
      <p className="mt-2 text-sm text-slate-700">{i.message}</p>
      {children}
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
    <main className="mx-auto max-w-4xl space-y-6 px-6 py-10">
      <header>
        <h1 className="text-[20px] font-semibold text-navy">Mis consultas</h1>
        <p className="mt-1 text-sm text-slate-600">Las consultas que has enviado a anunciantes. Quedan pendientes hasta que respondan.</p>
      </header>

      {!mine.ready ? (
        <p className="text-sm text-slate-600">Cargando…</p>
      ) : mine.error ? (
        <p role="alert" className="text-sm text-red-600">No se pudieron cargar tus consultas. Inténtalo de nuevo más tarde.</p>
      ) : mine.items.length === 0 ? (
        <div className="py-10 text-center">
          <p className="mb-4 text-sm text-slate-600">Aún no has enviado consultas.</p>
          <Link href="/properties" className="inline-block rounded-md bg-accent px-5 py-2.5 font-semibold text-navy transition-colors hover:bg-accent-hover">
            Explorar propiedades
          </Link>
        </div>
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
          <h2 className="text-[17px] font-semibold text-navy">Consultas recibidas</h2>
          <ul className="space-y-3">
            {received.map((i) => (
              <InquiryRow key={i.id} i={i}>
                <p className="mt-2 text-xs text-slate-500">
                  {i.contactName} · <a href={`mailto:${i.contactEmail}`} className="underline">{i.contactEmail}</a> · {i.contactPhone}
                </p>
              </InquiryRow>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
