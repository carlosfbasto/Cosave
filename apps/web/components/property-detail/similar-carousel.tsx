"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PropertyCard } from "@/components/property-card";
import type { MockProperty } from "@/lib/mock-data";

const nav =
  "absolute top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white text-navy shadow-lg transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

/** Carrusel con 3 cards a la vez (2 en tablet, 1 en móvil) y avance automático (se pausa al pasar el mouse) y botones manuales. */
export function SimilarCarousel({ items }: { items: MockProperty[] }) {
  const track = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);

  const move = useCallback((dir: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    const step = (el.firstElementChild as HTMLElement | null)?.offsetWidth ?? 300;
    const gap = 24;
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
    if (dir === 1 && atEnd) el.scrollTo({ left: 0, behavior: "smooth" });
    else if (dir === -1 && el.scrollLeft <= 4) el.scrollTo({ left: el.scrollWidth, behavior: "smooth" });
    else el.scrollBy({ left: dir * (step + gap), behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => move(1), 3500);
    return () => clearInterval(id);
  }, [paused, move]);

  return (
    <div
      className="relative mx-auto w-full max-w-[1200px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <button type="button" onClick={() => move(-1)} aria-label="Anterior" className={`${nav} left-2`}>
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden><path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      <div ref={track} className="flex snap-x snap-mandatory items-start gap-6 overflow-x-auto scroll-smooth px-1 pb-4 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((p) => (
          <div key={p.code} className="w-[85%] shrink-0 snap-start sm:w-[calc((100%-24px)/2)] lg:w-[calc((100%-48px)/3)]">
            <PropertyCard p={p} />
          </div>
        ))}
      </div>
      <button type="button" onClick={() => move(1)} aria-label="Siguiente" className={`${nav} right-2`}>
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden><path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
    </div>
  );
}
