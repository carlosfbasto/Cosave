import { AccountListings } from "@/components/user/account-listings";
import { PropertyGrid } from "@/components/property-card";
import { EmptyState, ProfileSection } from "@/components/user/profile-section";
import { listedProperties } from "@/lib/mock-data";
import { getMockUser } from "@/lib/mock-users";

/** Propiedades publicadas por el usuario (datos ficticios). Los compradores no publican; ven una invitación. */
export default async function PublishedPage({ params }: PageProps<"/profile/[id]/publicados">) {
  const { id } = await params;
  const u = getMockUser(id);
  if (!u) return <AccountListings id={id} />;
  const items = u.role === "buyer" ? [] : listedProperties.filter((p) => u.propertyCodes.includes(p.code));

  return (
    <ProfileSection
      wide
      title="Publicados"
      description={items.length === 0 ? "Aún no hay propiedades publicadas." : `${items.length} ${items.length === 1 ? "propiedad publicada" : "propiedades publicadas"}.`}
    >
      {items.length === 0 ? (
        <EmptyState icon="home" title="Sin propiedades publicadas" text="Publica tu casa, departamento, terreno o bodega y recibe consultas de personas interesadas." href="/vender" cta="Quiero vender mi propiedad" />
      ) : (
        <PropertyGrid items={items} cols={2} />
      )}
    </ProfileSection>
  );
}
