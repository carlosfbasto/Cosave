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
        <BackButton className="mb-3 inline-block text-sm font-semibold text-navy transition-colors hover:text-accent-hover" />
        <nav aria-label="Ruta" className="mb-4 text-sm text-slate-500">
          <Link href="/properties" className="transition-colors hover:text-navy">Propiedades</Link> /{" "}
          <Link href={isRent ? "/properties/rentals" : "/properties/sale"} className="transition-colors hover:text-navy">
            {isRent ? "En renta" : "En venta"}
          </Link>{" "}
          / <span className="text-navy">{p.code}</span>
        </nav>

        <div className="mx-auto max-w-[860px]">
          <div className="min-w-0 space-y-8">
            {unavailable && (
              <p role="status" className="rounded-xl border border-slate-300 bg-white p-4 text-sm font-semibold text-navy shadow-sm">
                Esta propiedad ya no está disponible ({unavailable.toLowerCase()}). Puedes ver otras opciones similares más abajo.
              </p>
            )}
            <Gallery images={demo ? galleryFor(p) : (p.images?.length ? p.images : [p.image])} alt={p.title} info={info} />

            {/* Sección 1: descripción detallada */}
            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h1 className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">{p.title}</h1>
              <p className="mt-2 flex items-baseline">
                <span className="mr-2 text-[1.4rem] font-bold text-navy">{formatMxn(p.price)}</span>
                <span className="text-xs font-semibold text-slate-500">MXN{isRent && " /mes"}</span>
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                {!unavailable && <WantItButton code={p.code} title={p.title} />}
                {!unavailable && <FavoriteAction code={p.code} />}
                <ShareButton code={p.code} title={p.title} />
              </div>
              {paragraphs.length > 0 && (
                <div className="mt-4 space-y-3 whitespace-pre-line text-[0.95rem] leading-relaxed text-slate-700">
                  {paragraphs.map((t) => <p key={t}>{t}</p>)}
                </div>
              )}

              <h2 className="mb-3 mt-6 text-lg font-bold text-navy">Superficie y datos</h2>
              <dl className="grid gap-x-8 sm:grid-cols-2">
                {rows.map(([k, v]) => (
                  <div key={k} className="flex justify-between border-b border-slate-100 py-2 text-sm">
                    <dt className="text-slate-500">{k}</dt>
                    <dd className="font-medium text-navy">{v}</dd>
                  </div>
                ))}
              </dl>

              {d && (
                <div className="mt-6 grid gap-6 sm:grid-cols-2">
                  <div>
                    <h2 className="mb-2 text-lg font-bold text-navy">Características</h2>
                    <ul className="space-y-1.5 text-sm text-slate-700">
                      {d.features.map((f) => <li key={f} className="flex gap-2"><span className="text-accent">●</span>{f}</li>)}
                    </ul>
                  </div>
                  <div>
                    <h2 className="mb-2 text-lg font-bold text-navy">Materiales de construcción</h2>
                    <ul className="space-y-1.5 text-sm text-slate-700">
                      {d.materials.map((m) => <li key={m} className="flex gap-2"><span className="text-accent">●</span>{m}</li>)}
                    </ul>
                  </div>
                </div>
              )}
            </section>

            {/* Sección 2: anunciante (solo datos públicos) */}
            <Advertiser user={advertiser} listed={advertiser?.propertyCodes.length ?? 0} name={found.advertiser?.fullName} memberSince={found.advertiser?.memberSince} />

            {/* Sección 3: mapa */}
            {mapSrc && (
              <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="mb-1 text-lg font-bold text-navy">Ubicación</h2>
                <p className="mb-4 text-sm text-slate-600">{where}{!exact && " (ubicación aproximada)"}</p>
                <iframe title={`Mapa de ${p.title}`} src={mapSrc} loading="lazy" className="h-80 w-full rounded-lg border-0" />
              </section>
            )}
          </div>

        </div>

        {/* Última sección: propiedades similares */}
        <section className="mt-14">
          <h2 className="mb-1 text-2xl font-bold tracking-tight text-navy">Propiedades similares</h2>
          <p className="mb-6 text-sm text-slate-600">Otras opciones que podrían interesarte.</p>
          <SimilarCarousel items={similar} />
        </section>
      </div>
    </main>
  );
}
