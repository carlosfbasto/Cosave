"use client";

import { PageHeader } from "@/components/admin/admin-shell";
import { ErrorNote, Loading, panel } from "@/components/admin/ui";
import { useAdminData, type AdminConfig } from "@/lib/admin";
import { IMAGE_LABEL } from "@cosave/shared";
import { useProfile } from "@/lib/use-profile";

function Row({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex flex-wrap justify-between gap-2 border-b border-slate-100 py-3 text-sm last:border-b-0">
      <div>
        <dt className="font-medium text-navy">{label}</dt>
        {hint && <p className="text-xs text-slate-500">{hint}</p>}
      </div>
      <dd className="font-semibold text-navy">{value}</dd>
    </div>
  );
}

/** Configuración vigente. Solo lectura: se cambia con variables de entorno del api. */
export default function AdminSettingsPage() {
  const { data: c, error } = useAdminData<AdminConfig>("/admin/config");
  const { profile } = useProfile();
  return (
    <>
      <PageHeader title="Configuración" subtitle="Valores vigentes de la plataforma (solo lectura)." />
      {error ? <ErrorNote message={error} /> : !c ? <Loading /> : (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className={`${panel} p-5`}>
            <h2 className="mb-1 font-bold text-navy">Publicaciones</h2>
            <dl>
              <Row label="Aprobación previa" value={c.requiresApproval ? "Activada" : "Desactivada"} hint="Variable PUBLISH_REQUIRES_APPROVAL del api" />
              <Row label="Fotos por propiedad" value={`Hasta ${c.imageLimits.maxCount}`} />
              <Row label="Peso por foto" value={`${(c.imageLimits.maxBytes / 1024 / 1024).toFixed(0)} MB`} />
              <Row label="Formatos permitidos" value={IMAGE_LABEL} />
            </dl>
          </section>
          <section className={`${panel} p-5`}>
            <h2 className="mb-1 font-bold text-navy">Sistema</h2>
            <dl>
              <Row label="Almacenamiento de fotos" value={c.storageConfigured ? "Conectado" : "Sin configurar"} hint={c.storageConfigured ? undefined : "Falta SUPABASE_SERVICE_ROLE_KEY en el api"} />
              <Row label="Tu cuenta" value={profile?.email ?? "—"} />
              <Row label="Rol" value="Administrador" />
            </dl>
          </section>
        </div>
      )}
    </>
  );
}
