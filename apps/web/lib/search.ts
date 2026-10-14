import type { ListedProperty } from "./mock-data";

/** Palabras que no ayudan a encontrar ("casa en Mérida de hasta…"). */
const STOP = new Set([
  "en", "de", "del", "la", "el", "los", "las", "un", "una", "unos", "unas", "con", "para", "por", "y", "o", "a", "al",
  "hasta", "desde", "que", "quiero", "busco", "buscando", "me", "mi", "su", "minimo", "maximo", "menos", "mas", "precio", "pesos", "mxn",
]);

/** Minúsculas y sin acentos, para comparar "Mérida" con "merida". */
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** "casas" → "casa": tolera plurales sencillos. */
const stem = (w: string) => (w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w);

export interface ParsedQuery {
  words: string[];
  minPrice?: number;
  maxPrice?: number;
}

/**
 * Interpreta texto libre: "casa en Mérida de hasta $2,000,000" →
 * palabras ["casa", "merida"] y precio máximo 2,000,000.
 * Un monto con "desde / mínimo / más de" es precio mínimo; cualquier otro, máximo.
 */
export function parseQuery(raw: string): ParsedQuery {
  const out: ParsedQuery = { words: [] };
  const text = norm(raw).replace(/(?:(desde|minimo|mas de)\s+)?\$?\s*(\d[\d,.]*)\s*(millones|millon|mil|k)?/g, (_m, lo, num: string, unit) => {
    const digits = (num.match(/\./g) ?? []).length > 1 ? num.replace(/\./g, "") : num;
    let n = parseFloat(digits.replace(/,/g, ""));
    if (Number.isNaN(n)) return " ";
    if (unit === "millones" || unit === "millon") n *= 1_000_000;
    else if (unit === "mil" || unit === "k") n *= 1_000;
    if (n >= 1000) {
      if (lo) out.minPrice = n;
      else out.maxPrice = n;
    }
    return " ";
  });
  out.words = text
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 1 && !STOP.has(w))
    .map(stem);
  return out;
}

/** Todas las palabras deben aparecer en alguna parte de la ficha, y el precio dentro del rango pedido. */
export function matchesQuery(p: ListedProperty, q: ParsedQuery): boolean {
  if (q.minPrice !== undefined && p.price < q.minPrice) return false;
  if (q.maxPrice !== undefined && p.price > q.maxPrice) return false;
  if (q.words.length === 0) return true;
  const op = p.operation === "rent" ? "renta rentar alquiler" : "venta vender comprar";
  const hay = norm(`${p.title} ${p.description} ${p.city} ${p.type} ${p.zone} ${p.state} ${op}`);
  return q.words.every((w) => hay.includes(w));
}
