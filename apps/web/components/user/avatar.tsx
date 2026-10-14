import Image from "next/image";
import { ROLE_LABEL, type MockUser } from "@/lib/mock-users";

const roleStyle: Record<MockUser["role"], string> = {
  buyer: "bg-sky-100 text-sky-800",
  seller: "bg-emerald-100 text-emerald-800",
  agent: "bg-accent/30 text-navy",
  admin: "bg-navy text-white",
};

export function Avatar({ user, size = 48 }: { user: Pick<MockUser, "fullName" | "avatar">; size?: number }) {
  return (
    <Image
      src={user.avatar}
      alt={`Foto de ${user.fullName}`}
      width={size}
      height={size}
      className="shrink-0 rounded-full object-cover ring-2 ring-white"
      style={{ width: size, height: size }}
    />
  );
}

export function RoleBadge({ role }: { role: MockUser["role"] }) {
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${roleStyle[role]}`}>{ROLE_LABEL[role]}</span>;
}
