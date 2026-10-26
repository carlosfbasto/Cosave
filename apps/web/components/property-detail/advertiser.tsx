import Link from "next/link";
import { RoleBadge } from "@/components/user/avatar";
import { WantItButton } from "@/components/want-it-button";
import { formatDate, type MockUser } from "@/lib/mock-users";

const verifiedIcon = (
  <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-azure" fill="currentColor" aria-label="Verificado">
    <path d="M12 2l2.4 1.8 3-.2.9 2.9 2.5 1.7-1 2.8 1 2.8-2.5 1.7-.9 2.9-3-.2L12 22l-2.4-1.8-3 .2-.9-2.9-2.5-1.7 1-2.8-1-2.8 2.5-1.7.9-2.9 3 .2L12 2z" />
    <path d="M8.5 12.5l2.3 2.3 4.7-4.8" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/**
 * Panel lateral de la ficha: datos PÚBLICOS del anunciante (sin correo ni teléfono)
 * y "Me interesa", que abre el formulario de contacto.
 */
export function Advertiser({
  user,
  listed,
  name,
  memberSince,
  property,
  unavailable,
}: {
  user?: MockUser;
  listed: number;
  name?: string;
  memberSince?: string;
  property: { code: string; title: string };
  unavailable: string | null;
}) {
  const display = user?.fullName ?? name ?? "COSAVE";
  const initials = display.split(" ").slice(0, 2).map((w) => w[0]).join("");
  return (
    <section aria-label="Anunciante" className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-glow">
      <div className="flex items-center gap-4">
        <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-ink font-display text-xl font-bold text-white">{initials}</span>
        <div className="min-w-0 flex-1">
          <p className="label-sm text-slate-500">Anunciante</p>
          <p className="flex items-center gap-1.5">
            <span className="headline-sm truncate text-ink">{display}</span>
            {user?.verified && verifiedIcon}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {user ? <RoleBadge role={user.role} /> : name ? null : <span className="text-xs text-slate-500">Publicación de la plataforma</span>}
          </div>
        </div>
      </div>

      {(user || memberSince) && (
        <dl className="grid gap-2 rounded-xl bg-slate-50 p-4 text-sm">
          {user?.agent?.company && (
            <div className="flex justify-between gap-3"><dt className="text-slate-500">Empresa</dt><dd className="text-right font-medium text-ink">{user.agent.company}</dd></div>
          )}
          {user && (
            <div className="flex justify-between gap-3"><dt className="text-slate-500">Ciudad</dt><dd className="text-right font-medium text-ink">{user.city}</dd></div>
          )}
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500">Miembro desde</dt>
            <dd className="text-right font-medium text-ink">{formatDate(user ? user.joinedAt : memberSince!.slice(0, 10))}</dd>
          </div>
          {user && (
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Publicaciones</dt>
              <dd className="text-right font-medium text-ink">{listed} {listed === 1 ? "propiedad" : "propiedades"}</dd>
            </div>
          )}
        </dl>
      )}

      {unavailable ? (
        <p role="status" className="rounded-xl bg-slate-100 p-4 text-sm font-semibold text-ink">
          Esta propiedad ya no está disponible ({unavailable.toLowerCase()}).
        </p>
      ) : (
        <div className="grid [&>button]:w-full [&>button]:py-3">
          <WantItButton code={property.code} title={property.title} />
        </div>
      )}

      {user && (
        <Link href={`/profile/${user.id}`} className="btn btn-outline px-4 py-2.5 text-sm">
          Ver perfil del anunciante
        </Link>
      )}
    </section>
  );
}
