import { AccountProfile } from "@/components/user/account-profile";
import { ProfileDetails } from "@/components/user/profile-details";
import { ProfileOverview } from "@/components/user/profile-overview";
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
    <ProfileOverview
      user={{ ...u, city: `${u.city}, Yucatán`, joinedAt: formatDate(u.joinedAt) }}
      details={<ProfileDetails userId={u.id} publicRows={publicRows} privateRows={privateRows} />}
    />
  );
}
