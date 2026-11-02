"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCurrentUser } from "@/lib/current-user";
import { ProfileIcon, type ProfileIconName } from "@/components/user/profile-icons";

/** `own`: solo el dueño del perfil la ve (favoritos, consultas y búsquedas guardadas son privados). */
const links = (id: string): { href: string; label: string; icon: ProfileIconName; own?: true }[] => [
  { href: `/profile/${id}`, label: "Perfil", icon: "user" },
  { href: `/favorites/${id}`, label: "Favoritos", icon: "heart", own: true },
  { href: `/profile/${id}/pedidos`, label: "Consultas", icon: "chat", own: true },
  { href: `/profile/${id}/busquedas`, label: "Mis búsquedas guardadas", icon: "search", own: true },
  { href: `/profile/${id}/publicados`, label: "Publicados", icon: "home" },
];

/** Barra lateral del perfil: 260px en escritorio; en móvil, fila horizontal con desplazamiento. */
export function ProfileSidebar({ userId }: { userId: string }) {
  const pathname = usePathname();
  const { id } = useCurrentUser();
  const isOwner = id === userId;
  return (
    <nav aria-label="Secciones del perfil" className="w-full shrink-0 border-b border-slate-200 bg-white md:min-h-full md:w-[260px] md:border-b-0 md:border-r">
      <p className="label-sm hidden px-7 pb-2 pt-7 text-slate-400 md:block">{isOwner ? "Mi cuenta" : "Perfil"}</p>
      <ul className="flex gap-1 overflow-x-auto p-3 md:flex-col md:overflow-visible md:px-4 md:pt-0">
        {links(userId).filter((l) => isOwner || !l.own).map((l) => {
          const active = pathname === l.href;
          return (
            <li key={l.href}>
              <Link
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`group flex items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  active ? "bg-slate-100 font-semibold text-ink" : "text-slate-600 hover:bg-slate-50 hover:text-ink"
                }`}
              >
                <span className={active ? "text-azure" : "text-slate-400 transition-colors group-hover:text-ink"}>
                  <ProfileIcon name={l.icon} />
                </span>
                {isOwner && l.label === "Publicados" ? "Mis propiedades" : l.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
