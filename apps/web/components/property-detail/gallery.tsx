"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

const btn =
  "grid h-10 w-10 place-items-center rounded-full bg-white/90 text-navy shadow transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

function Arrow({ dir }: { dir: "l" | "r" }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
      <path d={dir === "l" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Carrusel manual (sin autoplay) con botones a la derecha, zoom y badge con la información de la foto. */
export function Gallery({ images, alt, info }: { images: string[]; alt: string; info: string }) {
  const [i, setI] = useState(0);
  const [zoom, setZoom] = useState(false);
  const n = images.length;
  const prev = useCallback(() => setI((v) => (v - 1 + n) % n), [n]);
  const next = useCallback(() => setI((v) => (v + 1) % n), [n]);

  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoom(false);
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [zoom, prev, next]);

  const badge = `${info} | foto ${i + 1} de ${n}`;

  return (
    <>
      <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-slate-200 shadow-sm">
        <div className="flex h-full transition-transform duration-500 ease-out" style={{ transform: `translateX(-${i * 100}%)` }}>
          {images.map((src, idx) => (
            <div key={src} className="relative h-full w-full shrink-0">
              <Image src={src} alt={`${alt} — foto ${idx + 1}`} fill priority={idx === 0} sizes="(min-width: 1024px) 780px, 100vw" className="object-cover" />
            </div>
          ))}
        </div>

        <div className="absolute right-3 top-1/2 flex -translate-y-1/2 flex-col gap-2">
          <button type="button" onClick={prev} aria-label="Foto anterior" className={btn}><Arrow dir="l" /></button>
          <button type="button" onClick={next} aria-label="Foto siguiente" className={btn}><Arrow dir="r" /></button>
          <button type="button" onClick={() => setZoom(true)} aria-label="Ampliar foto" className={btn}>
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
              <circle cx="11" cy="11" r="6" /><path d="M20 20l-4.5-4.5M11 8v6M8 11h6" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <p className="absolute bottom-3 left-3 right-16 w-fit max-w-full truncate rounded-full bg-navy/75 px-4 py-1.5 text-xs font-medium text-white backdrop-blur-sm sm:text-sm">
          {badge}
        </p>
      </div>

      {zoom && (
        <div role="dialog" aria-modal="true" aria-label="Foto ampliada" className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" onClick={() => setZoom(false)}>
          <div className="relative h-full max-h-[85vh] w-full max-w-6xl" onClick={(e) => e.stopPropagation()}>
            <Image src={images[i]} alt={alt} fill sizes="100vw" className="object-contain" />
          </div>
          <button type="button" onClick={() => setZoom(false)} aria-label="Cerrar" className={`${btn} absolute right-4 top-4`}>
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden><path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" /></svg>
          </button>
          <button type="button" onClick={(e) => { e.stopPropagation(); prev(); }} aria-label="Foto anterior" className={`${btn} absolute left-4 top-1/2 -translate-y-1/2`}><Arrow dir="l" /></button>
          <button type="button" onClick={(e) => { e.stopPropagation(); next(); }} aria-label="Foto siguiente" className={`${btn} absolute right-4 top-1/2 -translate-y-1/2`}><Arrow dir="r" /></button>
          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-navy/80 px-4 py-1.5 text-sm text-white">{badge}</p>
        </div>
      )}
    </>
  );
}
