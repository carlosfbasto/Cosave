"use client";

import { useCurrentUser } from "@/lib/current-user";
import { ProfileIcon, type ProfileIconName } from "@/components/user/profile-icons";

type Row = [label: string, value: string];

const ICON: Record<string, ProfileIconName> = { Correo: "mail", Teléfono: "phone", Ciudad: "pin", "Miembro desde": "calendar" };

/** Datos del perfil como campos de solo lectura. Los públicos los ve cualquiera; los privados (correo, teléfono) solo su dueño. */
export function ProfileDetails({ userId, publicRows, privateRows }: { userId: string; publicRows: Row[]; privateRows: Row[] }) {
  const { id } = useCurrentUser();
  const isOwner = id === userId;
  const rows = isOwner ? [...privateRows.slice(0, 2), ...publicRows, ...privateRows.slice(2)] : publicRows;
  const privateLabels = new Set(privateRows.map(([k]) => k));
  return (
    <dl className="grid gap-4 sm:grid-cols-2">
      {rows.map(([k, v]) => (
        <div key={k} className="space-y-1.5">
          <dt className="label-sm flex items-center justify-between gap-2 text-slate-500">
            {k}
            {isOwner && privateLabels.has(k) && (
              <span className="flex items-center gap-1 text-[0.7rem] font-medium normal-case tracking-normal text-slate-400" title="Solo tú ves este dato">
                <ProfileIcon name="lock" className="h-3.5 w-3.5" />
                Privado
              </span>
            )}
          </dt>
          <dd className="flex items-center gap-2 break-words rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-ink">
            {ICON[k] && (
              <span className="text-slate-400">
                <ProfileIcon name={ICON[k]} className="h-4 w-4" />
              </span>
            )}
            <span className="min-w-0 break-words">{v}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}
