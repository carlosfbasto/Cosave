export const PAGE_SIZE = 12;

/** Números a mostrar: primera, última y vecinas de la actual; `null` = "…". */
function pages(current: number, total: number): (number | null)[] {
  const wanted = new Set([1, total, current - 1, current, current + 1].filter((n) => n >= 1 && n <= total));
  const sorted = [...wanted].sort((a, b) => a - b);
  return sorted.flatMap((n, i) => (i > 0 && n - sorted[i - 1] > 1 ? [null, n] : [n]));
}

const btnCls = "grid h-9 min-w-9 cursor-pointer place-items-center rounded-lg px-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40";

export function Pagination({ page, total, onChange }: { page: number; total: number; onChange: (page: number) => void }) {
  const last = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);
  return (
    <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
      <p className="text-sm text-slate-500">
        Mostrando <span className="font-semibold text-ink">{from}–{to}</span> de <span className="font-semibold text-ink">{total}</span> {total === 1 ? "propiedad" : "propiedades"}
      </p>
      {last > 1 && (
        <nav aria-label="Páginas de resultados" className="flex items-center gap-1">
          <button type="button" onClick={() => onChange(page - 1)} disabled={page <= 1} aria-label="Página anterior" className={`${btnCls} text-slate-600 hover:bg-white`}>
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M15 6l-6 6 6 6" /></svg>
          </button>
          {pages(page, last).map((n, i) =>
            n === null ? (
              <span key={`gap-${i}`} className="px-1 text-slate-400" aria-hidden>…</span>
            ) : (
              <button
                key={n}
                type="button"
                onClick={() => onChange(n)}
                aria-current={n === page ? "page" : undefined}
                className={`${btnCls} ${n === page ? "bg-ink text-white" : "border border-slate-200 bg-white text-ink hover:border-slate-300"}`}
              >
                {n}
              </button>
            ),
          )}
          <button type="button" onClick={() => onChange(page + 1)} disabled={page >= last} aria-label="Página siguiente" className={`${btnCls} text-slate-600 hover:bg-white`}>
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M9 6l6 6-6 6" /></svg>
          </button>
        </nav>
      )}
    </div>
  );
}
