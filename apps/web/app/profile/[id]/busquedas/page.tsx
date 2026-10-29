"use client";

import Link from "next/link";
import { use, useState } from "react";
import { PROPERTY_TYPE_LABEL } from "@cosave/shared";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { NoticeCard } from "@/components/notice-card";
import { ProfileIcon } from "@/components/user/profile-icons";
import { EmptyState, ErrorNote, Loading, ProfileSection, RowIcon } from "@/components/user/profile-section";
import { loginUrl } from "@/lib/auth";
import { useCurrentUser } from "@/lib/current-user";
import { formatMxn, slugify } from "@/lib/mock-data";
import { useMySavedSearches, type SavedSearchItem } from "@/lib/saved-searches";
import { showToast } from "@/lib/toast";

const date = (iso: string) => new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
const chip = "rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600";

function priceRange({ minPrice, maxPrice }: SavedSearchItem) {
  if (minPrice !== null && maxPrice !== null) return `Entre ${formatMxn(minPrice)} y ${formatMxn(maxPrice)}`;
  if (minPrice !== null) return `Desde ${formatMxn(minPrice)}`;
  if (maxPrice !== null) return `Hasta ${formatMxn(maxPrice)}`;
  return "Cualquier precio";
}

/** Listado de propiedades con los mismos criterios (parámetros de `components/properties/url-state.ts`). */
function resultsHref(s: SavedSearchItem) {
  const sp = new URLSearchParams();
  if (s.propertyType) sp.append("tipo", slugify(PROPERTY_TYPE_LABEL[s.propertyType]));
  if (s.state) sp.append("estado", slugify(s.state));
  if (s.city) sp.append("ciudad", slugify(s.city));
  if (s.minPrice !== null) sp.set("precio_min", String(s.minPrice));
  if (s.maxPrice !== null) sp.set("precio_max", String(s.maxPrice));
  const q = sp.toString();
  return `/properties/${s.operation === "rent" ? "rentals" : "sale"}${q ? `?${q}` : ""}`;
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
    <ProfileSection
      title="Mis búsquedas guardadas"
      description="Te notificaremos cuando COSAVE tenga propiedades que coincidan con estas búsquedas."
      action={
        ready && !error && items.length > 0 ? (
          <Link href="/properties" className="btn btn-primary px-4 py-2 text-sm">
            <ProfileIcon name="search" className="h-4 w-4" />
            Nueva búsqueda
          </Link>
        ) : undefined
      }
    >
      {!ready ? (
        <Loading />
      ) : error ? (
        <ErrorNote>No se pudieron cargar tus búsquedas. Inténtalo de nuevo más tarde.</ErrorNote>
      ) : items.length === 0 ? (
        <EmptyState icon="search" title="Aún no has guardado búsquedas" text="En el listado de propiedades, guarda tus filtros y te avisaremos cuando haya coincidencias." href="/properties" cta="Explorar propiedades" />
      ) : (
        <ul className="space-y-3">
          {items.map((s) => (
            <li key={s.id} className="card-surface card-hover flex flex-col gap-4 rounded-2xl p-5 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 gap-4">
                <RowIcon name={s.propertyType === "house" || s.propertyType === "apartment" ? "home" : "search"} />
                <div className="min-w-0">
                  <p className="font-semibold text-ink">
                    {s.propertyType ? PROPERTY_TYPE_LABEL[s.propertyType] : "Cualquier tipo"} en {s.operation === "rent" ? "renta" : "venta"}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className={chip}>{[s.city, s.state].filter(Boolean).join(", ") || "Cualquier ubicación"}</span>
                    <span className={chip}>{priceRange(s)}</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">Guardada el {date(s.createdAt)}</p>
                </div>
              </div>
              <div className="flex shrink-0 gap-2 sm:flex-col lg:flex-row">
                <Link href={resultsHref(s)} className="btn btn-outline px-3.5 py-2 text-xs">
                  Ver resultados
                  <ProfileIcon name="arrow" className="h-3.5 w-3.5" />
                </Link>
                <button
                  type="button"
                  onClick={() => setToDelete(s)}
                  className="btn px-3.5 py-2 text-xs text-red-600 hover:bg-red-50"
                >
                  <ProfileIcon name="trash" className="h-3.5 w-3.5" />
                  Eliminar
                </button>
              </div>
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
    </ProfileSection>
  );
}
