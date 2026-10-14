"use client";

import { useRef } from "react";
import { useCurrentUser } from "@/lib/current-user";
import { useProfilePhoto } from "@/lib/profile-photo";
import { showToast } from "@/lib/toast";

const SIZE = 112;

/** Foto redonda con contorno blanco + nombre y correo, sin tarjeta. Solo el dueño puede cambiar la foto. */
export function ProfileHeader({ user }: { user: { id: string; fullName: string; email: string; avatar: string } }) {
  const me = useCurrentUser();
  const { photo, change } = useProfilePhoto(user.id);
  const input = useRef<HTMLInputElement>(null);
  const isOwner = me.id === user.id;
  const src = photo ?? user.avatar;

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast("Elige un archivo de imagen");
      return;
    }
    try {
      await change(file);
      showToast("Foto de perfil actualizada");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "No se pudo cambiar la foto");
    }
  }

  const img = (
    // eslint-disable-next-line @next/next/no-img-element -- puede ser un data URL local
    <img src={src} alt={`Foto de ${user.fullName}`} width={SIZE} height={SIZE} className="h-full w-full object-cover" />
  );

  return (
    <div className="flex items-center gap-6">
      {isOwner ? (
        <>
          <button
            type="button"
            onClick={() => input.current?.click()}
            aria-label="Cambiar foto de perfil"
            style={{ width: SIZE, height: SIZE }}
            className="group relative shrink-0 cursor-pointer overflow-hidden rounded-full border-4 border-white shadow-md"
          >
            {img}
            <span className="absolute inset-0 flex items-center justify-center bg-black/35 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
              <svg viewBox="0 0 24 24" className="h-8 w-8 text-white/90" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
                <circle cx="12" cy="13.5" r="3.5" />
              </svg>
            </span>
          </button>
          <input
            ref={input}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              void onFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </>
      ) : (
        <div style={{ width: SIZE, height: SIZE }} className="shrink-0 overflow-hidden rounded-full border-4 border-white shadow-md">
          {img}
        </div>
      )}
      <div className="min-w-0">
        <h1 className="truncate text-[20px] font-semibold text-navy">{user.fullName}</h1>
        {isOwner && <p className="truncate text-[16px] font-normal text-slate-600">{user.email}</p>}
      </div>
    </div>
  );
}
