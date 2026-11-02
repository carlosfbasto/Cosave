"use client";

import { useRef, useState } from "react";
import { useCurrentUser } from "@/lib/current-user";
import { useProfilePhoto } from "@/lib/profile-photo";
import { PhotoCropper } from "@/components/user/photo-cropper";
import { ProfileIcon } from "@/components/user/profile-icons";
import { showToast } from "@/lib/toast";

const SIZE = 96;

export interface HeaderUser {
  id: string;
  fullName: string;
  email: string;
  avatar: string;
  city?: string | null;
  /** Fecha ya formateada ("2 de junio de 2026"). */
  joinedAt?: string | null;
}

/** Tarjeta de identidad: foto (el dueño puede cambiarla), nombre, ciudad y fecha de registro. */
export function ProfileHeader({ user }: { user: HeaderUser }) {
  const me = useCurrentUser();
  const { photo, save } = useProfilePhoto(user.id);
  const [pending, setPending] = useState<File | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const isOwner = me.id === user.id;
  const src = photo ?? user.avatar;

  function onFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast("Elige un archivo de imagen");
      return;
    }
    setPending(file);
  }

  function onSave(dataUrl: string) {
    try {
      save(dataUrl);
      showToast("Foto de perfil actualizada");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "No se pudo cambiar la foto");
    }
    setPending(null);
  }

  const img = (
    // eslint-disable-next-line @next/next/no-img-element -- puede ser un data URL local
    <img src={src} alt={`Foto de ${user.fullName}`} width={SIZE} height={SIZE} className="h-full w-full object-cover" />
  );
  const frame = "relative shrink-0 overflow-hidden rounded-full ring-4 ring-slate-100";

  return (
    <section className="card-surface rounded-2xl p-6 sm:p-8">
      <div className="flex min-w-0 items-center gap-5">
        {isOwner ? (
          <>
            <button
              type="button"
              onClick={() => input.current?.click()}
              aria-label="Cambiar foto de perfil"
              title="Cambiar foto de perfil"
              style={{ width: SIZE, height: SIZE }}
              className={`group cursor-pointer ${frame}`}
            >
              {img}
              <span className="absolute inset-0 flex items-center justify-center bg-ink/40 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
                <svg viewBox="0 0 24 24" className="h-7 w-7 text-white/90" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
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
                onFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </>
        ) : (
          <div style={{ width: SIZE, height: SIZE }} className={frame}>
            {img}
          </div>
        )}
        <div className="min-w-0 space-y-1.5">
          <h1 className="headline-md truncate text-ink">{user.fullName}</h1>
          {isOwner && <p className="truncate text-sm text-slate-600">{user.email}</p>}
          <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
            {user.city && (
              <li className="flex items-center gap-1">
                <ProfileIcon name="pin" className="h-4 w-4" />
                {user.city}
              </li>
            )}
            {user.joinedAt && (
              <li className="flex items-center gap-1">
                <ProfileIcon name="calendar" className="h-4 w-4" />
                Miembro desde el {user.joinedAt}
              </li>
            )}
          </ul>
        </div>
      </div>
      {pending && <PhotoCropper key={`${pending.name}-${pending.lastModified}`} file={pending} onSave={onSave} onCancel={() => setPending(null)} />}
    </section>
  );
}
