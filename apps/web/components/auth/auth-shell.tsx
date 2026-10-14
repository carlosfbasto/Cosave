import Link from "next/link";

/** Marco común de las pantallas de cuenta: tarjeta centrada y enlace para regresar. */
export function AuthShell({
  title,
  subtitle,
  backHref,
  backLabel = "← Volver",
  children,
}: {
  title: string;
  subtitle?: string;
  backHref: string;
  backLabel?: string;
  children?: React.ReactNode;
}) {
  return (
    <main className="flex flex-1 items-start justify-center bg-slate-50 px-4 py-12 sm:items-center">
      <div className="w-full max-w-md space-y-4">
        <Link href={backHref} className="inline-block text-sm font-semibold text-navy transition-colors hover:text-accent-hover">
          {backLabel}
        </Link>
        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold tracking-tight text-navy">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </main>
  );
}

const field =
  "w-full rounded-md border bg-white px-3 py-2 text-sm text-slate-800 transition-colors placeholder:text-slate-400 hover:border-navy-light focus:border-navy focus:outline-none";

export function TextField({
  id,
  label,
  error,
  ...props
}: { id: string; label: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-[0.9rem] font-medium text-navy">
        {label}
      </label>
      <input
        id={id}
        name={id}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`${field} ${error ? "border-red-500" : "border-slate-300"}`}
        {...props}
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

export function SubmitButton({ loading, children }: { loading: boolean; children: React.ReactNode }) {
  return (
    <button
      disabled={loading}
      className="w-full cursor-pointer rounded-md bg-accent px-4 py-3 font-semibold text-navy transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
    >
      {children}
    </button>
  );
}

export const linkCls = "font-semibold text-navy underline transition-colors hover:text-accent-hover";

export function Banner({ tone, children }: { tone: "error" | "info" | "success"; children: React.ReactNode }) {
  const cls = {
    error: "bg-red-50 text-red-700 ring-red-200",
    info: "bg-amber-50 text-slate-700 ring-accent",
    success: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  }[tone];
  return (
    <p role={tone === "error" ? "alert" : "status"} className={`rounded-md px-4 py-3 text-sm ring-1 ${cls}`}>
      {children}
    </p>
  );
}
