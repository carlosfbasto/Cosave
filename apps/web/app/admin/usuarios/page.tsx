"use client";

import { useEffect, useState } from "react";
import { USER_ROLES, type UserRole } from "@cosave/shared";
import { PageHeader } from "@/components/admin/admin-shell";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ErrorNote, Loading, panel, td, th } from "@/components/admin/ui";
import { api, apiRaw, type Profile } from "@/lib/api";
import { useCurrentUser } from "@/lib/current-user";
import { formatDate } from "@/lib/mock-users";
import { showToast } from "@/lib/toast";

const ROLE_LABEL: Record<UserRole, string> = { buyer: "Comprador", seller: "Vendedor", agent: "Asesor", admin: "Administrador" };

/** Usuarios registrados; el administrador puede cambiar el rol interno (no el propio). */
export default function AdminUsersPage() {
  const me = useCurrentUser();
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const [rows, setRows] = useState<Profile[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  // Cambio de rol a la espera de confirmación (el selector no aplica nada por sí solo).
  const [pendingChange, setPendingChange] = useState<{ user: Profile; role: UserRole } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setTerm(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    let alive = true;
    apiRaw<{ data: Profile[]; meta: { total: number } }>(`/admin/users?pageSize=50${term ? `&q=${encodeURIComponent(term)}` : ""}`)
      .then((r) => alive && (setRows(r.data), setTotal(r.meta.total), setError(null)))
      .catch((err) => alive && setError(err instanceof Error ? err.message : "No se pudieron cargar los usuarios"));
    return () => {
      alive = false;
    };
  }, [term]);

  async function changeRole(id: string, role: UserRole) {
    setSaving(true);
    try {
      await api(`/admin/users/${id}/role`, { method: "PATCH", body: JSON.stringify({ role }) });
      setRows((prev) => prev && prev.map((u) => (u.id === id ? { ...u, role } : u)));
      showToast("Rol actualizado");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "No se pudo cambiar el rol", "info");
    } finally {
      setSaving(false);
      setPendingChange(null);
    }
  }

  const touchesAdmin = !!pendingChange && (pendingChange.role === "admin" || pendingChange.user.role === "admin");

  return (
    <>
      <PageHeader title="Usuarios" subtitle="Cuentas registradas y su rol interno." />
      <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre o correo…" aria-label="Buscar usuarios" className="field max-w-sm px-3 py-2 text-sm" />
      {error ? (
        <ErrorNote message={error} />
      ) : !rows ? (
        <Loading />
      ) : (
        <>
          <p className="text-sm text-slate-500">{total} {total === 1 ? "usuario" : "usuarios"}{rows.length < total && ` (mostrando ${rows.length})`}</p>
          <div className={`${panel} overflow-x-auto`}>
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200"><tr><th className={th}>Nombre</th><th className={th}>Correo</th><th className={th}>Registro</th><th className={th}>Rol</th></tr></thead>
              <tbody className="divide-y divide-slate-200">
                {rows.map((u) => (
                  <tr key={u.id}>
                    <td className={`${td} font-medium text-ink`}>{u.fullName}</td>
                    <td className={`${td} text-slate-500`}>{u.email}</td>
                    <td className={`${td} text-slate-500`}>{u.createdAt ? formatDate(u.createdAt.slice(0, 10)) : "—"}</td>
                    <td className={td}>
                      <select
                        value={u.role}
                        disabled={u.id === me.id}
                        onChange={(e) => setPendingChange({ user: u, role: e.target.value as UserRole })}
                        aria-label={`Rol de ${u.fullName}`}
                        title={u.id === me.id ? "No puedes cambiar tu propio rol" : undefined}
                        className="field w-auto cursor-pointer px-2 py-1 text-sm disabled:cursor-not-allowed disabled:bg-slate-100"
                      >
                        {USER_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <ConfirmDialog
        open={!!pendingChange}
        title="Cambiar rol"
        confirmLabel="Cambiar rol"
        danger={touchesAdmin}
        busy={saving}
        onConfirm={() => pendingChange && void changeRole(pendingChange.user.id, pendingChange.role)}
        onClose={() => setPendingChange(null)}
      >
        {pendingChange && (
          <>
            <p>
              {pendingChange.user.fullName} ({pendingChange.user.email}) pasará de <strong>{ROLE_LABEL[pendingChange.user.role]}</strong> a <strong>{ROLE_LABEL[pendingChange.role]}</strong>.
            </p>
            {touchesAdmin && (
              <p className="font-semibold text-red-600">
                {pendingChange.role === "admin" ? "Tendrá acceso total al panel de administración, incluido cambiar roles." : "Perderá el acceso al panel de administración."}
              </p>
            )}
            <p>El cambio queda registrado en la bitácora.</p>
          </>
        )}
      </ConfirmDialog>
    </>
  );
}
