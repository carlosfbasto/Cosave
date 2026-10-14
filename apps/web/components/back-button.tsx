"use client";

import { useRouter } from "next/navigation";

/** "← Volver" a la pantalla anterior (historial); si se entró directo, al inicio. */
export function BackButton({ className }: { className?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => (window.history.length > 1 ? router.back() : router.push("/home"))}
      className={`cursor-pointer ${className ?? ""}`}
    >
      ← Volver
    </button>
  );
}
