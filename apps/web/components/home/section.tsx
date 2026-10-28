import Link from "next/link";

/** Sección de la portada. `actions` reemplaza al botón simple de `action` cuando hay más de uno. */
export function Section({
  id,
  eyebrow,
  title,
  subtitle,
  action,
  actions,
  tone = "white",
  children,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  subtitle?: string;
  action?: { href: string; label: string };
  actions?: React.ReactNode;
  tone?: "white" | "gray" | "ink";
  children: React.ReactNode;
}) {
  const bg = { white: "bg-white", gray: "bg-slate-50", ink: "bg-ink text-white" }[tone];
  const dark = tone === "ink";
  return (
    <section id={id} className={`${bg} scroll-mt-28 py-14 sm:py-20`}>
      <div className="mx-auto max-w-[1440px] px-4 md:px-8">
        <header className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <p className={`label-sm mb-3 flex items-center gap-2 ${dark ? "text-sky-300" : "text-slate-500"}`}>
              <span aria-hidden className={`h-2 w-2 rounded-full ${dark ? "bg-sky-300" : "bg-azure"}`} />
              {eyebrow}
            </p>
            <h2 className={`font-display text-3xl font-bold tracking-tight sm:text-[2rem] sm:leading-10 ${dark ? "text-white" : "text-ink"}`}>{title}</h2>
            {subtitle && <p className={`mt-2 text-[0.95rem] leading-relaxed sm:text-base ${dark ? "text-slate-300" : "text-slate-600"}`}>{subtitle}</p>}
          </div>
          {actions ?? (action && (
            <Link href={action.href} className="btn btn-outline px-4 py-2 text-sm">
              {action.label} →
            </Link>
          ))}
        </header>
        {children}
      </div>
    </section>
  );
}
