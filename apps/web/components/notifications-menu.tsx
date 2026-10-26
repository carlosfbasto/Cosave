"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { useNotifications } from "@/lib/notifications";
import { formatDate } from "@/lib/mock-users";
import { useDismiss } from "@/lib/use-dismiss";

const iconCls = "grid h-9 w-9 place-items-center rounded-full text-slate-600 transition-colors hover:bg-slate-100 hover:text-ink";

const Bell = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M6 16.5V11a6 6 0 1 1 12 0v5.5l1.5 2h-15l1.5-2z" />
    <path d="M10 21h4" />
  </svg>
);

/**
 * Campana del header. En móvil lleva a la página de notificaciones;
 * en computadora abre un panel con las últimas y un botón "Ver todas".
 */
export function NotificationsMenu({ userId }: { userId: string }) {
  const { items, unread, markRead } = useNotifications(userId);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, close, box);

  const label = unread > 0 ? `Notificaciones (${unread} sin leer)` : "Notificaciones";
  const badge = unread > 0 && (
    <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-azure px-1 text-[0.65rem] font-bold text-white">
      {unread}
    </span>
  );
  const allHref = `/notifications/${userId}`;

  return (
    <div ref={box} className="relative">
      {/* Móvil: directo a la página */}
      <Link href={allHref} title="Notificaciones" aria-label={label} className={`${iconCls} relative md:hidden`}>
        <Bell />
        {badge}
      </Link>

      {/* Computadora: panel desplegable */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Notificaciones"
        aria-label={label}
        className={`${iconCls} relative hidden cursor-pointer md:grid`}
      >
        <Bell />
        {badge}
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-30 mt-2 hidden w-80 overflow-hidden rounded-lg bg-white shadow-veil ring-1 ring-slate-200 md:block">
          <p className="border-b border-slate-100 px-4 py-2.5 text-sm font-bold text-ink">
            Notificaciones{unread > 0 && <span className="ml-2 text-xs font-normal text-slate-500">{unread} sin leer</span>}
          </p>
          {items.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-slate-600">Por el momento no tienes notificaciones.</p>
          ) : (
            <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
              {items.slice(0, 5).map((n) => (
                <li key={n.id}>
                  <Link
                    href={n.propertyCode ? `/properties/${n.propertyCode}` : allHref}
                    role="menuitem"
                    onClick={() => {
                      markRead(n.id);
                      setOpen(false);
                    }}
                    className="flex gap-3 px-4 py-3 transition-colors hover:bg-slate-100"
                  >
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? "bg-transparent" : "bg-azure"}`} aria-label={n.read ? "Leída" : "Sin leer"} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-ink">{n.title}</span>
                      <span className="line-clamp-2 text-xs text-slate-600">{n.body}</span>
                      <span className="mt-0.5 block text-[0.7rem] text-slate-500">{formatDate(n.createdAt)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link
            href={allHref}
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block border-t border-slate-100 px-4 py-3 text-center text-sm font-semibold text-ink transition-colors hover:bg-slate-100"
          >
            Ver todas las notificaciones
          </Link>
        </div>
      )}
    </div>
  );
}
