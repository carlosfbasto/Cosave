import Image from "next/image";
import Link from "next/link";
import { HeroSearch, HomeSearchProvider } from "@/components/home/hero-search";
import { OwnerBanner, SaveSearchBand, StepCards, TrustBar } from "@/components/home/home-sections";
import { ImageTile } from "@/components/home/image-tile";
import { ShowcaseGrid } from "@/components/home/property-showcase-card";
import { Section } from "@/components/home/section";
import { fetchCatalog } from "@/lib/catalog";
import { slugify, testimonials, type ListedProperty } from "@/lib/mock-data";

const TYPE_TILE: Record<string, { label: string; image: string }> = {
  Casa: { label: "Casas", image: "/img/casa-porche.jpg" },
  Departamento: { label: "Departamentos", image: "/img/edificio.jpg" },
  Terreno: { label: "Terrenos", image: "/img/terreno.jpg" },
  "Local comercial": { label: "Locales y bodegas", image: "/img/bodega-comercial.jpg" },
  "Bodega Comercial": { label: "Bodegas comerciales", image: "/img/bodega-comercial.jpg" },
  "Bodega Industrial": { label: "Bodegas industriales", image: "/img/bodega-industrial.jpg" },
  Otro: { label: "Otros inmuebles", image: "/img/ciudad.jpg" },
};

/** Los 4 valores más frecuentes de un campo, con su conteo. */
function top(items: ListedProperty[], key: "type" | "city") {
  const counts = new Map<string, number>();
  for (const p of items) counts.set(p[key], (counts.get(p[key]) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1]).slice(0, 4);
}

export default async function Home() {
  const { items } = await fetchCatalog();
  const recentProperties = items.slice(0, 4);
  const featuredProperties = items.length > 4 ? items.slice(4, 8) : recentProperties;
  const propertyTypeTiles = top(items, "type").map(([value, count]) => ({
    slug: slugify(value),
    label: TYPE_TILE[value]?.label ?? value,
    image: TYPE_TILE[value]?.image ?? "/img/ciudad.jpg",
    count,
  }));
  const locationTiles = top(items, "city").map(([value, count]) => ({
    slug: slugify(value),
    label: value,
    image: items.find((p) => p.city === value)?.image ?? "/img/ciudad.jpg",
    count,
  }));

  return (
    <main className="flex-1 bg-slate-50">
      <HomeSearchProvider>
        {/* Portada: foto de fondo (de prueba) en tono azul marino, con la consola de búsqueda */}
        <section className="relative isolate overflow-hidden bg-ink text-white">
          <Image
            src="/hero.jpg"
            alt=""
            fill
            priority
            sizes="100vw"
            className="-z-20 object-cover opacity-30 mix-blend-luminosity"
          />
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink via-ink/85 to-ink/40" />

          <div className="mx-auto flex max-w-[1440px] flex-col items-center px-4 pb-28 pt-14 text-center md:px-8 md:pb-36 md:pt-20">
            <span className="label-sm mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-slate-100 backdrop-blur-md">
              <span aria-hidden className="h-2 w-2 animate-pulse rounded-full bg-sky-400" />
              Te avisamos cuando aparezca tu propiedad
            </span>
            <h1 className="display-hero max-w-4xl">
              ¿Qué estás buscando? <span className="text-sky-300">Encuentra tu casa ideal</span>
            </h1>
            <p className="mb-10 mt-4 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
              Explora casas, terrenos y departamentos en venta o renta. ¿No encuentras lo que buscas? Guarda tu búsqueda y
              te avisamos cuando aparezca la propiedad indicada.
            </p>
            <HeroSearch />
          </div>
        </section>

        <TrustBar />

        <Section
          id="destacadas"
          tone="gray"
          eyebrow="Selección COSAVE"
          title="Propiedades destacadas"
          subtitle="Las opciones mejor valoradas de la semana, listas para visitar."
          actions={
            <div className="flex flex-wrap gap-2">
              <Link href="/properties/map" className="btn bg-slate-200/70 px-4 py-2 text-sm text-ink hover:bg-slate-200">
                Ver mapa
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden>
                  <path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14" />
                </svg>
              </Link>
              <Link href="/properties" className="btn btn-primary px-4 py-2 text-sm">
                Ver todas →
              </Link>
            </div>
          }
        >
          <ShowcaseGrid items={featuredProperties} />
        </Section>

        <SaveSearchBand />

        <Section
          id="como-funciona"
          tone="gray"
          eyebrow="Paso a paso"
          title="¿Cómo funciona?"
          subtitle="Cuatro pasos sencillos. COSAVE trabaja por ti aunque no estés buscando."
        >
          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
            <StepCards />
          </div>
        </Section>

        <Section
          tone="gray"
          eyebrow="Categorías"
          title="Explora por tipo de propiedad"
          subtitle="Encuentra el espacio que se adapta a tu estilo de vida o negocio."
        >
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {propertyTypeTiles.map((t) => (
              <ImageTile key={t.slug} href={`/properties?tipo=${t.slug}`} image={t.image} label={t.label} count={t.count} />
            ))}
          </div>
        </Section>

        <Section
          tone="gray"
          eyebrow="Dónde vivir"
          title="Explora por ubicación"
          subtitle="Las ciudades con más movimiento en COSAVE."
        >
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {locationTiles.map((l) => (
              <ImageTile key={l.slug} href={`/properties?ciudad=${l.slug}`} image={l.image} label={l.label} count={l.count} />
            ))}
          </div>
        </Section>

        <Section
          tone="gray"
          eyebrow="Novedades"
          title="Propiedades recientes"
          subtitle="Acaban de publicarse. Sé de los primeros en contactar."
          action={{ href: "/properties", label: "Ver más" }}
        >
          <ShowcaseGrid items={recentProperties} />
        </Section>

        <Section
          tone="gray"
          eyebrow="Confianza"
          title="Miles de personas ya confían en COSAVE"
          subtitle="Compradores, propietarios y asesores que encontraron lo que buscaban."
        >
          <div className="grid gap-6 md:grid-cols-3">
            {testimonials.map((t) => (
              <figure key={t.name} className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 transition-[border-color,box-shadow] hover:border-slate-300 hover:shadow-glow">
                <span className="font-display text-4xl leading-none text-azure" aria-hidden>“</span>
                <blockquote className="text-slate-700">{t.text}</blockquote>
                <figcaption className="mt-auto flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-ink text-sm font-bold text-white">
                    {t.name.split(" ").map((w) => w[0]).join("")}
                  </span>
                  <span className="text-sm">
                    <strong className="block text-ink">{t.name}</strong>
                    <span className="text-slate-500">{t.role}</span>
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        </Section>

        <div className="pb-16 sm:pb-20">
          <OwnerBanner />
        </div>
      </HomeSearchProvider>
    </main>
  );
}
