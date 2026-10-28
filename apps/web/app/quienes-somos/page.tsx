import Image from "next/image";
import Link from "next/link";
import { Section } from "@/components/home/section";
import { audiences, company, faqs, mission, services, team, vision } from "@/lib/about-content";

export const metadata = {
  title: "Quiénes somos — COSAVE",
  description: "Qué es COSAVE, qué servicios ofrece, su misión, su visión y el equipo que la conforma.",
};

const svg = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;

const icons: Record<string, React.ReactNode> = {
  search: <g><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></g>,
  bell: <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0" />,
  heart: <path d="M12 21s-7.5-4.6-9.5-9.2C1.2 8.6 3 5 6.5 5c2 0 3.7 1.1 5.5 3 1.8-1.9 3.5-3 5.5-3C21 5 22.8 8.6 21.5 11.8 19.5 16.4 12 21 12 21z" />,
  chat: <path d="M21 12a8 8 0 01-11.8 7L4 20.5 5.5 16A8 8 0 1121 12z" />,
  home: <path d="M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6" />,
  target: <g><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="0.5" /></g>,
  eye: <g><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></g>,
  pin: <g><path d="M12 21s-7-6.2-7-11a7 7 0 0114 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></g>,
  mail: <g><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></g>,
  phone: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z" />,
  clock: <g><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></g>,
};
const arrow = <svg {...svg} className="h-4 w-4"><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
const linkCls = "inline-flex items-center gap-1 text-sm font-semibold text-azure transition-colors hover:text-azure-hover";

const sections = [
  ["que-es", "Qué es COSAVE"],
  ["servicios", "Servicios"],
  ["mision-vision", "Misión y visión"],
  ["equipo", "Equipo"],
  ["preguntas", "Preguntas frecuentes"],
  ["contacto", "Contacto"],
] as const;

/** El ejemplo del README: así funciona la búsqueda guardada. */
const story = [
  { title: "Buscas", text: "Juan busca una casa en Mérida con un presupuesto máximo de $1,200,000 MXN." },
  { title: "Hoy no hay", text: "Ninguna propiedad publicada cumple lo que necesita." },
  { title: "Guarda su búsqueda", text: "Con un clic deja guardados sus criterios en COSAVE." },
  { title: "Te avisamos", text: "Cuando alguien publica esa casa, COSAVE detecta la coincidencia y le avisa." },
];

const initials = (name: string) =>
  name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("");

export default function AboutPage() {
  return (
    <main className="flex-1 bg-slate-50">
      {/* Portada: qué es COSAVE en una frase */}
      <section className="relative isolate overflow-hidden bg-white">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(#0284c7_1px,transparent_1px)] opacity-20 [background-size:28px_28px]" />
        <div className="mx-auto max-w-[1440px] px-4 py-12 md:px-8 md:py-16">
          <nav aria-label="Ruta" className="mb-8 text-xs text-slate-500">
            <Link href="/" className="hover:text-ink">Inicio</Link>
            <span className="mx-1.5" aria-hidden>/</span>
            <span className="font-semibold text-ink" aria-current="page">Quiénes somos</span>
          </nav>
          <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-12">
            <div className="flex flex-col items-start lg:col-span-8">
              <span className="label-sm mb-5 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3.5 py-1.5 text-azure">
                <span aria-hidden className="h-2 w-2 rounded-full bg-azure" />
                Quiénes somos
              </span>
              <h1 className="display-hero max-w-4xl text-ink">
                Buscas, guardas y <span className="text-azure">te avisamos</span>
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
                COSAVE es una plataforma inmobiliaria donde buscas propiedades y, si no encuentras la indicada, guardas tu búsqueda:
                te avisamos cuando aparezca.
              </p>
              <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                <Link href="/properties" className="btn btn-primary px-6 py-3">Buscar propiedades</Link>
                <Link href="/vender" className="btn btn-outline bg-white px-6 py-3">Publicar propiedad</Link>
              </div>
              <p className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-600">
                <span className="flex items-center gap-1.5"><svg {...svg} className="h-4 w-4 text-azure">{icons.pin}</svg>{company.city}</span>
                <span className="flex items-center gap-1.5"><svg {...svg} className="h-4 w-4 text-azure">{icons.clock}</svg>Desde {company.since}</span>
              </p>
            </div>
            {/* Imagen a la derecha con pie: la revisión de publicaciones sí existe en la plataforma. */}
            <div className="relative aspect-[4/5] w-full max-w-md justify-self-center overflow-hidden rounded-3xl border border-slate-200 shadow-veil lg:col-span-4 lg:max-w-none">
              <Image src="/img/casa-moderna.jpg" alt="Casa moderna" fill priority sizes="(min-width: 1024px) 33vw, 100vw" className="object-cover" />
              <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-ink via-ink/30 to-transparent p-6 text-white">
                <span className="label-sm mb-1 flex items-center gap-1.5 text-sky-300">
                  <svg {...svg} className="h-4 w-4"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" /><path d="M9 12l2 2 4-4" /></svg>
                  Publicaciones revisadas
                </span>
                <span className="headline-sm">Cada propiedad pasa por revisión</span>
                <p className="mt-1 text-sm text-slate-300">Antes de mostrarse en el catálogo, revisamos sus datos y fotos.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Índice de la página: salta a cada sección */}
      <nav aria-label="Secciones de la página" className="sticky top-[65px] z-20 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
        <ul className="mx-auto flex max-w-[1440px] gap-1 overflow-x-auto px-4 py-2.5 md:px-8">
          {sections.map(([id, label]) => (
            <li key={id} className="shrink-0">
              <a href={`#${id}`} className="block rounded-full px-3.5 py-1.5 text-[0.85rem] font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-ink">
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <Section
        id="que-es"
        tone="white"
        eyebrow="Qué es COSAVE"
        title="Una búsqueda que sigue trabajando por ti"
        subtitle="Como una alerta de empleo, pero para propiedades: si hoy no está lo que buscas, COSAVE lo sigue buscando por ti."
      >
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <ol className="relative ml-4 flex flex-col gap-6 border-l-2 border-sky-100 pl-8">
            {story.map((s, i) => (
              <li key={s.title} className="relative">
                <span className="absolute -left-[2.85rem] grid h-9 w-9 place-items-center rounded-full bg-white font-display text-sm font-bold text-azure ring-2 ring-sky-200">
                  {i + 1}
                </span>
                <h3 className="headline-sm text-ink">{s.title}</h3>
                <p className="mt-1 text-[0.95rem] leading-relaxed text-slate-600">{s.text}</p>
              </li>
            ))}
          </ol>
          <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-slate-200">
            <Image src="/img/casa-porche.jpg" alt="Fachada de una casa con porche" fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
          </div>
        </div>
      </Section>

      <Section id="servicios" tone="gray" eyebrow="Servicios" title="Qué puedes hacer en COSAVE" subtitle="Todo lo que necesitas para encontrar o publicar una propiedad, en un solo lugar.">
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <li key={s.title} className="card-surface card-hover flex flex-col rounded-2xl p-6">
              <span className="mb-5 grid h-12 w-12 place-items-center rounded-xl bg-sky-50 text-azure ring-1 ring-sky-100">
                <svg {...svg} className="h-6 w-6">{icons[s.icon]}</svg>
              </span>
              <h3 className="headline-sm mb-2 text-ink">{s.title}</h3>
              <p className="mb-5 flex-1 text-[0.95rem] leading-relaxed text-slate-600">{s.text}</p>
              <Link href={s.href} className={linkCls}>{s.cta} {arrow}</Link>
            </li>
          ))}
        </ul>

        <h3 className="headline-sm mb-4 mt-14 text-ink">¿Por dónde empiezo?</h3>
        <ul className="grid gap-4 md:grid-cols-3">
          {audiences.map((a) => (
            <li key={a.title}>
              <Link href={a.href} className="group flex h-full flex-col rounded-2xl bg-ink p-6 text-white transition-colors hover:bg-ink-hover">
                <span className="font-display text-lg font-semibold">{a.title}</span>
                <span className="mt-2 flex-1 text-[0.9rem] leading-relaxed text-slate-300">{a.text}</span>
                <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-sky-300">
                  {a.cta}
                  <span className="transition-transform group-hover:translate-x-0.5">{arrow}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="mision-vision" tone="ink" eyebrow="Misión y visión" title="Lo que nos mueve">
        <div className="grid gap-6 md:grid-cols-2">
          {[
            { icon: icons.target, title: "Misión", text: mission },
            { icon: icons.eye, title: "Visión", text: vision },
          ].map((m) => (
            <article key={m.title} className="rounded-2xl bg-white/5 p-7 ring-1 ring-inset ring-white/10">
              <span className="mb-5 grid h-12 w-12 place-items-center rounded-xl bg-azure/20 text-sky-300">
                <svg {...svg} className="h-6 w-6">{m.icon}</svg>
              </span>
              <h3 className="headline-sm mb-3 text-white">{m.title}</h3>
              <p className="text-base leading-relaxed text-slate-300">{m.text}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section id="equipo" tone="white" eyebrow="Equipo" title="Quiénes conformamos COSAVE" subtitle="Personas que revisan, construyen y atienden la plataforma todos los días.">
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {team.map((m) => (
            <li key={m.name} className="card-surface flex flex-col items-start rounded-2xl p-6">
              <span aria-hidden className="mb-5 grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-ink to-azure font-display text-xl font-bold text-white">
                {initials(m.name)}
              </span>
              <h3 className="font-display text-lg font-semibold text-ink">{m.name}</h3>
              <p className="label-sm mt-1 text-azure">{m.role}</p>
              <p className="mt-3 text-[0.9rem] leading-relaxed text-slate-600">{m.bio}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="preguntas" tone="gray" eyebrow="Preguntas frecuentes" title="Resolvemos tus dudas" subtitle="Lo que más nos preguntan quienes usan COSAVE por primera vez.">
        <div className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {faqs.map((f) => (
            <details key={f.q} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 text-left font-semibold text-ink transition-colors hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
                {f.q}
                <svg {...svg} className="h-5 w-5 shrink-0 text-slate-500 transition-transform group-open:rotate-180"><path d="M6 9l6 6 6-6" /></svg>
              </summary>
              <p className="px-6 pb-5 text-[0.95rem] leading-relaxed text-slate-600">{f.a}</p>
            </details>
          ))}
        </div>
      </Section>

      <Section id="contacto" tone="white" eyebrow="Contacto" title="Hablemos" subtitle="¿Tienes una duda que no está en las preguntas frecuentes? Escríbenos o llámanos.">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <ul className="card-surface flex flex-col gap-5 rounded-2xl p-6">
            {[
              { icon: icons.pin, label: "Oficina", value: company.address },
              { icon: icons.mail, label: "Correo", value: company.email, href: `mailto:${company.email}` },
              { icon: icons.phone, label: "Teléfono", value: company.phone, href: `tel:${company.phone.replace(/\s/g, "")}` },
              { icon: icons.clock, label: "Horario", value: company.hours },
            ].map((c) => (
              <li key={c.label} className="flex items-start gap-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sky-50 text-azure ring-1 ring-sky-100">
                  <svg {...svg} className="h-5 w-5">{c.icon}</svg>
                </span>
                <div>
                  <p className="label-sm text-slate-500">{c.label}</p>
                  {c.href ? (
                    <a href={c.href} className="font-medium text-ink hover:text-azure">{c.value}</a>
                  ) : (
                    <p className="font-medium text-ink">{c.value}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <div className="relative isolate flex flex-col justify-center overflow-hidden rounded-2xl bg-ink p-8 text-white md:p-10">
            <div aria-hidden className="pointer-events-none absolute -bottom-24 -right-24 -z-10 h-80 w-80 rounded-full bg-azure/30 blur-3xl" />
            <h3 className="font-display text-2xl font-bold tracking-tight">¿No encuentras lo que buscas?</h3>
            <p className="mt-2 max-w-lg text-slate-300">Empieza a buscar y, si no está todavía, guarda tu búsqueda: te avisamos cuando aparezca.</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href="/properties" className="btn btn-accent px-6 py-3">Buscar propiedades</Link>
              <Link href="/vender" className="btn border border-white/30 px-6 py-3 text-white hover:bg-white/10">Publicar propiedad</Link>
            </div>
          </div>
        </div>
      </Section>
    </main>
  );
}
