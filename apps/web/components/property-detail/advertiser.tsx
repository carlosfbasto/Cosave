import Link from "next/link";
import { RoleBadge } from "@/components/user/avatar";
import { formatDate, type MockUser } from "@/lib/mock-users";

/** Datos PÚBLICOS del anunciante: sin correo ni teléfono (el contacto va por el formulario). */
export function Advertiser({ user, listed, name, memberSince }: { user?: MockUser; listed: number; name?: string; memberSince?: string }) {
  const display = user?.fullName ?? name ?? "COSAVE";
  const initials = display.split(" ").slice(0, 2).map((w) => w[0]).join("");
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-bold text-navy">Anunciante</h2>
      <div className="flex items-center gap-4">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-navy text-lg font-bold text-white">{initials}</span>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-navy">{display}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {user ? <RoleBadge role={user.role} /> : name ? null : <span className="text-xs text-slate-500">Publicación de la plataforma</span>}
            {user?.verified && <span className="text-xs font-semibold text-emerald-700">✓ Verificado</span>}
          </div>
          {!user && memberSince && <p className="mt-1 text-sm text-slate-600">Miembro desde {formatDate(memberSince.slice(0, 10))}</p>}
          {user && (
            <p className="mt-2 text-sm text-slate-600">
              {user.agent?.company && <>{user.agent.company} · </>}
              {user.city} · Miembro desde {formatDate(user.joinedAt)} · {listed} {listed === 1 ? "propiedad" : "propiedades"}
            </p>
          )}
        </div>
        {user && (
          <Link href={`/profile/${user.id}`} className="shrink-0 text-sm font-semibold text-navy underline transition-colors hover:text-accent-hover">
            Ver perfil
          </Link>
        )}
      </div>
    </section>
  );
}
