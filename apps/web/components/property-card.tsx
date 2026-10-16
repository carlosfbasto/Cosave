import Image from "next/image";
import Link from "next/link";
import { FavoriteButton } from "@/components/favorite-button";
import { formatMxn, type MockProperty } from "@/lib/mock-data";

const iconCls = "h-4 w-4 text-navy-light";

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
  return (
    <article className="group/card flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow duration-300 hover:shadow-xl">
      {/* Imagen (~58% de la card) */}
      <div className="relative aspect-[4/3] overflow-hidden rounded-t-xl">
        <Image
          src={p.image}
          alt={p.title}
          fill
          sizes="(min-width: 1280px) 280px, (min-width: 640px) 45vw, 100vw"
          className="object-cover transition-transform duration-500 group-hover/card:scale-105"
        />
        {/* Enlace a la ficha con mensaje semitransparente al pasar el mouse */}
        <Link
          href={`/properties/${p.code}`}
          aria-label={`Ver propiedad: ${p.title}`}
          className="group/img absolute inset-0 flex items-center justify-center"
        >
          <span className="rounded-md bg-navy/60 px-4 py-2 text-sm font-semibold text-white opacity-0 backdrop-blur-[1px] transition-opacity duration-200 group-hover/img:opacity-100 group-focus-visible/img:opacity-100">
            Ver propiedad
          </span>
        </Link>
        <span
          className={`pointer-events-none absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide shadow ${
            isRent ? "bg-white/85 text-navy" : "bg-accent/85 text-navy"
          }`}
        >
          {isRent ? "Renta" : "Venta"}
        </span>
        <FavoriteButton code={p.code} />
      </div>

      {/* Información */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-baseline justify-between gap-2">
          <p className="flex items-baseline">
            <span className="mr-2 text-[1.4rem] font-bold text-navy">{formatMxn(p.price)}</span>
            <span className="text-xs font-semibold text-slate-500">MXN{isRent && " /mes"}</span>
          </p>
          <span className="flex items-center gap-1 text-xs font-medium text-slate-500" title="Ubicación">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-navy-light" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M12 21s-7-6.2-7-11a7 7 0 0114 0c0 4.8-7 11-7 11z" strokeLinejoin="round" />
              <circle cx="12" cy="10" r="2.5" />
            </svg>
            {p.city}
          </span>
        </div>
        <p className="line-clamp-2 text-[0.9rem] leading-[1.2] text-slate-600">{p.description}</p>
        <div className={`mt-auto flex items-center gap-4 border-t border-slate-100 pt-3 font-normal text-slate-700 ${smallStats ? "text-[0.6rem]" : "text-[0.8rem]"}`}>
          <Stat label="Recámaras" small={smallStats}>
            <svg viewBox="0 0 24 24" className={iconCls} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M3 18v-7a2 2 0 012-2h14a2 2 0 012 2v7M3 15h18M7 9V6h10v3" strokeLinecap="round" strokeLinejoin="round" /></svg>
            {p.bedrooms} recámaras
          </Stat>
          <Stat label="Baños" small={smallStats}>
            <svg viewBox="0 0 24 24" className={iconCls} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M3 12h18v2a5 5 0 01-5 5H8a5 5 0 01-5-5v-2zM6 12V6a2 2 0 014 0" strokeLinecap="round" strokeLinejoin="round" /></svg>
            {p.bathrooms} baños
          </Stat>
          <Stat label="Superficie" small={smallStats}>
            <svg viewBox="0 0 24 24" className={iconCls} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M4 4h16v16H4zM4 9h5M9 4v5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            {p.area} m²
          </Stat>
        </div>
      </div>
    </article>
  );
}

/** `compact`: cards 15 px más angostas que la columna (lista del módulo de propiedades). */
export function PropertyGrid({ items, cols = 4, compact = false, smallStats = false }: { items: MockProperty[]; cols?: 2 | 4; compact?: boolean; smallStats?: boolean }) {
  return (
    <div className={`grid gap-6 ${compact ? "sm:grid-cols-[repeat(2,calc((100%-24px)/2-15px))]" : "sm:grid-cols-2"} ${cols === 4 ? "xl:grid-cols-4" : ""}`}>
      {items.map((p) => (
        <PropertyCard key={p.code} p={p} smallStats={smallStats} />
      ))}
    </div>
  );
}
