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
  tone?: "white" | "gray" | "ink";
  children: React.ReactNode;
}) {
  const bg = { white: "bg-white", gray: "bg-slate-50", ink: "bg-ink text-white" }[tone];
  const dark = tone === "ink";
  return (
    <section id={id} className={`${bg} py-16 sm:py-24`}>
      <div className="mx-auto max-w-6xl px-4">
        <header className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <p className={`label-sm mb-3 ${dark ? "text-sky-300" : "text-azure"}`}>{eyebrow}</p>
            <h2 className={`font-display text-3xl font-bold tracking-tight sm:text-4xl ${dark ? "text-white" : "text-ink"}`}>{title}</h2>
            {subtitle && <p className={`mt-3 text-base leading-relaxed sm:text-lg ${dark ? "text-slate-300" : "text-slate-600"}`}>{subtitle}</p>}
          </div>
          {action && (
            <Link
              href={action.href}
              className="btn btn-outline px-4 py-2 text-sm"
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
