"use client";

import { useCurrentUser } from "@/lib/current-user";

type Row = [label: string, value: string];

/** Datos del perfil. Los públicos los ve cualquiera; los privados (correo, teléfono, acceso) solo su dueño. */
export function ProfileDetails({ userId, publicRows, privateRows }: { userId: string; publicRows: Row[]; privateRows: Row[] }) {
  const { id } = useCurrentUser();
  const rows = id === userId ? [...privateRows.slice(0, 2), ...publicRows, ...privateRows.slice(2)] : publicRows;
  return (
    <dl>
      {rows.map(([k, v]) => (
        <div key={k} className="border-b border-slate-100 py-2 text-sm last:border-b-0">
          <dt className="text-xs text-slate-500">{k}</dt>
          <dd className="break-words font-medium text-navy">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
