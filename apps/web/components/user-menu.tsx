"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { useDismiss } from "@/lib/use-dismiss";

/** Menú del avatar en el header: ir al perfil o cerrar sesión. Se cierra con clic fuera o Esc. */
export function UserMenu({
  name,
  profileHref,
  extraLinks = [],
  onSignOut,
  children,
}: {
  name: string;
  profileHref: string;
  /** Enlaces adicionales entre «Perfil» y «Cerrar sesión» (p. ej. Mis propiedades, Panel de administración). */
  extraLinks?: { href: string; label: string }[];
  onSignOut: () => void;
  /** Avatar o iniciales que se muestran en el botón. */
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, close, box);

  const item = "flex w-full cursor-pointer items-center gap-2 px-4 py-2.5 text-left text-sm text-ink transition-colors hover:bg-slate-100";
  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Menú de ${name}`}
        title={name}
        className="cursor-pointer rounded-full transition-shadow hover:ring-2 hover:ring-azure focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure"
      >
        {children}
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-30 mt-2 w-52 overflow-hidden rounded-lg bg-white py-1 shadow-veil ring-1 ring-slate-200">
          <p className="truncate border-b border-slate-100 px-4 py-2 text-xs text-slate-500">{name}</p>
          <Link href={profileHref} role="menuitem" onClick={() => setOpen(false)} className={item}>
            Perfil
          </Link>
          {extraLinks.map((l) => (
            <Link key={l.href} href={l.href} role="menuitem" onClick={() => setOpen(false)} className={item}>
              {l.label}
            </Link>
          ))}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onSignOut();
            }}
            className={item}
          >
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
