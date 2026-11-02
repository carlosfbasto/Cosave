import { ProfileShell } from "@/components/user/profile-shell";

/** Marco del perfil: barra lateral de 260px pegada a la izquierda y contenido a la derecha. */
export default async function ProfileLayout({ children, params }: LayoutProps<"/profile/[id]">) {
  const { id } = await params;
  return <ProfileShell userId={id}>{children}</ProfileShell>;
}
