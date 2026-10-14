"use client";

import { useEffect, useState, type FormEvent } from "react";
import { NoticeCard } from "@/components/notice-card";
import { ProfileDetails } from "@/components/user/profile-details";
import { ProfileHeader } from "@/components/user/profile-header";
import { api, ApiError, type Profile } from "@/lib/api";
import { loginUrl } from "@/lib/auth";
import { useCurrentUser } from "@/lib/current-user";
import { formatDate } from "@/lib/mock-users";
import { showToast } from "@/lib/toast";

type AccountData = Profile;

const field = "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-navy focus:outline-none";

/** Avatar con la inicial del nombre, para cuentas que aún no suben foto. */
function initialsAvatar(name: string) {
  const letter = (name.trim().charAt(0) || "?").toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 112 112"><rect width="112" height="112" fill="#f5b800"/><text x="56" y="56" font-family="sans-serif" font-size="52" font-weight="700" fill="#10264a" text-anchor="middle" dominant-baseline="central">${letter}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/** Perfil de una cuenta real (Supabase). Mismo diseño que los perfiles demo; solo lo ve su dueño. */
export function AccountProfile({ id }: { id: string }) {
  const me = useCurrentUser();
  const isOwner = me.id === id;
  const [profile, setProfile] = useState<AccountData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOwner || !me.remote) return;
    api<AccountData>("/me")
      .then(setProfile)
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudo cargar tu perfil"));
  }, [isOwner, me.remote]);

  if (me.loading) return <p className="p-8 text-sm text-slate-600">Cargando…</p>;
  if (!me.id) return <NoticeCard title="Mi perfil" text="Inicia sesión para ver tu perfil." href={loginUrl(`/profile/${id}`, "login")} cta="Iniciar sesión" />;
  if (!isOwner || !me.remote) {
    return <NoticeCard title="Perfil no disponible" text="Este perfil no existe o no es público." href={me.remote ? `/profile/${me.id}` : "/home"} cta={me.remote ? "Ir a mi perfil" : "Ir al inicio"} />;
  }
  if (error) return <p role="alert" className="p-8 text-sm text-red-600">{error}</p>;
  if (!profile) return <p className="p-8 text-sm text-slate-600">Cargando…</p>;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const form = new FormData(e.currentTarget);
    try {
      const updated = await api<AccountData>("/me", {
        method: "PATCH",
        body: JSON.stringify({ fullName: String(form.get("fullName")), phone: String(form.get("phone")).trim() || null, city: String(form.get("city")).trim() || null }),
      });
      setProfile(updated);
      setEditing(false);
      showToast("Datos actualizados");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "No se pudo guardar");
    }
  }

  const privateRows: [string, string][] = [
    ["Correo", profile.email],
    ["Teléfono", profile.phone ?? "Sin teléfono"],
  ];
  const publicRows: [string, string][] = [
    ["Ciudad", profile.city ? `${profile.city}` : "Sin ciudad"],
    ["Miembro desde", profile.createdAt ? formatDate(profile.createdAt) : "—"],
  ];

  return (
    <main className="flex-1">
      <div className="mx-auto max-w-3xl space-y-8 px-4 py-10">
        <ProfileHeader user={{ id: profile.id, fullName: profile.fullName, email: profile.email, avatar: initialsAvatar(profile.fullName) }} />

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-bold text-navy">Datos del perfil</h2>
            {!editing && (
              <button type="button" onClick={() => setEditing(true)} className="cursor-pointer text-sm font-semibold text-navy underline">
                Editar datos
              </button>
            )}
          </div>
          {editing ? (
            <form onSubmit={onSubmit} className="space-y-3">
              <label className="block text-sm text-navy">
                Nombre completo
                <input name="fullName" defaultValue={profile.fullName} required maxLength={120} className={`${field} mt-1`} />
              </label>
              <label className="block text-sm text-navy">
                Teléfono
                <input name="phone" defaultValue={profile.phone ?? ""} maxLength={30} className={`${field} mt-1`} />
              </label>
              <label className="block text-sm text-navy">
                Ciudad
                <input name="city" defaultValue={profile.city ?? ""} maxLength={80} className={`${field} mt-1`} />
              </label>
              {formError && <p role="alert" className="text-sm text-red-600">{formError}</p>}
              <div className="flex gap-3">
                <button className="cursor-pointer rounded-md bg-accent px-4 py-2 text-sm font-semibold text-navy transition-colors hover:bg-accent-hover">Guardar</button>
                <button type="button" onClick={() => setEditing(false)} className="cursor-pointer text-sm font-semibold text-slate-600 underline">Cancelar</button>
              </div>
            </form>
          ) : (
            <ProfileDetails userId={profile.id} publicRows={publicRows} privateRows={privateRows} />
          )}
        </section>
      </div>
    </main>
  );
}
