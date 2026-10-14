import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContactPanel } from "@/components/property-detail/contact-panel";
import { ContactGate } from "@/components/property-detail/contact-gate";
import { fetchProperty } from "@/lib/catalog";
import { formatMxn } from "@/lib/mock-data";

export const metadata = { title: "Contactar al anunciante — COSAVE" };

/** Formulario de contacto de una propiedad. Solo con sesión (ver ContactGate). */
export default async function ContactPage({ params }: PageProps<"/contacto/[code]">) {
  const { code } = await params;
  const found = await fetchProperty(code);
  if (!found.found) notFound();
  const p = found.property;

  return (
    <main className="flex-1 bg-slate-50">
      <div className="mx-auto max-w-xl space-y-6 px-4 py-10">
        <Link href={`/properties/${p.code}`} className="inline-block text-sm font-semibold text-navy transition-colors hover:text-accent-hover">
          ← Volver a la propiedad
        </Link>
        <header className="flex items-center gap-4">
          <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-lg">
            <Image src={p.image} alt={p.title} fill sizes="112px" className="object-cover" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-navy">Contactar al anunciante</h1>
            <p className="truncate text-sm text-slate-600">
              {p.title} · {p.city} · {formatMxn(p.price)} MXN{p.operation === "rent" && " /mes"}
            </p>
          </div>
        </header>
        <ContactGate code={p.code}>
          <ContactPanel code={p.code} title={p.title} />
        </ContactGate>
      </div>
    </main>
  );
}
