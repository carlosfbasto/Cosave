import Link from "next/link";
import { AuthLink } from "@/components/auth-link";
import { steps, trustStats } from "@/lib/mock-data";
import { SaveSearchButton } from "./hero-search";

const svg = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;

const trustIcons = [
  <path key="i" d="M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6" />,
  <path key="i" d="M16 20v-1a4 4 0 00-4-4H7a4 4 0 00-4 4v1M9.5 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM21 20v-1a4 4 0 00-3-3.9M16 4.1a3.5 3.5 0 010 6.8" />,
  <path key="i" d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0" />,
  <path key="i" d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3z" />,
];

/** Cifras de confianza montadas sobre el borde inferior del hero. */
export function TrustBar() {
  return (
    <section aria-label="COSAVE en cifras" className="relative z-10 mx-auto -mt-12 max-w-[1440px] px-4 md:px-8">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-8 rounded-2xl border border-slate-200 bg-white px-6 py-7 shadow-glow md:px-10 lg:grid-cols-4">
        {trustStats.map((s, i) => (
          <div key={s.label} className="flex flex-col gap-0.5">
            <dd className="order-1 flex items-center gap-2">
              <span className="font-display text-3xl font-bold tracking-tight text-ink">{s.value}</span>
              <svg {...svg} className="h-5 w-5 text-azure">{trustIcons[i]}</svg>
            </dd>
            <dt className="order-2 text-sm font-semibold text-ink">{s.label}</dt>
            <dd className="order-3 text-[0.8rem] text-slate-500">{s.detail}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** "¿No encontraste lo que buscas?": abre el modal de búsqueda guardada con lo elegido en la consola. */
export function SaveSearchBand() {
  return (
    <section className="mx-auto max-w-[1440px] px-4 md:px-8">
      <div className="flex flex-col gap-5 rounded-2xl border border-sky-200 bg-sky-50 p-6 md:flex-row md:items-center md:justify-between md:p-8">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white text-azure ring-1 ring-sky-200">
            <svg {...svg} className="h-6 w-6">{trustIcons[2]}</svg>
          </span>
          <div>
            <h2 className="headline-sm text-ink">¿No encontraste lo que buscas?</h2>
            <p className="mt-1 max-w-xl text-[0.95rem] text-slate-600">
              Guarda tu búsqueda y COSAVE te avisará en cuanto se publique una propiedad que coincida.
            </p>
          </div>
        </div>
        <SaveSearchButton className="btn btn-accent shrink-0 px-6 py-3">Guardar mi búsqueda</SaveSearchButton>
      </div>
    </section>
  );
}

const stepIcons = [
  <g key="i"><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></g>,
  <path key="i" d="M6 3h12a1 1 0 011 1v17l-7-4-7 4V4a1 1 0 011-1z" />,
  trustIcons[2],
  <path key="i" d="M21 12a8 8 0 01-11.8 7L4 20.5 5.5 16A8 8 0 1121 12z" />,
];

const linkCls = "inline-flex items-center gap-1 text-sm font-semibold text-azure transition-colors hover:text-azure-hover";
const arrow = <svg {...svg} className="h-4 w-4"><path d="M5 12h14M13 6l6 6-6 6" /></svg>;

/** Pie de cada paso de "¿Cómo funciona?": dato breve y, si aplica, la acción. */
const stepFooters: { note: string; action?: React.ReactNode }[] = [
  { note: "Filtros por ubicación, tipo y precio", action: <Link href="/properties" className={linkCls}>Ver propiedades {arrow}</Link> },
  { note: "Tus criterios, guardados", action: <SaveSearchButton className={`${linkCls} cursor-pointer disabled:opacity-60`}>Guardar mi búsqueda {arrow}</SaveSearchButton> },
  { note: "Alertas automáticas" },
  { note: "Directo con el anunciante", action: <Link href="/properties" className={linkCls}>Explorar propiedades {arrow}</Link> },
];

/** Pasos de "¿Cómo funciona?" como tarjetas con ícono. */
export function StepCards() {
  return (
    <ol className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
      {steps.map((s, i) => (
        <li key={s.title} className="flex flex-col rounded-2xl bg-slate-50 p-6 ring-1 ring-inset ring-slate-200/70 transition-colors hover:bg-slate-100/70">
          <span className="mb-5 grid h-12 w-12 place-items-center rounded-xl bg-white text-azure ring-1 ring-slate-200">
            <svg {...svg} className="h-6 w-6">{stepIcons[i]}</svg>
          </span>
          <h3 className="headline-sm mb-2 text-ink">{s.title}</h3>
          <p className="mb-6 flex-1 text-[0.95rem] leading-relaxed text-slate-600">{s.text}</p>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-4">
            <span className="text-xs font-semibold text-ink">{stepFooters[i]?.note}</span>
            {stepFooters[i]?.action}
          </div>
        </li>
      ))}
    </ol>
  );
}

const check = <svg {...svg} className="h-5 w-5 shrink-0 text-sky-400"><circle cx="12" cy="12" r="9" /><path d="M8.5 12.5l2.5 2.5 4.5-5" /></svg>;

/** Banner de captación para propietarios y asesores. */
export function OwnerBanner() {
  return (
    <section className="mx-auto max-w-[1440px] px-4 md:px-8">
      <div className="relative isolate overflow-hidden rounded-2xl bg-ink p-8 text-white md:p-12">
        <div aria-hidden className="pointer-events-none absolute -bottom-24 -right-24 -z-10 h-96 w-96 rounded-full bg-azure/30 blur-3xl" />
        <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
          <div className="flex max-w-2xl flex-col gap-3">
            <span className="label-sm inline-flex w-fit items-center gap-2 rounded-md bg-white/10 px-2.5 py-1 text-sky-200">
              <svg {...svg} className="h-4 w-4"><path d="M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6" /></svg>
              Propietarios y asesores
            </span>
            <h2 className="font-display text-3xl font-bold tracking-tight">¿Quieres vender o rentar tu propiedad?</h2>
            <p className="text-base leading-relaxed text-slate-300 md:text-lg">
              Publícala en minutos y recibe contactos de personas interesadas. Si lo prefieres, te conectamos con un asesor
              inmobiliario o con servicios de foto y video.
            </p>
            <ul className="mt-1 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-slate-200">
              <li className="flex items-center gap-2">{check}Contacto directo con interesados</li>
              <li className="flex items-center gap-2">{check}Asesores y servicios de foto y video</li>
            </ul>
          </div>
          <div className="flex w-full shrink-0 flex-col gap-3 sm:w-auto sm:flex-row lg:flex-col">
            <AuthLink href="/vender" className="btn bg-white px-6 py-3 text-ink hover:bg-slate-100">
              Publicar propiedad
            </AuthLink>
            <AuthLink href="/vender" className="btn bg-white/10 px-6 py-3 text-white hover:bg-white/20">
              Buscar un asesor
              <svg {...svg} className="h-4 w-4"><path d="M9 6l6 6-6 6" /></svg>
            </AuthLink>
          </div>
        </div>
      </div>
    </section>
  );
}
