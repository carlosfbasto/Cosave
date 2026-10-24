"use client";

import Image from "next/image";
import { useProfilePhoto } from "@/lib/profile-photo";

/** Avatar del usuario: su foto de perfil si ya subió una; si no, la de ejemplo o la inicial de su nombre. */
export function UserAvatar({ userId, name, fallbackSrc, size = 36 }: { userId: string; name: string; fallbackSrc?: string; size?: number }) {
  const { photo } = useProfilePhoto(userId);
  const src = photo ?? fallbackSrc;
  if (src) {
    return (
      <Image src={src} alt={`Foto de ${name}`} width={size} height={size} className="shrink-0 rounded-full object-cover ring-2 ring-white" style={{ width: size, height: size }} />
    );
  }
  return (
    <span className="grid shrink-0 place-items-center rounded-full bg-azure font-bold text-white" style={{ width: size, height: size }}>
      {(name.trim().charAt(0) || "?").toUpperCase()}
    </span>
  );
}
