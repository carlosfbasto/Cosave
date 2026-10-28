import Image from "next/image";
import Link from "next/link";
import { FavoriteButton } from "@/components/favorite-button";
import { StatIcon } from "@/components/property-icons";
import { formatMxn, type MockProperty } from "@/lib/mock-data";

function Stat({ children, label, small }: { children: React.ReactNode; label: string; small?: boolean }) {
  return (
    <span className={`mr-1 flex items-center gap-1 font-normal ${small ? "text-[0.6rem]" : "text-[0.8rem]"}`} title={label}>
      {children}
    </span>
  );
}

/** `smallStats`: recámaras, baños y superficie a 0.6rem (cards de la portada). */
export function PropertyCard({ p, smallStats = false }: { p: MockProperty; smallStats?: boolean }) {
  const isRent = p.operation === "rent";
  // Precio por m² construido: ayuda a comparar propiedades de distinto tamaño.
  const perM2 = p.area > 0 ? Math.round(p.price / p.area) : null;
  return (
    <article className="group/card flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white transition-[border-color,box-shadow] duration-300 hover:border-slate-300 hover:shadow-glow">
      {/* Imagen (~58% de la card) */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <Image
          src={p.image}
          alt={p.title}
          fill
          sizes="(min-width: 1280px) 280px, (min-width: 640px) 45vw, 100vw"
          className="object-cover transition-transform duration-[350ms] ease-out group-hover/card:scale-[1.02]"
        />
        {/* Enlace a la ficha con mensaje semitransparente al pasar el mouse */}
        <Link
          href={`/properties/${p.code}`}
          aria-label={`Ver propiedad: ${p.title}`}
          className="group/img absolute inset-0 flex items-center justify-center"
        >
          <span className="rounded-lg bg-white/90 px-4 py-2 text-sm font-semibold text-ink opacity-0 backdrop-blur-sm transition-opacity duration-200 group-hover/img:opacity-100 group-focus-visible/img:opacity-100">
            Ver propiedad
          </span>
        </Link>
        <span
          className={`label-sm pointer-events-none absolute left-3 top-3 rounded-md px-2.5 py-1 backdrop-blur-sm ${
            isRent ? "bg-white/90 text-ink" : "bg-ink/85 text-white"
          }`}
        >
          {isRent ? "Renta" : "Venta"}
        </span>
        <FavoriteButton code={p.code} />
      </div>

      {/* Información */}
      <div className="flex flex-1 flex-col gap-2 p-5">
        <p className="flex flex-wrap items-baseline">
          <span className="metric-price mr-1.5 text-ink">{formatMxn(p.price)}</span>
          <span className="text-xs font-semibold text-slate-500">MXN{isRent && " /mes"}</span>
        </p>
        <div className="-mt-1.5 flex items-center justify-between gap-2 text-xs text-slate-500">
          <span title="Precio por metro cuadrado construido">{perM2 !== null && <>{formatMxn(perM2)} /m²{isRent && " al mes"}</>}</span>
          <span className="flex min-w-0 items-center gap-1 font-medium" title="Ubicación">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M12 21s-7-6.2-7-11a7 7 0 0114 0c0 4.8-7 11-7 11z" strokeLinejoin="round" />
              <circle cx="12" cy="10" r="2.5" />
            </svg>
            <span className="truncate">{p.city}</span>
          </span>
        </div>
        <p className="line-clamp-2 text-[0.9rem] leading-snug text-slate-600">{p.description}</p>
        <div className={`mt-auto flex items-center gap-4 border-t border-slate-100 pt-3 font-normal text-slate-700 ${smallStats ? "text-[0.6rem]" : "text-[0.8rem]"}`}>
          <Stat label="Recámaras" small={smallStats}>
            <StatIcon name="bed" />
            {p.bedrooms} recámaras
          </Stat>
          <Stat label="Baños" small={smallStats}>
            <StatIcon name="bath" />
            {p.bathrooms} baños
          </Stat>
          <Stat label="Superficie" small={smallStats}>
            <StatIcon name="area" />
            {p.area} m²
          </Stat>
        </div>
      </div>
    </article>
  );
}

/** `compact`: cards 15 px más angostas que la columna (lista del módulo de propiedades). */
export function PropertyGrid({ items, cols = 4, compact = false, smallStats = false }: { items: MockProperty[]; cols?: 2 | 3 | 4; compact?: boolean; smallStats?: boolean }) {
  const xl = cols === 4 ? "xl:grid-cols-4" : cols === 3 ? "lg:grid-cols-3" : "";
  return (
    <div className={`grid gap-6 ${compact ? "sm:grid-cols-[repeat(2,calc((100%-24px)/2-15px))]" : "sm:grid-cols-2"} ${xl}`}>
      {items.map((p) => (
        <PropertyCard key={p.code} p={p} smallStats={smallStats} />
      ))}
    </div>
  );
}
