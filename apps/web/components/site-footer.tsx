import Link from "next/link";

const cols = [
  { title: "Explorar", links: [["Ventas", "/properties/sale"], ["Rentas", "/properties/rentals"], ["Todas las propiedades", "/properties"]] },
  { title: "Vender", links: [["Publicar propiedad", "/vender"], ["Buscar un asesor", "/vender"], ["Servicios de foto y video", "/vender"]] },
  { title: "COSAVE", links: [["¿Quiénes somos?", "/quienes-somos"], ["Iniciar sesión", "/login"], ["Crear cuenta", "/registro"]] },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white text-slate-600">
      <div className="mx-auto grid max-w-[1440px] gap-10 px-4 py-14 sm:grid-cols-2 md:px-8 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <p className="font-display text-2xl font-bold tracking-tight text-ink">COSA<span className="text-azure">VE</span></p>
          <p className="mt-3 max-w-sm text-[0.95rem] leading-relaxed">
            Encuentra tu propiedad ideal. Si no está todavía, guarda tu búsqueda y te avisamos.
          </p>
          <p className="mt-4 text-sm">contacto@cosave.example</p>
          <p className="text-sm">+52 999 000 0000</p>
        </div>
        {cols.map((c) => (
          <nav key={c.title} aria-label={c.title}>
            <h3 className="label-sm mb-4 text-ink">{c.title}</h3>
            <ul className="space-y-2.5 text-[0.95rem]">
              {c.links.map(([label, href]) => (
                <li key={label}>
                  <Link href={href} className="transition-colors hover:text-ink">{label}</Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="mx-auto max-w-[1440px] border-t border-slate-100 px-4 py-6 text-sm text-slate-500 md:px-8">
        © {new Date().getFullYear()} COSAVE. Todos los derechos reservados.
      </div>
    </footer>
  );
}
