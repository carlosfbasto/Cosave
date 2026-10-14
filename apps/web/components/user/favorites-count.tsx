"use client";

import { useFavorites } from "@/lib/favorites";

/** Número de favoritos del usuario (lee la misma lista que el módulo /favorites). */
export function FavoritesCount({ userId }: { userId: string }) {
  return <>{useFavorites(userId).codes.length}</>;
}
