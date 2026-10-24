"use client";

import Link from "next/link";
import { use } from "react";
import { loginUrl } from "@/lib/auth";
import { BackButton } from "@/components/back-button";
import { NoticeCard } from "@/components/notice-card";
import { useCurrentUser } from "@/lib/current-user";
import { formatDate } from "@/lib/mock-users";
import { useNotifications } from "@/lib/notifications";
import { showToast } from "@/lib/toast";

/** Notificaciones de un usuario. Solo el dueño de la sesión puede verlas y modificarlas. */
export default function NotificationsPage({ params }: PageProps<"/notifications/[id]">) {
  const { id } = use(params);
  const user = useCurrentUser();
  const isOwner = user.id === id;
  const notes = useNotifications(isOwner ? id : null);

  if (user.loading) return <p className="p-8 text-sm text-slate-600">Cargando…</p>;
  if (!user.id) return <NoticeCard title="Notificaciones" text="Inicia sesión para ver tus notificaciones." href={loginUrl(`/notifications/${id}`, "login")} cta="Iniciar sesión" />;
  if (!isOwner) {
    return <NoticeCard title="Sin acceso" text="Solo puedes ver tus propias notificaciones." href={`/notifications/${user.id}`} cta="Ir a mis notificaciones" />;
  }

  return (
    <main className="flex-1 bg-slate-50">
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <BackButton className="font-medium text-ink transition-colors hover:text-azure-hover" />
          <Link href={`/profile/${user.id}`} className="text-slate-500 transition-colors hover:text-ink">Mi perfil</Link>
        </div>
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-ink">Notificaciones</h1>
            <p className="mt-1 text-sm text-slate-600">
              {notes.items.length === 0 ? "Por el momento no tienes notificaciones." : notes.unread === 0 ? "Estás al día." : `${notes.unread} sin leer.`}
            </p>
          </div>
          {notes.unread > 0 && (
            <button
              type="button"
              onClick={() => {
                notes.markAllRead();
                showToast("Todas marcadas como leídas");
              }}
              className="cursor-pointer text-sm font-semibold text-ink underline transition-colors hover:text-azure-hover"
            >
              Marcar todas como leídas
            </button>
          )}
        </header>

        <ul className="space-y-3">
          {notes.items.map((n) => (
            <li
              key={n.id}
              className={`flex gap-4 rounded-xl border p-4 ${n.read ? "border-slate-200 bg-white" : "border-azure/60 bg-azure/10"}`}
            >
              <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${n.read ? "bg-transparent" : "bg-azure"}`} aria-label={n.read ? "Leída" : "Sin leer"} />
              <div className="min-w-0 flex-1">
                <h2 className="font-bold text-ink">{n.title}</h2>
                <p className="mt-0.5 text-sm text-slate-600">{n.body}</p>
                <p className="mt-1 text-xs text-slate-500">{formatDate(n.createdAt)}</p>
                <div className="mt-3 flex flex-wrap gap-3 text-sm">
                  {n.propertyCode && (
                    <Link
                      href={`/properties/${n.propertyCode}`}
                      onClick={() => notes.markRead(n.id)}
                      className="rounded-lg bg-ink px-3 py-1.5 font-semibold text-white transition-colors hover:bg-ink-hover"
                    >
                      Ver propiedad
                    </Link>
                  )}
                  {!n.read && (
                    <button type="button" onClick={() => notes.markRead(n.id)} className="cursor-pointer font-medium text-slate-600 underline hover:text-ink">
                      Marcar como leída
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      notes.remove(n.id);
                      showToast("Se eliminó la notificación");
                    }}
                    className="cursor-pointer font-medium text-slate-600 underline hover:text-red-600"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
