import Link from "next/link";

/** Aviso centrado con una acción; para páginas que exigen sesión o ser el dueño. */
export function NoticeCard({ title, text, href, cta }: { title: string; text: string; href: string; cta: string }) {
  return (
    <main className="flex flex-1 items-center justify-center bg-slate-50 px-4 py-20">
      <div className="max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center">
        <h1 className="mb-2 text-2xl font-bold text-ink">{title}</h1>
        <p className="mb-5 text-sm text-slate-600">{text}</p>
        <Link href={href} className="inline-block rounded-lg bg-ink px-5 py-2.5 font-semibold text-white transition-colors hover:bg-ink-hover">
          {cta}
        </Link>
      </div>
    </main>
  );
}
