import Image from "next/image";
import Link from "next/link";
import { FavoriteButton } from "@/components/favorite-button";
import { StatIcon, type StatIconName } from "@/components/property-icons";
import { formatMxn, type ListedProperty } from "@/lib/mock-data";

const DAY = 86_400_000;

/** "2026-10-20" → "Publicado hoy" / "ayer" / "hace 5 días" / "el 12 sep". */
function publishedLabel(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const published = new Date(y, m - 1, d);
  const now = new Date();
  const days = Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - published.getTime()) / DAY);
  if (days <= 0) return "Publicado hoy";
  if (days === 1) return "Publicado ayer";
  if (days < 30) return `Publicado hace ${days} días`;
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", ...(published.getFullYear() !== now.getFullYear() && { year: "numeric" }) };
  return `Publicado el ${published.toLocaleDateString("es-MX", opts)}`;
}

/** Características con dato real; las que valen 0 (p. ej. recámaras de una bodega) no se muestran. */
function statsOf(p: ListedProperty): { icon: StatIconName; value: string; label: string }[] {
  const isLand = p.type === "Terreno";
  const stats: { icon: StatIconName; value: string; label: string }[] = [];
  if (p.bedrooms > 0) stats.push({ icon: "bed", value: `${p.bedrooms} ${p.bedrooms === 1 ? "recámara" : "recámaras"}`, label: "Recámaras" });
  if (p.bathrooms > 0) stats.push({ icon: "bath", value: `${p.bathrooms} ${p.bathrooms === 1 ? "baño" : "baños"}`, label: "Baños" });
  if (p.area > 0) stats.push({ icon: "area", value: `${p.area.toLocaleString("es-MX")} m²${isLand ? "" : " constr."}`, label: isLand ? "Superficie" : "Construcción" });
  if (!isLand && p.landArea > 0) stats.push({ icon: "land", value: `${p.landArea.toLocaleString("es-MX")} m² terreno`, label: "Terreno" });
  if (p.parkingSpots) stats.push({ icon: "car", value: `${p.parkingSpots} ${p.parkingSpots === 1 ? "estacionamiento" : "estacionamientos"}`, label: "Estacionamientos" });
  return stats;
}

/**
 * Tarjeta horizontal del listado (vista "Lista y mapa").
 * `active`: la propiedad está seleccionada en el mapa. `onHover` resalta su pin.
 */
export function PropertyRowCard({ p, active = false, onHover }: { p: ListedProperty; active?: boolean; onHover?: (code: string | null) => void }) {
  const isRent = p.operation === "rent";
  const perM2 = p.area > 0 ? Math.round(p.price / p.area) : null;
  const photos = p.images?.length ?? 0;
  const stats = statsOf(p);
  const href = `/properties/${p.code}`;
  return (
    <article
      id={`prop-${p.code}`}
      onMouseEnter={() => onHover?.(p.code)}
      onMouseLeave={() => onHover?.(null)}
      className={`group/card flex scroll-mt-24 flex-col overflow-hidden rounded-3xl border bg-white transition-[border-color,box-shadow] duration-300 sm:flex-row ${
        active ? "border-azure shadow-glow ring-2 ring-azure/15" : "border-slate-200 hover:border-slate-300 hover:shadow-glow"
      }`}
    >
      <div className="relative aspect-[4/3] shrink-0 overflow-hidden sm:aspect-auto sm:min-h-[15rem] sm:w-[40%]">
        <Image
          src={p.image}
          alt={p.title}
          fill
          sizes="(min-width: 1024px) 240px, (min-width: 640px) 40vw, 100vw"
          className="object-cover transition-transform duration-[350ms] ease-out group-hover/card:scale-[1.02]"
        />
        <Link href={href} aria-label={`Ver propiedad: ${p.title}`} className="absolute inset-0" />
        <span className={`label-sm pointer-events-none absolute left-3 top-3 rounded-md px-2.5 py-1 backdrop-blur-sm ${isRent ? "bg-white/90 text-ink" : "bg-ink/85 text-white"}`}>
          {isRent ? "Renta" : "Venta"}
        </span>
        <FavoriteButton code={p.code} />
        {photos > 1 && (
          <span className="pointer-events-none absolute bottom-3 right-3 flex items-center gap-1 rounded-md bg-ink/75 px-2 py-0.5 text-xs font-semibold text-white backdrop-blur-sm" title={`${photos} fotos`}>
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M4 8h3l2-3h6l2 3h3v11H4z" strokeLinejoin="round" />
              <circle cx="12" cy="13" r="3.5" />
            </svg>
            {photos}
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2 p-5">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <p className="label-sm truncate text-azure">
            {p.zone} • {p.city}
          </p>
          {active ? (
            <span className="flex items-center gap-1 text-xs font-semibold text-azure">
              <span className="h-1.5 w-1.5 rounded-full bg-azure" aria-hidden />
              Seleccionado en mapa
            </span>
          ) : (
            <span className="text-xs text-slate-500">{publishedLabel(p.publishedAt)}</span>
          )}
        </div>

        <p className="flex flex-wrap items-baseline gap-x-1.5">
          <span className="metric-price text-ink">{formatMxn(p.price)}</span>
          <span className="text-xs font-semibold text-slate-500">MXN{isRent && " /mes"}</span>
          {perM2 !== null && (
            <span className="ml-1 text-xs text-slate-500" title="Precio por metro cuadrado">
              {formatMxn(perM2)} /m²{isRent && " al mes"}
            </span>
          )}
        </p>

        <h3 className="line-clamp-1 text-[1.05rem] font-semibold text-ink">
          <Link href={href} className="hover:underline">
            {p.title}
          </Link>
        </h3>

        {stats.length > 0 && (
          <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-[0.8rem] text-slate-700">
            {stats.map((s) => (
              <li key={s.icon} className="flex items-center gap-1.5" title={s.label}>
                <StatIcon name={s.icon} />
                {s.value}
              </li>
            ))}
          </ul>
        )}

        {p.description && <p className="line-clamp-2 text-[0.875rem] leading-snug text-slate-600">{p.description}</p>}

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
          <span className="text-xs text-slate-500">
            {p.type} · {p.code}
          </span>
          <Link href={href} className="btn btn-primary px-4 py-2 text-[0.85rem]">
            Ver ficha
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
        </div>
      </div>
    </article>
  );
}
