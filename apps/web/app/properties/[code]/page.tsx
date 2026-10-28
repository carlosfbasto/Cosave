import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FavoriteAction } from "@/components/favorite-button";
import { Advertiser } from "@/components/property-detail/advertiser";
import { BackButton } from "@/components/back-button";
import { PhotoMosaic } from "@/components/property-detail/photo-mosaic";
import { ShareButton } from "@/components/property-detail/share-button";
import { PropertyShowcaseCard } from "@/components/home/property-showcase-card";
import { AMENITY_LABEL, MATERIAL_LABEL, UNAVAILABLE_LABEL } from "@cosave/shared";
import { fetchCatalog, fetchProperty } from "@/lib/catalog";
import { cityCoords, formatMxn, galleryFor, paragraphsFor, similarTo, slugify } from "@/lib/mock-data";
import { advertiserOf } from "@/lib/mock-users";

/** Vista previa al compartir el enlace (título, descripción e imagen de la propiedad). */
export async function generateMetadata({ params }: PageProps<"/properties/[code]">): Promise<Metadata> {
  const { code } = await params;
  const found = await fetchProperty(code);
  if (!found.found) return { title: "Propiedad no encontrada — COSAVE" };
  const p = found.property;
  const title = `${p.title} en ${p.city} — COSAVE`;
  return {
    title,
    description: p.description,
    alternates: { canonical: `/properties/${p.code}` },
    openGraph: { title, description: p.description, images: [p.image], type: "website", locale: "es_MX" },
  };
}

const svg = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;

/** Íconos de la franja de datos rápidos. */
const icons = {
  build: <path d="M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6" />,
  land: <path d="M4 4h16v16H4zM4 9h5M9 4v5" />,
  beds: <path d="M3 18v-7a2 2 0 012-2h14a2 2 0 012 2v7M3 15h18M7 9V6h10v3" />,
  baths: <path d="M3 12h18v2a5 5 0 01-5 5H8a5 5 0 01-5-5v-2zM6 12V6a2 2 0 014 0" />,
  parking: <path d="M5 17h14M6 17l1.5-6h9L18 17M7 20v-3M17 20v-3M8 14h.01M16 14h.01" />,
  type: <path d="M20 12l-8 8-9-9V3h8l9 9zM7.5 7.5h.01" />,
};

const card = "rounded-2xl border border-slate-200 bg-white p-6 sm:p-8";

/** Ficha de una propiedad. Los datos vienen del api; sin api se muestran los de demostración. */
export default async function PropertyDetailPage({ params }: PageProps<"/properties/[code]">) {
  const { code } = await params;
  const found = await fetchProperty(code);
  if (!found.found) notFound();
  const { property: p, status, source } = found;
  const unavailable = status === "published" ? null : (UNAVAILABLE_LABEL[status] ?? "Retirada");
  const demo = source === "demo";

  const isRent = p.operation === "rent";
  const where = [p.zone && !demo ? p.zone : null, p.city, p.state].filter(Boolean).join(", ");
  const info = `${isRent ? "En Renta" : "En Venta"} | ${p.type} | ${p.city}, ${p.state}${p.area ? ` | ${p.area.toLocaleString("es-MX")} m²` : ""}`;
  const paragraphs = demo ? paragraphsFor(p) : p.description ? p.description.split(/\n{2,}/) : [];
  const amenities = p.amenities.map((a) => AMENITY_LABEL[a]).filter(Boolean);
  const materials = p.materials.map((m) => MATERIAL_LABEL[m]).filter(Boolean);
  const advertiser = demo ? advertiserOf(p.code) : undefined;
  const catalog = (await fetchCatalog()).items;
  const similar = similarTo(p, catalog).slice(0, 3);
  const sameKind = catalog.filter((o) => o.code !== p.code && o.type === p.type && o.operation === p.operation).length;
  const listHref = isRent ? "/properties/rentals" : "/properties/sale";

  // Mapa: coordenadas reales si la propiedad las tiene; si no, el centro de su ciudad.
  const c = cityCoords[p.city];
  const lat = typeof p.latitude === "number" ? p.latitude : c ? c.lat + (p.map.y - 50) / 2000 : null;
  const lon = typeof p.longitude === "number" ? p.longitude : c ? c.lon + (p.map.x - 50) / 2000 : null;
  const exact = typeof p.latitude === "number";
  const mapSrc =
    lat !== null && lon !== null
      ? `https://www.openstreetmap.org/export/embed.html?bbox=${[lon - 0.012, lat - 0.008, lon + 0.012, lat + 0.008].join("%2C")}&layer=mapnik&marker=${lat}%2C${lon}`
      : null;

  const rows: [string, string][] = [
    ["Tipo", p.type],
    ["Operación", isRent ? "Renta" : "Venta"],
    ...(p.area ? ([["Superficie construida", `${p.area.toLocaleString("es-MX")} m²`]] as [string, string][]) : []),
    ...(p.landArea ? ([["Superficie de terreno", `${p.landArea.toLocaleString("es-MX")} m²`]] as [string, string][]) : []),
    ...(p.bedrooms ? ([["Recámaras", String(p.bedrooms)]] as [string, string][]) : []),
    ...(p.bathrooms ? ([["Baños", String(p.bathrooms)]] as [string, string][]) : []),
    ...(p.parkingSpots ? ([["Estacionamientos", String(p.parkingSpots)]] as [string, string][]) : []),
    ...(p.maintenanceFee ? ([["Mantenimiento", `${formatMxn(p.maintenanceFee)} MXN /mes`]] as [string, string][]) : []),
    ["Clave", p.code],
  ];

  // Franja de datos rápidos: solo los que tienen valor.
  const quick = [
    p.area ? { icon: icons.build, value: `${p.area.toLocaleString("es-MX")} m²`, label: "Construcción" } : null,
    p.landArea ? { icon: icons.land, value: `${p.landArea.toLocaleString("es-MX")} m²`, label: "Terreno" } : null,
    p.bedrooms ? { icon: icons.beds, value: String(p.bedrooms), label: "Recámaras" } : null,
    p.bathrooms ? { icon: icons.baths, value: String(p.bathrooms), label: "Baños" } : null,
    p.parkingSpots ? { icon: icons.parking, value: String(p.parkingSpots), label: "Estacionamientos" } : null,
    { icon: icons.type, value: p.type, label: "Tipo" },
  ].filter((q) => q !== null);

  return (
    <main className="flex-1 bg-slate-50">
      {/* Barra de la ficha: volver, ruta y clave · favoritos y compartir */}
      <div className="sticky top-16 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-4 py-2.5 md:px-8">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <BackButton className="font-semibold text-ink transition-colors hover:text-azure" />
            <span aria-hidden className="text-slate-300">|</span>
            <nav aria-label="Ruta" className="hidden text-slate-500 sm:block">
              <Link href="/properties" className="transition-colors hover:text-ink">Propiedades</Link> /{" "}
              <Link href={listHref} className="transition-colors hover:text-ink">{isRent ? "En renta" : "En venta"}</Link>
            </nav>
            <span className="label-sm rounded-md bg-slate-100 px-2.5 py-1 text-slate-600">Clave {p.code}</span>
          </div>
          <div className="flex items-center gap-2 [&>button]:py-1.5 [&>button]:text-sm">
            {!unavailable && <FavoriteAction code={p.code} />}
            <ShareButton code={p.code} title={p.title} />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1440px] px-4 pb-16 pt-6 md:px-8">
        <PhotoMosaic images={demo ? galleryFor(p) : (p.images?.length ? p.images : [p.image])} alt={p.title} info={info} />

        {/* Escritorio: contenido (8 columnas) + panel del anunciante fijo (4). Móvil: el panel va tras el título y los datos. */}
        <div className="mt-8 grid items-start gap-8 lg:grid-cols-12">
          <div className="min-w-0 space-y-6 lg:col-span-8 lg:row-start-1">
            {unavailable && (
              <p role="status" className="rounded-xl border border-slate-300 bg-white p-4 text-sm font-semibold text-ink">
                Esta propiedad ya no está disponible ({unavailable.toLowerCase()}). Puedes ver otras opciones similares más abajo.
              </p>
            )}

            {/* Título, ubicación y precio */}
            <section className={card}>
              <p className="flex items-center gap-1.5 text-sm text-slate-500">
                <svg {...svg} className="h-4 w-4 shrink-0 text-azure"><path d="M12 21s-7-6.2-7-11a7 7 0 0114 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>
                {where}
                {p.postalCode && <span className="text-slate-400">· CP {p.postalCode}</span>}
              </p>
              <h1 className="mt-2 font-display text-[1.75rem] font-bold leading-tight tracking-tight text-ink sm:text-[2rem] sm:leading-10">{p.title}</h1>
              <div className="mt-5 flex flex-wrap items-end justify-between gap-3 rounded-xl bg-slate-50 p-4 sm:p-5">
                <div>
                  <p className="label-sm text-slate-500">{isRent ? "En renta" : "En venta"}</p>
                  <p className="mt-1 flex items-baseline gap-2">
                    <span className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">{formatMxn(p.price)}</span>
                    <span className="text-sm font-semibold text-slate-500">MXN{isRent && " /mes"}</span>
                  </p>
                </div>
                {p.area > 0 && (
                  <p className="text-sm text-slate-500" title="Precio por metro cuadrado construido">
                    {formatMxn(Math.round(p.price / p.area))} /m²{isRent && " al mes"}
                  </p>
                )}
              </div>
            </section>

            {/* Datos rápidos */}
            <dl className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-white p-2 sm:grid-cols-3 md:auto-cols-fr md:grid-flow-col md:grid-cols-none">
              {quick.map((q) => (
                <div key={q.label} className="flex flex-col items-center justify-center rounded-xl bg-slate-50 px-2 py-4 text-center">
                  <svg {...svg} className="mb-1.5 h-5 w-5 text-azure">{q.icon}</svg>
                  <dd className="font-display text-[0.95rem] font-bold text-ink">{q.value}</dd>
                  <dt className="text-[0.75rem] text-slate-500">{q.label}</dt>
                </div>
              ))}
            </dl>
          </div>

          {/* Panel del anunciante */}
          <aside className="lg:sticky lg:top-36 lg:col-span-4 lg:col-start-9 lg:row-span-2 lg:row-start-1">
            <Advertiser
              user={advertiser}
              listed={advertiser?.propertyCodes.length ?? 0}
              name={found.advertiser?.fullName}
              memberSince={found.advertiser?.memberSince}
              property={{ code: p.code, title: p.title }}
              unavailable={unavailable}
            />
          </aside>

          <div className="min-w-0 space-y-6 lg:col-span-8 lg:row-start-2">
            {paragraphs.length > 0 && (
              <section className={card}>
                <h2 className="headline-sm mb-4 text-ink">Descripción</h2>
                <div className="space-y-3 whitespace-pre-line text-[0.95rem] leading-relaxed text-slate-700">
                  {paragraphs.map((t) => <p key={t}>{t}</p>)}
                </div>
              </section>
            )}

            <section className={card}>
              <h2 className="headline-sm mb-4 text-ink">Superficie y datos</h2>
              <dl className="grid gap-2 sm:grid-cols-2">
                {rows.map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-4 py-3 text-sm">
                    <dt className="text-slate-500">{k}</dt>
                    <dd className="text-right font-semibold text-ink">{v}</dd>
                  </div>
                ))}
              </dl>

              {(amenities.length > 0 || materials.length > 0) && (
                <div className="mt-8 grid gap-6 sm:grid-cols-2">
                  {amenities.length > 0 && (
                    <div>
                      <h2 className="headline-sm mb-3 text-ink">Características</h2>
                      <ul className="flex flex-wrap gap-2">
                        {amenities.map((f) => <li key={f} className="label-sm rounded-md bg-slate-100 px-2.5 py-1.5 text-slate-600">{f}</li>)}
                      </ul>
                    </div>
                  )}
                  {materials.length > 0 && (
                    <div>
                      <h2 className="headline-sm mb-3 text-ink">Materiales de construcción</h2>
                      <ul className="flex flex-wrap gap-2">
                        {materials.map((m) => <li key={m} className="label-sm rounded-md bg-slate-100 px-2.5 py-1.5 text-slate-600">{m}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </section>

            {mapSrc && (
              <section className={card}>
                <h2 className="headline-sm mb-4 text-ink">Ubicación</h2>
                <div className="relative overflow-hidden rounded-xl border border-slate-200">
                  <iframe title={`Mapa de ${p.title}`} src={mapSrc} loading="lazy" className="block h-80 w-full border-0" />
                  <div className="pointer-events-none absolute left-3 top-3 max-w-xs rounded-lg bg-white/95 p-3 shadow-glow ring-1 ring-slate-200 backdrop-blur-md">
                    <p className="text-sm font-semibold text-ink">{where}</p>
                    {!exact && <p className="text-xs text-slate-500">Ubicación aproximada</p>}
                  </div>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>

      {/* Propiedades similares */}
      {similar.length > 0 && (
        <section className="border-t border-slate-200 bg-white py-14">
          <div className="mx-auto max-w-[1440px] px-4 md:px-8">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl font-bold tracking-tight text-ink">Propiedades similares</h2>
                <p className="mt-1 text-sm text-slate-600">Otras opciones que podrían interesarte.</p>
              </div>
              {sameKind > 0 && (
                <Link href={`${listHref}?tipo=${slugify(p.type)}`} className="inline-flex items-center gap-1 text-sm font-semibold text-azure transition-colors hover:text-azure-hover">
                  Ver todas ({sameKind}) →
                </Link>
              )}
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {similar.map((s) => <PropertyShowcaseCard key={s.code} p={s} />)}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
