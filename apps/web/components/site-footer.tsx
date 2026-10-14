import Link from "next/link";

const cols = [
  { title: "Explorar", links: [["Ventas", "/properties/sale"], ["Rentas", "/properties/rentals"], ["Todas las propiedades", "/properties"]] },
  { title: "Vender", links: [["Publicar propiedad", "/vender"], ["Buscar un asesor", "/vender"], ["Servicios de foto y video", "/vender"]] },
  { title: "COSAVE", links: [["¿Quiénes somos?", "/quienes-somos"], ["Iniciar sesión", "/login"], ["Crear cuenta", "/registro"]] },
];

export function SiteFooter() {
  return (
    <footer className="bg-navy text-slate-300">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-2xl font-bold text-white">COSA<span className="text-accent">VE</span></p>
          <p className="mt-3 max-w-xs text-sm">
            Encuentra tu propiedad ideal. Si no está todavía, guarda tu búsqueda y te avisamos.
          </p>
          <p className="mt-4 text-sm">contacto@cosave.example</p>
          <p className="text-sm">+52 999 000 0000</p>
        </div>
        {cols.map((c) => (
          <nav key={c.title} aria-label={c.title}>
            <h3 className="mb-3 text-sm font-bold uppercase tracking-widest text-white">{c.title}</h3>
            <ul className="space-y-2 text-sm">
              {c.links.map(([label, href]) => (
                <li key={label}>
                  <Link href={href} className="transition-colors hover:text-accent">{label}</Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-white/10 py-5 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} COSAVE. Todos los derechos reservados.
      </div>
    </footer>
  );
}
