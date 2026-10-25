"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

const navBtn =
  "grid h-10 w-10 cursor-pointer place-items-center rounded-full bg-white/90 text-ink shadow-glow ring-1 ring-slate-200 transition-colors hover:bg-white hover:text-azure focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure";

function Arrow({ dir }: { dir: "l" | "r" }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
      <path d={dir === "l" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const photosIcon = (
  <svg viewBox="0 0 24 24" className="h-5 w-5 text-azure" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden>
    <rect x="7" y="3" width="14" height="14" rx="2" />
    <path d="M3 7v12a2 2 0 002 2h12M7 13l3.5-3.5L14 13l2-2 5 5" />
  </svg>
);

/**
 * Galería en mosaico: foto principal grande y hasta 4 secundarias (escritorio).
 * Cualquier foto abre el visor ampliado con flechas, teclado y la información de la propiedad.
 */
export function PhotoMosaic({ images, alt, info }: { images: string[]; alt: string; info: string }) {
  const [open, setOpen] = useState<number | null>(null);
  const n = images.length;
  const prev = useCallback(() => setOpen((v) => (v === null ? v : (v - 1 + n) % n)), [n]);
  const next = useCallback(() => setOpen((v) => (v === null ? v : (v + 1) % n)), [n]);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, prev, next]);

  const side = images.slice(1, 5);
  const label = `Ver ${n} ${n === 1 ? "foto" : "fotos"}`;
  // Columnas del mosaico según cuántas fotos secundarias hay.
  const grid = ["md:grid-cols-1", "md:grid-cols-2", "md:grid-cols-3 md:grid-rows-2", "md:grid-cols-4 md:grid-rows-2", "md:grid-cols-4 md:grid-rows-2"][side.length];
  const main = side.length >= 2 ? "md:col-span-2 md:row-span-2" : "";

  return (
    <>
      <div className={`relative grid h-[320px] grid-cols-1 gap-2 overflow-hidden rounded-3xl sm:h-[420px] md:h-[520px] ${grid}`}>
        <button type="button" onClick={() => setOpen(0)} aria-label="Ampliar foto principal" className={`group relative cursor-zoom-in overflow-hidden bg-slate-200 ${main}`}>
          <Image src={images[0]!} alt={`${alt} — foto 1`} fill priority sizes="(min-width: 768px) 50vw, 100vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.02]" />
          <span className="label-sm absolute left-4 top-4 max-w-[calc(100%-2rem)] truncate rounded-md bg-ink/80 px-3 py-1.5 text-white backdrop-blur-md">{info}</span>
        </button>

        {side.map((src, i) => {
          const idx = i + 1;
          const last = i === side.length - 1;
          // Con 3 secundarias, la última ocupa todo el ancho de abajo.
          const span = side.length === 3 && last ? "md:col-span-2" : "";
          return (
            <button
              key={src}
              type="button"
              onClick={() => setOpen(idx)}
              aria-label={`Ampliar foto ${idx + 1}`}
              className={`group relative hidden cursor-zoom-in overflow-hidden bg-slate-200 md:block ${span}`}
            >
              <Image src={src} alt={`${alt} — foto ${idx + 1}`} fill sizes="25vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
              {last && n > 1 && (
                <span className="absolute inset-0 grid place-items-center bg-ink/35 p-2 transition-colors group-hover:bg-ink/45">
                  <span className="flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-ink shadow-glow">
                    {photosIcon}
                    {label}
                  </span>
                </span>
              )}
            </button>
          );
        })}

        {n > 1 && (
          <button
            type="button"
            onClick={() => setOpen(0)}
            className="absolute bottom-4 right-4 flex cursor-pointer items-center gap-2 rounded-lg bg-ink/85 px-4 py-2 text-sm font-semibold text-white backdrop-blur-md md:hidden"
          >
            {photosIcon}
            {label}
          </button>
        )}
      </div>

      {open !== null && (
        <div role="dialog" aria-modal="true" aria-label="Foto ampliada" className="fixed inset-0 z-[1100] flex items-center justify-center bg-ink/95 p-4 backdrop-blur-sm" onClick={() => setOpen(null)}>
          <div className="relative h-full max-h-[85vh] w-full max-w-6xl" onClick={(e) => e.stopPropagation()}>
            <Image src={images[open]!} alt={`${alt} — foto ${open + 1}`} fill sizes="100vw" className="object-contain" />
          </div>
          <button type="button" onClick={() => setOpen(null)} aria-label="Cerrar" className={`${navBtn} absolute right-4 top-4`}>
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden><path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" /></svg>
          </button>
          {n > 1 && (
            <>
              <button type="button" onClick={(e) => { e.stopPropagation(); prev(); }} aria-label="Foto anterior" className={`${navBtn} absolute left-4 top-1/2 -translate-y-1/2`}><Arrow dir="l" /></button>
              <button type="button" onClick={(e) => { e.stopPropagation(); next(); }} aria-label="Foto siguiente" className={`${navBtn} absolute right-4 top-1/2 -translate-y-1/2`}><Arrow dir="r" /></button>
            </>
          )}
          <p className="absolute bottom-4 left-1/2 max-w-[90vw] -translate-x-1/2 truncate rounded-full bg-white/10 px-4 py-1.5 text-sm text-white">
            {info} | foto {open + 1} de {n}
          </p>
        </div>
      )}
    </>
  );
}
