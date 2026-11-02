import { ProfileSidebar } from "@/components/user/profile-sidebar";

/** Marco del perfil (y de favoritos): barra lateral a la izquierda y contenido sobre el canvas slate-50. */
export function ProfileShell({ userId, children }: { userId: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col bg-slate-50 md:flex-row">
      <ProfileSidebar userId={userId} />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
