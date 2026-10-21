"use client";

import Link from "next/link";
import { use, useState } from "react";
import { PROPERTY_TYPE_LABEL } from "@cosave/shared";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { NoticeCard } from "@/components/notice-card";
import { loginUrl } from "@/lib/auth";
import { useCurrentUser } from "@/lib/current-user";
import { formatMxn } from "@/lib/mock-data";
import { useMySavedSearches, type SavedSearchItem } from "@/lib/saved-searches";
import { showToast } from "@/lib/toast";

const date = (iso: string) => new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });

function priceRange({ minPrice, maxPrice }: SavedSearchItem) {
  if (minPrice !== null && maxPrice !== null) return `Entre ${formatMxn(minPrice)} y ${formatMxn(maxPrice)}`;
  if (minPrice !== null) return `Desde ${formatMxn(minPrice)}`;
  if (maxPrice !== null) return `Hasta ${formatMxn(maxPrice)}`;
  return "Cualquier precio";
}

/** Búsquedas guardadas del usuario ("No encontré lo que busco"). Solo el dueño de la sesión las ve. */
export default function SavedSearchesPage({ params }: PageProps<"/profile/[id]/busquedas">) {
  const { id } = use(params);
  const me = useCurrentUser();
  const isOwner = me.id === id;
  const { items, ready, error, remove } = useMySavedSearches(isOwner ? me : { id: null, remote: false });
  const [toDelete, setToDelete] = useState<SavedSearchItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await remove(toDelete.id);
      showToast("Búsqueda eliminada");
      setToDelete(null);
    } catch {
      showToast("No se pudo eliminar la búsqueda. Inténtalo de nuevo.", "info");
    } finally {
      setDeleting(false);
    }
  }

  if (me.loading) return <p className="p-8 text-sm text-slate-600">Cargando…</p>;
  if (!me.id) return <NoticeCard title="Mis búsquedas guardadas" text="Inicia sesión para ver tus búsquedas guardadas." href={loginUrl(`/profile/${id}/busquedas`, "login")} cta="Iniciar sesión" />;
  if (!isOwner) {
    return <NoticeCard title="Sin acceso" text="Solo puedes ver tus propias búsquedas guardadas." href={`/profile/${me.id}/busquedas`} cta="Ir a mis búsquedas" />;
  }

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-6 py-10">
      <header>
        <h1 className="text-[20px] font-semibold text-navy">Mis búsquedas guardadas</h1>
        <p className="mt-1 text-sm text-slate-600">Te notificaremos cuando COSAVE tenga propiedades que coincidan con estas búsquedas.</p>
      </header>

      {!ready ? (
        <p className="text-sm text-slate-600">Cargando…</p>
      ) : error ? (
        <p role="alert" className="text-sm text-red-600">No se pudieron cargar tus búsquedas. Inténtalo de nuevo más tarde.</p>
      ) : items.length === 0 ? (
        <div className="py-10 text-center">
          <p className="mb-4 text-sm text-slate-600">Aún no has guardado búsquedas.</p>
          <Link href="/properties" className="inline-block rounded-md bg-accent px-5 py-2.5 font-semibold text-navy transition-colors hover:bg-accent-hover">
            Explorar propiedades
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((s) => (
            <li key={s.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-navy">
                  {s.propertyType ? PROPERTY_TYPE_LABEL[s.propertyType] : "Cualquier tipo"} en {s.operation === "rent" ? "renta" : "venta"}
                </p>
                <span>
                  <button
                    type="button"
                    onClick={() => setToDelete(s)}
                    className="cursor-pointer rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:border-red-600 hover:bg-red-50"
                  >
                    Eliminar
                  </button>
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-700">{[s.city, s.state].filter(Boolean).join(", ") || "Cualquier ubicación"}</p>
              <p className="text-sm text-slate-700">{priceRange(s)}</p>
              <p className="mt-1 text-xs text-slate-500">Guardada el {date(s.createdAt)}</p>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={!!toDelete}
        title="¿Eliminar esta búsqueda?"
        confirmLabel="Eliminar"
        danger
        busy={deleting}
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
      >
        Ya no te notificaremos cuando haya propiedades que coincidan con ella.
      </ConfirmDialog>
    </main>
  );
}
