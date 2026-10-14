"use client";

import { useEffect } from "react";
import { takePendingFavorite } from "@/lib/pending-action";
import { useCurrentUser } from "@/lib/current-user";
import { useFavorites } from "@/lib/favorites";
import { fetchProperty } from "@/lib/catalog";
import { showToast } from "@/lib/toast";

/**
 * Completa la acción que el visitante intentó antes de entrar (guardar un favorito).
 * Se monta una vez en el layout: al haber sesión, si la propiedad sigue publicada, la guarda.
 */
export function PendingActionRunner() {
  const { id } = useCurrentUser();
  const { codes, ready, add } = useFavorites(id);

  useEffect(() => {
    if (!id || !ready) return;
    const code = takePendingFavorite();
    if (!code) return;
    void fetchProperty(code).then((r) => {
      if (!r.found || r.status !== "published") {
        showToast("Esa propiedad ya no está disponible", "info");
      } else if (codes.includes(code)) {
        showToast("Esa propiedad ya estaba en tus favoritos", "info");
      } else {
        void add(code).then((ok) => ok && showToast("Se guardó correctamente en favoritos"));
      }
    });
  }, [id, ready, codes, add]);

  return null;
}
