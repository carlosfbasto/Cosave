import Link from "next/link";
import { ProfileIcon, type ProfileIconName } from "@/components/user/profile-icons";

/** Contenedor de cada sección del perfil: título, descripción y acción opcional a la derecha. `before`: fila sobre el título (p. ej. «Volver»). */
export function ProfileSection({ title, description, action, before, wide = false, children }: { title: string; description?: React.ReactNode; action?: React.ReactNode; before?: React.ReactNode; wide?: boolean; children: React.ReactNode }) {
  return (
    <main className={`mx-auto w-full flex-1 space-y-6 px-4 py-8 sm:px-8 sm:py-10 ${wide ? "max-w-6xl" : "max-w-5xl"}`}>
      {before}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="headline-md text-ink">{title}</h1>
          {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
        </div>
        {action}
      </header>
      {children}
    </main>
  );
}

/** Tarjeta blanca con encabezado (título, subtítulo y acción) separada del contenido por una línea fina. */
export function PanelCard({ title, description, action, children }: { title: string; description?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="card-surface rounded-2xl p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-[1.05rem] font-semibold text-ink">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Estado vacío: ícono en círculo, texto y una acción. */
export function EmptyState({ icon, title, text, href, cta }: { icon: ProfileIconName; title: string; text: string; href: string; cta: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-500">
        <ProfileIcon name={icon} className="h-6 w-6" />
      </span>
      <h2 className="mt-4 text-[0.95rem] font-semibold text-ink">{title}</h2>
      <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">{text}</p>
      <Link href={href} className="btn btn-primary mt-5 px-5 py-2.5 text-sm">
        {cta}
      </Link>
    </div>
  );
}

/** Ícono cuadrado de las filas (consultas, búsquedas). */
export function RowIcon({ name }: { name: ProfileIconName }) {
  return (
    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-sky-50 text-azure">
      <ProfileIcon name={name} className="h-5 w-5" />
    </span>
  );
}

export function Loading() {
  return <p className="text-sm text-slate-500">Cargando…</p>;
}

export function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {children}
    </p>
  );
}
