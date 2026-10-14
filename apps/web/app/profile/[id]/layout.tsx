import { ProfileSidebar } from "@/components/user/profile-sidebar";

/** Marco del perfil: barra lateral de 260px pegada a la izquierda y contenido a la derecha. */
export default async function ProfileLayout({ children, params }: LayoutProps<"/profile/[id]">) {
  const { id } = await params;
  return (
    <div className="flex flex-1 flex-col bg-white md:flex-row">
      <ProfileSidebar userId={id} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
