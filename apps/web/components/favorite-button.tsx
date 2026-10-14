"use client";

import { useRouter } from "next/navigation";
import { loginUrl } from "@/lib/auth";
import { useCurrentUser } from "@/lib/current-user";
import { useFavorites } from "@/lib/favorites";
import { setPendingFavorite } from "@/lib/pending-action";
import { showToast } from "@/lib/toast";

/**
 * Guardar / quitar un favorito. Sin sesión recuerda la acción y lleva al login;
 * al entrar, `PendingActionRunner` la completa y la persona regresa a esta misma pantalla.
 */
function useFavoriteToggle(code: string) {
  const router = useRouter();
  const { id, loading } = useCurrentUser();
  const favs = useFavorites(id);
  const saved = favs.has(code);

  async function toggle() {
    if (loading || (id && !favs.ready)) return;
    if (!id) {
      setPendingFavorite(code);
      router.push(loginUrl(window.location.pathname + window.location.search, "login", "favorito"));
      return;
    }
    if (saved) {
      if (await favs.remove(code)) showToast("Se eliminó de favoritos");
    } else if (await favs.add(code)) {
      showToast("Se guardó correctamente en favoritos");
    }
  }
  return { saved, toggle };
}

const heart = (saved: boolean, size: string) => (
  <svg viewBox="0 0 24 24" className={size} fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" aria-hidden>
    <path d="M12 21s-7.5-4.6-9.5-9.2C1.2 8.6 3 5 6.5 5c2 0 3.7 1.1 5.5 3 1.8-1.9 3.5-3 5.5-3C21 5 22.8 8.6 21.5 11.8 19.5 16.4 12 21 12 21z" strokeLinejoin="round" />
  </svg>
);

/** Corazón de la card. */
export function FavoriteButton({ code }: { code: string }) {
  const { saved, toggle } = useFavoriteToggle(code);
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={saved}
      aria-label={saved ? "Quitar de favoritos" : "Guardar en favoritos"}
      className={`absolute right-3 top-3 grid h-9 w-9 cursor-pointer place-items-center rounded-full bg-white/90 shadow transition-colors hover:bg-white ${
        saved ? "text-red-500" : "text-slate-500 hover:text-red-500"
      }`}
    >
      {heart(saved, "h-5 w-5")}
    </button>
  );
}

/** Botón con texto para la ficha de la propiedad. */
export function FavoriteAction({ code }: { code: string }) {
  const { saved, toggle } = useFavoriteToggle(code);
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={saved}
      className={`flex cursor-pointer items-center gap-2 rounded-md border px-4 py-2 text-[0.9rem] font-semibold transition-colors ${
        saved ? "border-red-500 text-red-500 hover:bg-red-50" : "border-navy text-navy hover:bg-navy hover:text-white"
      }`}
    >
      {heart(saved, "h-4 w-4")}
      {saved ? "Guardado en favoritos" : "Guardar en favoritos"}
    </button>
  );
}
