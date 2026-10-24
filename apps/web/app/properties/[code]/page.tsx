import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { WantItButton } from "@/components/want-it-button";
import { FavoriteAction } from "@/components/favorite-button";
import { Advertiser } from "@/components/property-detail/advertiser";
import { BackButton } from "@/components/back-button";
import { Gallery } from "@/components/property-detail/gallery";
import { ShareButton } from "@/components/property-detail/share-button";
import { SimilarCarousel } from "@/components/property-detail/similar-carousel";
import { UNAVAILABLE_LABEL } from "@cosave/shared";
import { fetchCatalog, fetchProperty } from "@/lib/catalog";
import { cityCoords, detailsFor, formatMxn, galleryFor, similarTo } from "@/lib/mock-data";
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
  const d = demo ? detailsFor(p) : null;
  const paragraphs = d ? d.paragraphs : p.description ? p.description.split(/\n{2,}/) : [];
  const advertiser = demo ? advertiserOf(p.code) : undefined;
  const similar = similarTo(p, (await fetchCatalog()).items);

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
    ["Clave", p.code],
  ];

  return (
    <main className="flex-1 bg-slate-50">
      <div className="mx-auto max-w-[1200px] px-4 py-8">
        <BackButton className="mb-3 inline-block text-sm font-semibold text-ink transition-colors hover:text-azure-hover" />
        <nav aria-label="Ruta" className="mb-4 text-sm text-slate-500">
          <Link href="/properties" className="transition-colors hover:text-ink">Propiedades</Link> /{" "}
          <Link href={isRent ? "/properties/rentals" : "/properties/sale"} className="transition-colors hover:text-ink">
            {isRent ? "En renta" : "En venta"}
          </Link>{" "}
          / <span className="text-ink">{p.code}</span>
        </nav>

        {/* Escritorio: galería y detalles (8 columnas) + panel de contacto fijo (4). Móvil: una columna con el panel tras la galería. */}
        <div className="grid gap-8 lg:grid-cols-12">
          <div className="min-w-0 space-y-8 lg:col-span-8 lg:row-start-1">
            {unavailable && (
              <p role="status" className="rounded-xl border border-slate-300 bg-white p-4 text-sm font-semibold text-ink">
                Esta propiedad ya no está disponible ({unavailable.toLowerCase()}). Puedes ver otras opciones similares más abajo.
              </p>
            )}
            <Gallery images={demo ? galleryFor(p) : (p.images?.length ? p.images : [p.image])} alt={p.title} info={info} />
          </div>

          {/* Panel de contacto */}
          <aside className="lg:col-span-4 lg:col-start-9 lg:row-span-2 lg:row-start-1">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 lg:sticky lg:top-6">
              <span className={`label-sm inline-block rounded-md px-2.5 py-1 ${isRent ? "bg-slate-100 text-slate-600" : "bg-ink text-white"}`}>
                {isRent ? "En renta" : "En venta"} · {p.type}
              </span>
              <h1 className="mt-3 font-display text-2xl font-bold leading-tight tracking-tight text-ink">{p.title}</h1>
              <p className="mt-1 text-sm text-slate-500">{where}</p>
              <div className="mt-5 border-t border-slate-100 pt-5">
                <p className="flex items-baseline">
                  <span className="mr-2 font-display text-3xl font-bold tracking-tight text-ink">{formatMxn(p.price)}</span>
                  <span className="text-xs font-semibold text-slate-500">MXN{isRent && " /mes"}</span>
                </p>
                {p.area > 0 && (
                  <p className="mt-0.5 text-sm text-slate-500">
                    {formatMxn(Math.round(p.price / p.area))} /m²{isRent && " al mes"}
                  </p>
                )}
              </div>
              {(p.bedrooms > 0 || p.bathrooms > 0 || p.area > 0) && (
                <dl className="mt-5 grid grid-cols-3 divide-x divide-slate-100 rounded-xl border border-slate-200 text-center">
                  {([["Recámaras", p.bedrooms], ["Baños", p.bathrooms], ["m² const.", p.area]] as const).map(([k, v]) => (
                    <div key={k} className="px-2 py-3">
                      <dd className="font-display text-lg font-bold text-ink">{v ? v.toLocaleString("es-MX") : "—"}</dd>
                      <dt className="text-[0.7rem] font-medium uppercase tracking-wide text-slate-500">{k}</dt>
                    </div>
                  ))}
                </dl>
              )}
              <div className="mt-5 grid gap-3 [&>*]:w-full [&>*]:justify-center">
                {!unavailable && <WantItButton code={p.code} title={p.title} />}
                {!unavailable && <FavoriteAction code={p.code} />}
                <ShareButton code={p.code} title={p.title} />
              </div>
            </div>
          </aside>

          <div className="min-w-0 space-y-8 lg:col-span-8 lg:row-start-2">
            {/* Sección 1: descripción detallada */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
              <h2 className="headline-sm mb-3 text-ink">Descripción</h2>
              {paragraphs.length > 0 && (
                <div className="space-y-3 whitespace-pre-line text-[0.95rem] leading-relaxed text-slate-700">
                  {paragraphs.map((t) => <p key={t}>{t}</p>)}
                </div>
              )}

              <h2 className="headline-sm mb-3 mt-8 text-ink">Superficie y datos</h2>
              <dl className="grid gap-x-8 sm:grid-cols-2">
                {rows.map(([k, v]) => (
                  <div key={k} className="flex justify-between border-b border-slate-100 py-2 text-sm">
                    <dt className="text-slate-500">{k}</dt>
                    <dd className="font-medium text-ink">{v}</dd>
                  </div>
                ))}
              </dl>

              {d && (
                <div className="mt-8 grid gap-6 sm:grid-cols-2">
                  <div>
                    <h2 className="headline-sm mb-3 text-ink">Características</h2>
                    <ul className="flex flex-wrap gap-2">
                      {d.features.map((f) => <li key={f} className="label-sm rounded-md bg-slate-100 px-2.5 py-1.5 text-slate-600">{f}</li>)}
                    </ul>
                  </div>
                  <div>
                    <h2 className="headline-sm mb-3 text-ink">Materiales de construcción</h2>
                    <ul className="flex flex-wrap gap-2">
                      {d.materials.map((m) => <li key={m} className="label-sm rounded-md bg-slate-100 px-2.5 py-1.5 text-slate-600">{m}</li>)}
                    </ul>
                  </div>
                </div>
              )}
            </section>

            {/* Sección 2: anunciante (solo datos públicos) */}
            <Advertiser user={advertiser} listed={advertiser?.propertyCodes.length ?? 0} name={found.advertiser?.fullName} memberSince={found.advertiser?.memberSince} />

            {/* Sección 3: mapa */}
            {mapSrc && (
              <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
                <h2 className="headline-sm mb-1 text-ink">Ubicación</h2>
                <p className="mb-4 text-sm text-slate-500">{where}{!exact && " (ubicación aproximada)"}</p>
                <iframe title={`Mapa de ${p.title}`} src={mapSrc} loading="lazy" className="h-80 w-full rounded-xl border border-slate-200" />
              </section>
            )}
          </div>
        </div>

        {/* Última sección: propiedades similares */}
        <section className="mt-14">
          <h2 className="mb-1 font-display text-2xl font-bold tracking-tight text-ink">Propiedades similares</h2>
          <p className="mb-6 text-sm text-slate-600">Otras opciones que podrían interesarte.</p>
          <SimilarCarousel items={similar} />
        </section>
      </div>
    </main>
  );
}
