"use client";

import type { Session } from "@supabase/supabase-js";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense } from "react";
import { AuthLink } from "./auth-link";
import { SearchBox } from "./search-box";
import { NotificationsMenu } from "./notifications-menu";
import { UserMenu } from "./user-menu";
import { UserAvatar } from "@/components/user/user-avatar";
import { signOutAll, useSession } from "@/lib/auth";
import { useDemoUser } from "@/lib/demo-session";
import { useProfile } from "@/lib/use-profile";

const base = "rounded-lg px-3 py-2 text-sm font-medium transition-colors";
const idle = "text-slate-600 hover:bg-slate-100 hover:text-ink";
const icon = "grid h-9 w-9 place-items-center rounded-full text-slate-600 transition-colors hover:bg-slate-100 hover:text-ink";
const current = "bg-sky-50 text-azure hover:bg-sky-100";

/** Nombre para mostrar de una sesión de Supabase: nombre completo o, si no hay, el correo. */
function sessionName(session: Session | null) {
  const meta = session?.user.user_metadata as { full_name?: unknown } | undefined;
  return (typeof meta?.full_name === "string" && meta.full_name.trim()) || session?.user.email || "Mi cuenta";
}

function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const { session, loading } = useSession();
  const { user: demo, signOut } = useDemoUser();
  const { role } = useProfile();

  // Cierra todas las sesiones y vuelve a ser visitante (U09).
  async function logout() {
    await signOutAll(signOut);
    router.push("/home");
  }

  // En el perfil la barra se reduce a volver y, solo en el perfil propio, salir.
  if (pathname.startsWith("/profile/")) {
    const ownId = session?.user.id ?? demo?.id;
    const own = !!ownId && (pathname === `/profile/${ownId}` || pathname.startsWith(`/profile/${ownId}/`));
    return (
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3">
        <Link href="/home" className={`${base} ${idle}`}>
          ← Volver a Cosave
        </Link>
        {own && (
          <button
            type="button"
            onClick={logout}
            className={`${base} ${idle} flex cursor-pointer items-center gap-2`}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4" />
              <path d="M16 8l4 4-4 4M20 12H9" />
            </svg>
            Salir
          </button>
        )}
      </nav>
    );
  }

  const cls = (active: boolean) => `${base} ${active ? current : idle}`;

  return (
    <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-2 gap-y-2 px-4 py-3">
      <Link href="/home" className="mr-2 font-display text-xl font-bold tracking-tight text-ink">
        COSA<span className="text-azure">VE</span>
      </Link>

      <Link href="/home" aria-current={pathname === "/home" ? "page" : undefined} className={cls(pathname === "/home")}>
        Inicio
      </Link>
      <Link href="/properties" aria-current={pathname === "/properties" ? "page" : undefined} className={cls(pathname === "/properties")}>
        Ver propiedades
      </Link>
      <AuthLink href="/vender" aria-current={pathname === "/vender" ? "page" : undefined} className={cls(pathname === "/vender")}>
        Publicar propiedad
      </AuthLink>
      <Link
        href="/quienes-somos"
        aria-current={pathname === "/quienes-somos" ? "page" : undefined}
        className={cls(pathname === "/quienes-somos")}
      >
        ¿Quiénes somos?
      </Link>

      <SearchBox />

      {demo ? (
        <>
          <Link href={`/favorites/${demo.id}`} title="Favoritos" aria-label="Favoritos" className={icon}>
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden>
              <path d="M12 20.5s-7.5-4.6-9-9.3C2.1 8.2 4 5.5 6.9 5.5c1.9 0 3.5 1 5.1 3 1.6-2 3.2-3 5.1-3 2.9 0 4.8 2.7 3.9 5.7-1.5 4.7-9 9.3-9 9.3z" />
            </svg>
          </Link>
          <NotificationsMenu userId={demo.id} />
          <UserMenu name={demo.fullName} profileHref={`/profile/${demo.id}`} onSignOut={logout}>
            <UserAvatar userId={demo.id} name={demo.fullName} fallbackSrc={demo.avatar} size={36} />
          </UserMenu>
        </>
      ) : (
        !loading &&
        (session ? (
          <>
            <Link href={`/favorites/${session.user.id}`} title="Favoritos" aria-label="Favoritos" className={icon}>
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden>
                <path d="M12 20.5s-7.5-4.6-9-9.3C2.1 8.2 4 5.5 6.9 5.5c1.9 0 3.5 1 5.1 3 1.6-2 3.2-3 5.1-3 2.9 0 4.8 2.7 3.9 5.7-1.5 4.7-9 9.3-9 9.3z" />
              </svg>
            </Link>
            <NotificationsMenu userId={session.user.id} />
            <UserMenu
              name={sessionName(session)}
              profileHref={`/profile/${session.user.id}`}
              extraLinks={[
                { href: `/profile/${session.user.id}/publicados`, label: "Mis propiedades" },
                ...(role === "admin" ? [{ href: "/admin", label: "Panel de administración" }] : []),
              ]}
              onSignOut={logout}
            >
              <UserAvatar userId={session.user.id} name={sessionName(session)} size={36} />
            </UserMenu>
          </>
        ) : (
          <>
            <Link href="/login" aria-current={pathname === "/login" ? "page" : undefined} className={cls(pathname === "/login")}>
              Iniciar sesión
            </Link>
            <Link href="/registro" aria-current={pathname === "/registro" ? "page" : undefined} className={cls(pathname === "/registro")}>
              Registrarme
            </Link>
          </>
        ))
      )}
    </nav>
  );
}

export function SiteHeader() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <Suspense>
        <Nav />
      </Suspense>
    </header>
  );
}
