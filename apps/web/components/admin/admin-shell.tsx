"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { signOutAll } from "@/lib/auth";
import { useDemoUser } from "@/lib/demo-session";
import type { Profile } from "@/lib/api";

const ic = { viewBox: "0 0 24 24", className: "h-[18px] w-[18px] shrink-0", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;

const NAV = [
  { href: "/admin", label: "Resumen", icon: <svg {...ic}><rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" /></svg> },
  { href: "/admin/propiedades", label: "Propiedades", icon: <svg {...ic}><path d="M4 11l8-7 8 7v9H4z" /><path d="M10 20v-6h4v6" /></svg> },
  { href: "/admin/usuarios", label: "Usuarios", icon: <svg {...ic}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.5 3-5.5 6.5-5.5s6.5 2 6.5 5.5" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c2 .7 3.5 2.3 3.5 5.2" /></svg> },
  { href: "/admin/solicitudes", label: "Solicitudes", icon: <svg {...ic}><path d="M4 5h16v11H8l-4 4z" /><path d="M8 9h8M8 12h5" /></svg> },
  { href: "/admin/reportes", label: "Reportes", icon: <svg {...ic}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg> },
  { href: "/admin/configuracion", label: "Configuración", icon: <svg {...ic}><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1" /></svg> },
] as const;

function Sidebar({ profile, onNavigate }: { profile: Profile; onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useDemoUser();
  const item = "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors";

  return (
    <div className="flex h-full flex-col bg-navy text-white">
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent text-navy">
          <svg {...ic} className="h-5 w-5" strokeWidth={2}><path d="M4 11l8-7 8 7v9H4z" /><path d="M10 20v-6h4v6" /></svg>
        </span>
        <div className="min-w-0">
          <p className="text-lg font-bold leading-tight tracking-wide">COSA<span className="text-accent">VE</span></p>
          <p className="text-xs text-white/70">Administración</p>
        </div>
        <span className="ml-auto rounded bg-accent px-2 py-0.5 text-[0.65rem] font-bold tracking-wider text-navy">ADMIN</span>
      </div>

      <nav aria-label="Menú principal" className="flex-1 overflow-y-auto px-3 py-4">
        <p className="mb-2 px-3 text-[0.7rem] font-semibold uppercase tracking-wider text-white/50">Menú principal</p>
        <ul className="space-y-1">
          {NAV.map((n) => {
            const active = n.href === "/admin" ? pathname === "/admin" : pathname.startsWith(n.href);
            return (
              <li key={n.href}>
                <Link
                  href={n.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={`${item} ${active ? "bg-white/15 font-semibold text-accent" : "text-white/80 hover:bg-white/10 hover:text-white"}`}
                >
                  {n.icon}
                  {n.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="space-y-1 border-t border-white/10 px-3 py-4">
        <p className="truncate px-3 text-xs text-white/60" title={profile.email}>{profile.fullName}</p>
        <Link href="/home" className={`${item} text-white/80 hover:bg-white/10 hover:text-white`}>← Ver sitio público</Link>
        <button
          type="button"
          onClick={async () => {
            await signOutAll(signOut);
            router.push("/home");
          }}
          className={`${item} cursor-pointer text-white/80 hover:bg-white/10 hover:text-white`}
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}

/** Marco del panel: menú lateral fijo en escritorio y cajón en móvil. */
export function AdminShell({ profile, children }: { profile: Profile; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-1 bg-slate-100">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 md:block">
        <Sidebar profile={profile} />
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button type="button" aria-label="Cerrar menú" onClick={() => setOpen(false)} className="absolute inset-0 cursor-default bg-navy/50" />
          <aside className="absolute inset-y-0 left-0 w-64 shadow-2xl">
            <Sidebar profile={profile} onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 md:hidden">
          <button type="button" onClick={() => setOpen(true)} aria-label="Abrir menú" className="cursor-pointer rounded-md p-1.5 text-navy hover:bg-slate-100">
            <svg {...ic} className="h-6 w-6"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
          </button>
          <span className="font-bold text-navy">COSA<span className="text-accent">VE</span> · Administración</span>
        </div>
        <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-8">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}
