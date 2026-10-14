"use client";

import { showToast } from "@/lib/toast";

/** Comparte el enlace de la ficha (hoja nativa si el dispositivo la tiene; si no, lo copia). */
export function ShareButton({ code, title }: { code: string; title: string }) {
  async function share() {
    const url = `${window.location.origin}/properties/${code}`;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return; // la persona canceló
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      showToast("Enlace copiado");
    } catch {
      showToast("No se pudo copiar. Copia el enlace desde la barra del navegador.", "info");
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      className="flex cursor-pointer items-center gap-2 rounded-md border border-navy px-4 py-2 text-[0.9rem] font-semibold text-navy transition-colors hover:bg-navy hover:text-white"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="18" cy="5" r="2.5" />
        <circle cx="6" cy="12" r="2.5" />
        <circle cx="18" cy="19" r="2.5" />
        <path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4" />
      </svg>
      Compartir
    </button>
  );
}
