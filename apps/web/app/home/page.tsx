import Image from "next/image";
import Link from "next/link";
import { AuthLink } from "@/components/auth-link";
import { HeroSearch } from "@/components/home/hero-search";
import { ImageTile } from "@/components/home/image-tile";
import { Section } from "@/components/home/section";
import { PropertyGrid } from "@/components/property-card";
import { fetchCatalog } from "@/lib/catalog";
import { slugify, steps, testimonials, trustStats, type ListedProperty } from "@/lib/mock-data";

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
  const sorted = (key: "type" | "city") => [...new Set(items.map((p) => p[key]))].filter(Boolean).sort((a, b) => a.localeCompare(b, "es"));
  const cities = sorted("city");
  const types = sorted("type");
  return (
    <main className="flex-1">
      {/* Portada: imagen de fondo (de prueba) con capa ink para legibilidad */}
      <div className="bg-slate-50 p-3 sm:p-6">
        <section className="relative isolate mx-auto flex min-h-[30rem] max-w-6xl items-center overflow-hidden rounded-3xl sm:min-h-[36rem]">
          <Image
            src="/hero.jpg"
            alt="Casa moderna con jardín"
            fill
            priority
            sizes="(min-width: 1152px) 1152px, 100vw"
            className="-z-20 object-cover"
          />
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink/85 via-ink/60 to-ink/10" />

          <div className="flex w-full flex-col gap-6 px-6 py-12 sm:px-12">
            <h1 className="display-hero max-w-2xl text-white">
              ¿Qué estás buscando? <span className="text-sky-300">Encuentra tu casa ideal</span>
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-slate-200 sm:text-lg">
              Explora casas, terrenos y departamentos en venta o renta. ¿No encuentras lo que buscas? Guarda tu búsqueda y
              te avisamos cuando aparezca la propiedad indicada.
            </p>
            <HeroSearch cities={cities} types={types} />
            <div className="flex flex-wrap gap-3">
              <Link
                href="/properties"
                className="btn bg-white px-5 py-2.5 text-ink hover:bg-slate-100"
              >
                Explorar propiedades
              </Link>
              <AuthLink
                href="/vender"
                className="btn border border-white/60 px-5 py-2.5 text-white hover:border-white hover:bg-white/10"
              >
                Quiero vender
              </AuthLink>
            </div>
          </div>
        </section>
      </div>

      <Section
        id="destacadas"
        tone="gray"
        eyebrow="Selección COSAVE"
        title="Propiedades destacadas"
        subtitle="Las opciones mejor valoradas de la semana, listas para visitar."
        action={{ href: "/properties", label: "Ver todas" }}
      >
        <PropertyGrid items={featuredProperties} smallStats />
      </Section>

      <Section
        tone="white"
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
        id="como-funciona"
        tone="ink"
        eyebrow="Paso a paso"
        title="¿Cómo funciona?"
        subtitle="Cuatro pasos sencillos. COSAVE trabaja por ti aunque no estés buscando."
      >
        <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <li key={s.title} className="rounded-xl border border-white/10 bg-white/5 p-6 transition-colors hover:bg-white/10">
              <span className="mb-4 grid h-11 w-11 place-items-center rounded-full bg-white/10 font-display text-lg font-bold text-sky-300 ring-1 ring-inset ring-white/20">
                {i + 1}
              </span>
              <h3 className="headline-sm mb-2">{s.title}</h3>
              <p className="text-sm text-slate-300">{s.text}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section
        tone="white"
        eyebrow="Novedades"
        title="Propiedades recientes"
        subtitle="Acaban de publicarse. Sé de los primeros en contactar."
        action={{ href: "/properties", label: "Ver más" }}
      >
        <PropertyGrid items={recentProperties} smallStats />
      </Section>

      <Section
        tone="gray"
        eyebrow="Confianza"
        title="Miles de personas ya confían en COSAVE"
        subtitle="Compradores, propietarios y asesores que encontraron lo que buscaban."
      >
        <dl className="mb-12 grid grid-cols-2 gap-6 lg:grid-cols-4">
          {trustStats.map((s) => (
            <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-6 text-center">
              <dd className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">{s.value}</dd>
              <dt className="mt-1 text-sm text-slate-600">{s.label}</dt>
            </div>
          ))}
        </dl>
        <div className="grid gap-6 md:grid-cols-3">
          {testimonials.map((t) => (
            <figure key={t.name} className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 transition-[border-color,box-shadow] hover:border-slate-300 hover:shadow-glow">
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
    </main>
  );
}
