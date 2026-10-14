import Link from "next/link";

export function Section({
  id,
  eyebrow,
  title,
  subtitle,
  action,
  tone = "white",
  children,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  subtitle?: string;
  action?: { href: string; label: string };
  tone?: "white" | "gray" | "navy";
  children: React.ReactNode;
}) {
  const bg = { white: "bg-white", gray: "bg-slate-50", navy: "bg-navy text-white" }[tone];
  const dark = tone === "navy";
  return (
    <section id={id} className={`${bg} py-16 sm:py-24`}>
      <div className="mx-auto max-w-6xl px-4">
        <header className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <p className={`mb-2 text-sm font-bold uppercase tracking-widest ${dark ? "text-accent" : "text-navy-light"}`}>{eyebrow}</p>
            <h2 className={`text-3xl font-bold tracking-tight sm:text-4xl ${dark ? "text-white" : "text-navy"}`}>{title}</h2>
            {subtitle && <p className={`mt-3 text-base sm:text-lg ${dark ? "text-slate-300" : "text-slate-600"}`}>{subtitle}</p>}
          </div>
          {action && (
            <Link
              href={action.href}
              className="rounded-md border border-navy px-4 py-2 text-sm font-semibold text-navy transition-colors hover:bg-navy hover:text-white"
            >
              {action.label} →
            </Link>
          )}
        </header>
        {children}
      </div>
    </section>
  );
}
