"use client";

import Image from "next/image";
import Link from "next/link";
import { use } from "react";
import { loginUrl } from "@/lib/auth";
import { BackButton } from "@/components/back-button";
import { NoticeCard } from "@/components/notice-card";
import { useCurrentUser } from "@/lib/current-user";
import { useFavorites } from "@/lib/favorites";
import { formatMxn } from "@/lib/mock-data";
import { useProperties } from "@/lib/use-catalog";
import { showToast } from "@/lib/toast";
import { UNAVAILABLE_LABEL } from "@cosave/shared";

const card = "rounded-xl border border-slate-200 bg-white p-6 shadow-sm";

/** Favoritos de un usuario. Solo el dueño de la sesión puede ver y modificar su lista. */
export default function FavoritesPage({ params }: PageProps<"/favorites/[id]">) {
  const { id } = use(params);
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

  return (
    <main className="flex-1 bg-slate-50">
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-10">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <BackButton className="font-medium text-navy transition-colors hover:text-accent-hover" />
          <Link href={`/profile/${meId}`} className="text-slate-500 transition-colors hover:text-navy">Mi perfil</Link>
        </div>
        <header>
          <h1 className="text-3xl font-bold tracking-tight text-navy">Mis favoritos</h1>
          <p className="mt-1 text-sm text-slate-600">
            {items.length === 0 ? "Aún no has guardado propiedades." : `${items.length} ${items.length === 1 ? "propiedad guardada" : "propiedades guardadas"}.`}
          </p>
        </header>

        {items.length === 0 ? (
          <div className={`${card} text-center`}>
            <p className="mb-4 text-sm text-slate-600">Toca el corazón de una propiedad para guardarla aquí.</p>
            <Link href="/properties" className="inline-block rounded-md bg-accent px-5 py-2.5 font-semibold text-navy transition-colors hover:bg-accent-hover">
              Explorar propiedades
            </Link>
          </div>
        ) : (
          <ul className="space-y-4">
            {items.map((p) => {
              const isRent = p.operation === "rent";
              // F05: si ya no está publicada se indica por qué (vendida, rentada, pausada o retirada).
              const status = favs.statusOf(p.code);
              const unavailable = status === "published" ? null : (UNAVAILABLE_LABEL[status] ?? "Retirada");
              return (
                <li key={p.code} className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm sm:flex-row">
                  <Link href={`/properties/${p.code}`} className="relative aspect-[4/3] shrink-0 sm:aspect-auto sm:w-64" aria-label={`Ver propiedad: ${p.title}`}>
                    <Image src={p.image} alt={p.title} fill sizes="(min-width: 640px) 256px, 100vw" className={`object-cover ${unavailable ? "opacity-60 grayscale" : ""}`} />
                    {unavailable && (
                      <span className="absolute left-3 top-3 rounded-full bg-navy px-3 py-1 text-xs font-bold text-white">{unavailable}</span>
                    )}
                  </Link>
                  <div className="flex flex-1 flex-col gap-3 p-5">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-bold text-navy">{p.title}</h2>
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">{isRent ? "Renta" : "Venta"} · {p.city}</span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-slate-600">{p.description}</p>
                      <p className="mt-1 text-xs text-slate-500">{p.bedrooms} recámaras · {p.bathrooms} baños · {p.area} m²</p>
                    </div>
                    <p className="mt-auto flex items-baseline">
                      <span className="mr-2 text-2xl font-bold text-navy">{formatMxn(p.price)}</span>
                      <span className="text-xs font-semibold text-slate-500">MXN{isRent && " /mes"}</span>
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {unavailable ? (
                        <p role="status" className="self-center text-sm font-semibold text-slate-600">Esta propiedad ya no está disponible ({unavailable.toLowerCase()}).</p>
                      ) : (
                        <Link
                          href={`/properties/${p.code}`}
                          className="rounded-md bg-accent px-4 py-2 text-[0.9rem] font-semibold text-navy transition-colors hover:bg-accent-hover"
                        >
                          {isRent ? "Rentar ahora" : "Comprar ahora"}
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={async () => {
                          if (await favs.remove(p.code)) showToast("Se eliminó de favoritos");
                        }}
                        className="cursor-pointer rounded-md border border-slate-300 px-4 py-2 text-[0.9rem] font-semibold text-slate-700 transition-colors hover:border-red-500 hover:text-red-600"
                      >
                        Eliminar de favoritos
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
