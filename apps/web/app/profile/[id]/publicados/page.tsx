import Link from "next/link";
import { AccountListings } from "@/components/user/account-listings";
import { PropertyGrid } from "@/components/property-card";
import { listedProperties } from "@/lib/mock-data";
import { getMockUser } from "@/lib/mock-users";

/** Propiedades publicadas por el usuario (datos ficticios). Los compradores no publican; ven una invitación. */
export default async function PublishedPage({ params }: PageProps<"/profile/[id]/publicados">) {
  const { id } = await params;
  const u = getMockUser(id);
  if (!u) return <AccountListings id={id} />;
  const items = u.role === "buyer" ? [] : listedProperties.filter((p) => u.propertyCodes.includes(p.code));

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-6 py-10">
      <header>
        <h1 className="text-[20px] font-semibold text-ink">Publicados</h1>
        <p className="mt-1 text-sm text-slate-600">
          {items.length === 0 ? "Aún no hay propiedades publicadas." : `${items.length} ${items.length === 1 ? "propiedad publicada" : "propiedades publicadas"}.`}
        </p>
      </header>
      {items.length === 0 ? (
        <div className="py-10 text-center">
          <Link href="/vender" className="inline-block rounded-lg bg-ink px-5 py-2.5 font-semibold text-white transition-colors hover:bg-ink-hover">
            Quiero vender mi propiedad
          </Link>
        </div>
      ) : (
        <PropertyGrid items={items} cols={2} />
      )}
    </main>
  );
}
