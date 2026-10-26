"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useId, useMemo, useRef, useState } from "react";
import type { ListedProperty } from "@/lib/mock-data";
import { useCatalog } from "@/lib/use-catalog";

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

interface Suggestion {
  label: string;
  kind: "Municipio" | "Tipo" | "Zona" | "Propiedad";
}

/** Todo lo que se puede sugerir: municipios, tipos, zonas y títulos de propiedades del catálogo. */
function buildCatalog(items: ListedProperty[]): Suggestion[] {
  const uniq = (f: (p: ListedProperty) => string) => [...new Set(items.map(f))].filter(Boolean);
  return [
    ...uniq((p) => p.city).map((label) => ({ label, kind: "Municipio" as const })),
    ...uniq((p) => p.type).map((label) => ({ label, kind: "Tipo" as const })),
    ...uniq((p) => p.zone).map((label) => ({ label, kind: "Zona" as const })),
    ...uniq((p) => p.title).map((label) => ({ label, kind: "Propiedad" as const })),
  ];
}

const OPERATION_PATHS = ["/properties/sale", "/properties/rentals"];

/**
 * Buscador del navbar: botón para borrar, sugerencias y sincronía con `?q=` de la URL.
 * Dentro de /properties conserva la operación (venta/renta) y los filtros; vaciarlo quita la búsqueda.
 */
export function SearchBox() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlQ = searchParams.get("q") ?? "";
  const inList = pathname === "/properties" || OPERATION_PATHS.includes(pathname);

  const [text, setText] = useState(urlQ);
  const [prevUrlQ, setPrevUrlQ] = useState(urlQ);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [empty, setEmpty] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();

  // Si la búsqueda cambia desde la URL (p. ej. "Quitar búsqueda"), el campo la sigue.
  if (urlQ !== prevUrlQ) {
    setPrevUrlQ(urlQ);
    setText(urlQ);
  }

  const { items } = useCatalog();
  const catalog = useMemo(() => buildCatalog(items), [items]);
  const suggestions = useMemo(() => {
    const t = norm(text.trim());
    if (!t) return [];
    return catalog.filter((s) => norm(s.label).includes(t) && norm(s.label) !== t).slice(0, 6);
  }, [text, catalog]);

  function go(term: string) {
    const q = term.trim();
    const params = new URLSearchParams(inList ? searchParams.toString() : "");
    if (q) params.set("q", q);
    else params.delete("q");
    const qs = params.toString();
    router.push(`${inList ? pathname : "/properties"}${qs ? `?${qs}` : ""}`);
    setOpen(false);
    setActive(-1);
  }

  function onChange(value: string) {
    setText(value);
    setEmpty(false);
    setOpen(true);
    setActive(-1);
    // Vaciar el campo quita el filtro y vuelven todas las propiedades.
    if (value.trim() === "" && inList && urlQ) go("");
  }

  function pick(s: Suggestion) {
    setText(s.label);
    go(s.label);
  }

  function clear() {
    setText("");
    setOpen(false);
    if (inList && urlQ) go("");
    input.current?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown" && suggestions.length) {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp" && suggestions.length) {
      e.preventDefault();
      setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
    }
  }

  const showList = open && suggestions.length > 0;
  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        if (open && active >= 0 && suggestions[active]) pick(suggestions[active]);
        else if (!text.trim() && !(inList && urlQ)) {
          // Sin criterio no hay búsqueda: se pide escribir uno.
          setEmpty(true);
          setOpen(false);
          input.current?.focus();
        } else go(text);
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
      className="relative ml-auto"
    >
      <input
        ref={input}
        type="search"
        value={text}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Buscar propiedades…"
        aria-label="Buscar propiedades"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="off"
        className="w-[22ch] max-w-full rounded-lg xl:w-[28ch] border border-slate-200 bg-slate-50 py-2 pl-3 pr-[4.5rem] text-sm text-ink placeholder:text-slate-400 transition-[border-color,box-shadow,background-color] focus:border-azure focus:bg-white focus:outline-none focus:ring-2 focus:ring-azure/15 [&::-webkit-search-cancel-button]:hidden"
      />
      <div className="absolute inset-y-0 right-0 flex items-center">
        {text && (
          <button
            type="button"
            onClick={clear}
            aria-label="Borrar búsqueda"
            className="grid h-9 w-8 cursor-pointer place-items-center text-slate-400 transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        )}
        <button
          type="submit"
          aria-label="Buscar"
          className="grid h-full w-9 cursor-pointer place-items-center rounded-r-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
            <circle cx="11" cy="11" r="6.5" />
            <path d="M16 16l4.5 4.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      {empty && (
        <p role="alert" className="absolute left-0 right-0 top-full z-30 mt-1 rounded-lg bg-white px-3 py-2 text-sm text-ink shadow-veil ring-1 ring-slate-200">
          Escribe qué quieres buscar.
        </p>
      )}
      {showList && (
        <ul id={listId} role="listbox" className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-lg bg-white py-1 shadow-veil ring-1 ring-slate-200">
          {suggestions.map((s, i) => (
            <li key={`${s.kind}-${s.label}`} id={`${listId}-${i}`} role="option" aria-selected={i === active}>
              <button
                type="button"
                tabIndex={-1}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(s)}
                className={`flex w-full cursor-pointer items-center justify-between gap-3 px-3 py-2 text-left text-sm text-ink transition-colors hover:bg-slate-100 ${i === active ? "bg-slate-100" : ""}`}
              >
                <span className="truncate">{s.label}</span>
                <span className="shrink-0 text-xs text-slate-500">{s.kind}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
