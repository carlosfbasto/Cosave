import { AccountProfile } from "@/components/user/account-profile";
import { ProfileDetails } from "@/components/user/profile-details";
import { ProfileHeader } from "@/components/user/profile-header";
import { formatDate, getMockUser } from "@/lib/mock-users";

/** Perfil de un usuario ficticio. El rol es interno: no se muestra. */
export default async function UserProfilePage({ params }: PageProps<"/profile/[id]">) {
  const { id } = await params;
  const u = getMockUser(id);
  if (!u) return <AccountProfile id={id} />;

  // Públicos: los ve cualquiera. Privados: solo el dueño (ver ProfileDetails).
  const publicRows: [string, string][] = [
    ["Ciudad", `${u.city}, Yucatán`],
    ["Miembro desde", formatDate(u.joinedAt)],
  ];
  const privateRows: [string, string][] = [
    ["Correo", u.email],
    ["Teléfono", u.phone],
  ];

  return (
    <main className="flex-1">
      <div className="mx-auto max-w-3xl space-y-8 px-4 py-10">
        <ProfileHeader user={u} />
        <section>
          <h2 className="mb-2 text-lg font-bold text-ink">Datos del perfil</h2>
          <ProfileDetails userId={u.id} publicRows={publicRows} privateRows={privateRows} />
        </section>
      </div>
    </main>
  );
}
