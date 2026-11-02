"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { use } from "react";
import { loginUrl } from "@/lib/auth";
import { BackButton } from "@/components/back-button";
import { FavoriteButton } from "@/components/favorite-button";
import { NoticeCard } from "@/components/notice-card";
import { PropertyRowCard, statsOf } from "@/components/properties/property-row-card";
import { StatIcon } from "@/components/property-icons";
import { EmptyState, ProfileSection } from "@/components/user/profile-section";
import { ProfileIcon } from "@/components/user/profile-icons";
import { useCurrentUser } from "@/lib/current-user";
import { useFavorites } from "@/lib/favorites";
import { formatMxn } from "@/lib/mock-data";
import { useProperties } from "@/lib/use-catalog";
import { UNAVAILABLE_LABEL } from "@cosave/shared";

type View = "grid" | "list";

/** Mismo selector segmentado que el de `/properties`. */
const views: { view: View; label: string; icon: string }[] = [
  { view: "grid", label: "Cuadrícula", icon: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" },
  { view: "list", label: "Lista", icon: "M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" },
];
const segment = "flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-[0.85rem] font-medium transition-colors";
const segmentOn = "bg-white text-ink shadow-sm ring-1 ring-slate-200";
const segmentOff = "text-slate-600 hover:text-ink";

/** Favoritos de un usuario. Solo el dueño de la sesión puede ver y modificar su lista. */
export default function FavoritesPage({ params }: PageProps<"/favorites/[id]">) {
  const { id } = use(params);
  const router = useRouter();
  const pathname = usePathname();
  // La vista vive en la URL (`?vista=lista`), como en /properties; la cuadrícula es la predeterminada.
  const view: View = useSearchParams().get("vista") === "lista" ? "list" : "grid";
  const { id: meId, loading } = useCurrentUser();
  const isOwner = meId === id;
  const favs = useFavorites(isOwner ? id : null);
  const props = useProperties(favs.codes);

  if (loading || (isOwner && (!favs.ready || !props.ready))) return <p className="flex-1 p-8 text-sm text-slate-600">Cargando…</p>;
  if (!meId) {
    return <NoticeCard title="Mis favoritos" text="Inicia sesión para ver tus favoritos." href={loginUrl(`/favorites/${id}`, "login")} cta="Iniciar sesión" />;
  }
  if (!isOwner) {
    return <NoticeCard title="Sin acceso" text="Solo puedes ver y modificar tus propios favoritos." href={`/favorites/${meId}`} cta="Ir a mis favoritos" />;
  }

  const items = props.items;
  const unavailableOf = (code: string) => {
    // F05: si ya no está publicada se indica por qué (vendida, rentada, pausada o retirada).
    const status = favs.statusOf(code);
    return status === "published" ? null : (UNAVAILABLE_LABEL[status] ?? "Retirada");
  };

  return (
    <ProfileSection
      wide
      before={
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <BackButton className="font-medium text-ink transition-colors hover:text-azure-hover" />
          <Link href={`/profile/${meId}`} className="text-slate-500 transition-colors hover:text-ink">
            Mi perfil
          </Link>
        </div>
      }
      title="Mis favoritos"
      description={items.length === 0 ? "Aún no has guardado propiedades." : `${items.length} ${items.length === 1 ? "propiedad guardada" : "propiedades guardadas"}.`}
      action={
        items.length > 0 && (
          <div role="group" aria-label="Vista de favoritos" className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
            {views.map((v) => (
              <button
                key={v.view}
                type="button"
                onClick={() => router.replace(v.view === "list" ? `${pathname}?vista=lista` : pathname, { scroll: false })}
                aria-pressed={view === v.view}
                className={`${segment} ${view === v.view ? segmentOn : segmentOff}`}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d={v.icon} />
                </svg>
                {v.label}
              </button>
            ))}
          </div>
        )
      }
    >
      {items.length === 0 ? (
        <EmptyState icon="heart" title="Tu lista está vacía" text="Toca el corazón de una propiedad para guardarla aquí y compararla después." href="/properties" cta="Explorar propiedades" />
      ) : view === "list" ? (
        <ul className="space-y-4">
          {items.map((p) => {
            const unavailable = unavailableOf(p.code);
            return (
              <li key={p.code}>
                {unavailable && (
                  <p role="status" className="mb-2 text-xs font-semibold text-slate-500">
                    Esta propiedad ya no está disponible ({unavailable.toLowerCase()}).
                  </p>
                )}
                <div className={unavailable ? "opacity-70 grayscale" : ""}>
                  <PropertyRowCard p={p} />
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <ul className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((p) => {
            const isRent = p.operation === "rent";
            const unavailable = unavailableOf(p.code);
            const perM2 = p.area > 0 ? Math.round(p.price / p.area) : null;
            const href = `/properties/${p.code}`;
            return (
              <li key={p.code} className="card-surface card-hover group/card flex flex-col overflow-hidden rounded-3xl">
                <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                  <Image
                    src={p.image}
                    alt={p.title}
                    fill
                    sizes="(min-width: 1280px) 360px, (min-width: 640px) 45vw, 100vw"
                    className={`object-cover transition-transform duration-[350ms] ease-out group-hover/card:scale-[1.02] ${unavailable ? "opacity-60 grayscale" : ""}`}
                  />
                  <Link href={href} aria-label={`Ver propiedad: ${p.title}`} className="absolute inset-0" />
                  <span className={`label-sm pointer-events-none absolute left-3 top-3 rounded-md px-2.5 py-1 backdrop-blur-sm ${unavailable ? "bg-ink text-white" : isRent ? "bg-white/90 text-ink" : "bg-ink/85 text-white"}`}>
                    {unavailable ?? (isRent ? "Renta" : "Venta")}
                  </span>
                  <FavoriteButton code={p.code} />
                </div>

                <div className="flex flex-1 flex-col gap-2 p-5">
                  <p className="label-sm truncate text-azure">
                    {p.zone} • {p.city}
                  </p>
                  <h2 className="line-clamp-1 text-[1.05rem] font-semibold text-ink">
                    <Link href={href} className="hover:underline">
                      {p.title}
                    </Link>
                  </h2>
                  <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-[0.8rem] text-slate-700">
                    {statsOf(p)
                      .filter((s) => s.icon !== "land" && s.icon !== "car")
                      .map((s) => (
                        <li key={s.icon} className="flex items-center gap-1.5" title={s.label}>
                          <StatIcon name={s.icon} />
                          {s.value}
                        </li>
                      ))}
                  </ul>

                  <div className="mt-auto flex items-end justify-between gap-3 border-t border-slate-100 pt-4">
                    <p className="min-w-0">
                      <span className="metric-price block text-ink">
                        {formatMxn(p.price)}
                        <span className="ml-1 text-xs font-semibold text-slate-500">MXN{isRent && " /mes"}</span>
                      </span>
                      {perM2 !== null && (
                        <span className="text-xs text-slate-500" title="Precio por metro cuadrado">
                          {formatMxn(perM2)} /m²{isRent && " al mes"}
                        </span>
                      )}
                    </p>
                    {unavailable ? (
                      <span role="status" className="shrink-0 text-xs font-semibold text-slate-500">
                        Ya no disponible
                      </span>
                    ) : (
                      <Link href={href} className="btn btn-primary shrink-0 px-3.5 py-2 text-[0.8rem]">
                        Ver ficha
                        <ProfileIcon name="arrow" className="h-4 w-4" />
                      </Link>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </ProfileSection>
  );
}
