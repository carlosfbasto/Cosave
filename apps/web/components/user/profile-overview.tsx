"use client";

import { useCurrentUser } from "@/lib/current-user";
import { ProfileHeader, type HeaderUser } from "@/components/user/profile-header";
import { PanelCard } from "@/components/user/profile-section";

/**
 * Vista «Perfil»: tarjeta de identidad y, debajo, solo los datos personales.
 * `details` es la lista de datos o el formulario de edición; `detailsAction`, el botón del encabezado de esa tarjeta.
 */
export function ProfileOverview({ user, details, detailsAction }: { user: HeaderUser; details: React.ReactNode; detailsAction?: React.ReactNode }) {
  const { id } = useCurrentUser();
  const isOwner = id === user.id;
  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8 sm:px-8 sm:py-10">
      <ProfileHeader user={user} />
      <PanelCard title={isOwner ? "Datos personales y de contacto" : "Datos del perfil"} description={isOwner ? "Tu correo y tu teléfono solo los ves tú." : undefined} action={detailsAction}>
        {details}
      </PanelCard>
    </main>
  );
}
