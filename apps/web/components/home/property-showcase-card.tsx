import Image from "next/image";
import Link from "next/link";
import { FavoriteButton } from "@/components/favorite-button";
import { formatMxn, type ListedProperty } from "@/lib/mock-data";

/** Tarjeta de la portada: foto, ubicación, título, cuadrícula de datos y precio con precio por m². */
export function PropertyShowcaseCard({ p }: { p: ListedProperty }) {
  const isRent = p.operation === "rent";
  const href = `/properties/${p.code}`;
  const where = [p.zone, p.city].filter(Boolean).join(", ");
  const perM2 = p.area > 0 ? Math.round(p.price / p.area) : null;
  const specs: [string, string][] = [
    ["Superficie", p.area ? `${p.area.toLocaleString("es-MX")} m²` : "—"],
    ["Recámaras", p.bedrooms ? String(p.bedrooms) : "—"],
    ["Baños", p.bathrooms ? String(p.bathrooms) : "—"],
  ];

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-[border-color,box-shadow] duration-300 hover:border-slate-300 hover:shadow-glow">
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
        <Image
          src={p.image}
          alt={p.title}
          fill
          sizes="(min-width: 1280px) 340px, (min-width: 640px) 45vw, 100vw"
          className="object-cover transition-transform duration-[350ms] ease-out group-hover:scale-[1.02]"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/50 via-transparent to-transparent" />
        <span className="label-sm pointer-events-none absolute left-3 top-3 rounded-md bg-white/90 px-2.5 py-1 text-ink backdrop-blur-sm">{p.type}</span>
        <FavoriteButton code={p.code} />
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2 text-[0.8rem]">
            <span className="flex min-w-0 items-center gap-1 text-slate-500">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M12 21s-7-6.2-7-11a7 7 0 0114 0c0 4.8-7 11-7 11z" strokeLinejoin="round" />
                <circle cx="12" cy="10" r="2.5" />
              </svg>
              <span className="truncate">{where}</span>
            </span>
            <span className="label-sm shrink-0 text-azure">{isRent ? "Renta" : "Venta"}</span>
          </div>
          <h3 className="headline-sm line-clamp-2 min-h-14 text-ink transition-colors group-hover:text-azure">
            <Link href={href}>{p.title}</Link>
          </h3>
        </div>

        <dl className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 py-2.5 text-center">
          {specs.map(([k, v]) => (
            <div key={k} className="flex flex-col">
              <dt className="text-[0.7rem] font-semibold uppercase tracking-wide text-slate-500">{k}</dt>
              <dd className="font-display text-sm font-bold text-ink">{v}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-auto flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="flex items-baseline gap-1">
              <span className="metric-price text-ink">{formatMxn(p.price)}</span>
              <span className="whitespace-nowrap text-xs font-semibold text-slate-500">MXN{isRent && " /mes"}</span>
            </p>
            {perM2 !== null && (
              <p className="text-[0.8rem] text-slate-500" title="Precio por metro cuadrado construido">
                {formatMxn(perM2)} /m²{isRent && " al mes"}
              </p>
            )}
          </div>
          <Link href={href} className="btn shrink-0 bg-slate-100 px-3.5 py-2 text-sm text-ink hover:bg-slate-200">
            Ver propiedad
          </Link>
        </div>
      </div>
    </article>
  );
}

export function ShowcaseGrid({ items }: { items: ListedProperty[] }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((p) => (
        <PropertyShowcaseCard key={p.code} p={p} />
      ))}
    </div>
  );
}
