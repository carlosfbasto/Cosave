"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCurrentUser } from "@/lib/current-user";

const icon = { viewBox: "0 0 24 24", className: "h-[18px] w-[18px] shrink-0", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;

/** `own`: solo el dueño del perfil la ve (favoritos, consultas y búsquedas guardadas son privados). */
const links = (id: string) => [
  {
    href: `/profile/${id}`,
    label: "Perfil",
    icon: (
      <svg {...icon}>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
      </svg>
    ),
  },
  {
    href: `/favorites/${id}`,
    label: "Favoritos", own: true,
    icon: (
      <svg {...icon}>
        <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
      </svg>
    ),
  },
  {
    href: `/profile/${id}/pedidos`,
    label: "Consultas", own: true,
    icon: (
      <svg {...icon}>
        <path d="M6 7h13l-1.5 8H8L6 4H3" />
        <circle cx="9" cy="19" r="1.2" />
        <circle cx="17" cy="19" r="1.2" />
      </svg>
    ),
  },
  {
    href: `/profile/${id}/busquedas`,
    label: "Mis búsquedas guardadas", own: true,
    icon: (
      <svg {...icon}>
        <circle cx="11" cy="11" r="6" />
        <path d="M20 20l-4.5-4.5" />
      </svg>
    ),
  },
  {
    href: `/profile/${id}/publicados`,
    label: "Publicados",
    icon: (
      <svg {...icon}>
        <path d="M4 11l8-7 8 7v9H4z" />
        <path d="M10 20v-6h4v6" />
      </svg>
    ),
  },
];

/** Barra lateral del perfil: 260px, enlaces de 13px en #666 con icono al inicio. */
export function ProfileSidebar({ userId }: { userId: string }) {
  const pathname = usePathname();
  const { id } = useCurrentUser();
  const isOwner = id === userId;
  return (
    <nav aria-label="Secciones del perfil" className="w-full shrink-0 border-b border-slate-200 bg-white md:min-h-full md:w-[260px] md:border-b-0 md:border-r">
      <ul className="flex gap-1 overflow-x-auto p-3 md:flex-col md:overflow-visible md:p-4">
        {links(userId).filter((l) => isOwner || !("own" in l)).map((l) => {
          const active = pathname === l.href;
          return (
            <li key={l.href}>
              <Link
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2.5 text-[13px] text-slate-500 transition-colors hover:bg-slate-100 ${active ? "bg-slate-100 font-semibold" : ""}`}
              >
                {l.icon}
                {isOwner && l.label === "Publicados" ? "Mis propiedades" : l.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
