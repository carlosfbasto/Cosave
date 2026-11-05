/**
 * Texto y ubicaciones para buscar en el catálogo (web y api comparten esta única versión).
 *
 * Hay DOS normalizaciones distintas, a propósito:
 * - Búsqueda libre (`norm`): tolerante. «pena» debe encontrar «Peña», así que `ñ` → `n`.
 * - Ubicaciones (`locationKey`): define IDENTIDAD de un filtro. `Peña` y `Pena` son lugares distintos
 *   (`ñ` se conserva); solo se ignoran acentos, mayúsculas y espacios repetidos.
 */

/** Palabras que no ayudan a encontrar ("casa en Mérida de hasta…"). */
const STOP = new Set([
  "en", "de", "del", "la", "el", "los", "las", "un", "una", "unos", "unas", "con", "para", "por", "y", "o", "a", "al",
  "hasta", "desde", "que", "quiero", "busco", "buscando", "me", "mi", "su", "minimo", "maximo", "menos", "mas", "precio", "pesos", "mxn",
]);

/** Minúsculas y sin acentos, para comparar "Mérida" con "merida". `ñ` → `n` (búsqueda libre). */
export const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** "casas" → "casa": tolera plurales sencillos (solo quita la `s` final; no hay regla para `-es`). */
export const stem = (w: string) => (w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w);

export interface ParsedQuery {
  words: string[];
  minPrice?: number;
  maxPrice?: number;
}

/**
 * Interpreta texto libre: "casa en Mérida de hasta $2,000,000" →
 * palabras ["casa", "merida"] y precio máximo 2,000,000.
 * Un monto con "desde / mínimo / más de" es precio mínimo; cualquier otro, máximo.
 * Los números menores a 1.000 se descartan (no se interpretan como recámaras).
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

/** "Mérida" → "merida": valor estable para usar en la URL (?ciudad=merida). */
export const slugify = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// ---------------------------------------------------------------------------------------------
// Tablas de plegado (acentos/mayúsculas). Se definen UNA vez y viajan como parámetros al SQL
// (`translate`), de modo que TypeScript y PostgreSQL no puedan divergir. No se usa `lower()`,
// `toLowerCase()` ni `\s` en la clave: dependen de la configuración regional o del motor.
// ---------------------------------------------------------------------------------------------

/** Letras con acento → su letra base. Cada letra se mapea en minúscula y mayúscula. */
const ACCENTED: Record<string, string> = { a: "áàäâãå", e: "éèëê", i: "íìïî", o: "óòöôõ", u: "úùüû", c: "ç", y: "ýÿ" };

interface Fold {
  /** Para `translate(texto, from, to)` de PostgreSQL: mismo largo en caracteres. */
  from: string;
  to: string;
  map: ReadonlyMap<string, string>;
}

function buildFold(enyeToN: boolean): Fold {
  const map = new Map<string, string>();
  for (const [base, accented] of Object.entries(ACCENTED)) {
    for (const ch of accented) {
      map.set(ch, base);
      map.set(ch.toUpperCase(), base);
    }
  }
  for (let c = 0x41; c <= 0x5a; c++) map.set(String.fromCharCode(c), String.fromCharCode(c + 0x20)); // A-Z → a-z
  const enye = enyeToN ? "n" : "ñ";
  map.set("ñ", enye);
  map.set("Ñ", enye);
  return { from: [...map.keys()].join(""), to: [...map.values()].join(""), map };
}

/** Búsqueda libre: igual que `norm` sobre texto en español (`ñ` → `n`). */
export const SEARCH_FOLD = buildFold(true);
/** Ubicaciones: `ñ` se conserva (`Ñ` → `ñ`). */
export const LOCATION_FOLD = buildFold(false);

/** Longitud máxima (unidades UTF-16) de un valor de ubicación que se acepta como filtro. */
export const LOCATION_MAX_LENGTH = 100;

/**
 * Qué es un espacio: exactamente la propiedad Unicode `White_Space`, escrita punto de código por
 * punto de código. NO incluye caracteres de ancho cero (U+200B, U+FEFF), que no son espacios.
 */
export const WHITE_SPACE_CODE_POINTS: readonly number[] = [
  0x0009, 0x000a, 0x000b, 0x000c, 0x000d, 0x0020, 0x0085, 0x00a0, 0x1680,
  0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005, 0x2006, 0x2007, 0x2008, 0x2009, 0x200a,
  0x2028, 0x2029, 0x202f, 0x205f, 0x3000,
];

/** Clase de caracteres «uno o más espacios» para `regexp_replace` de PostgreSQL (caracteres literales). */
export const WHITE_SPACE_SQL_PATTERN = `[${String.fromCharCode(...WHITE_SPACE_CODE_POINTS)}]+`;
const WHITE_SPACE_RE = new RegExp(`[${WHITE_SPACE_CODE_POINTS.map((c) => `\\u${c.toString(16).padStart(4, "0")}`).join("")}]+`, "g");

/** Texto para MOSTRAR: forma compuesta (NFC) y espacios repetidos o de los extremos colapsados. No cambia mayúsculas ni acentos. */
export const tidyText = (value: string) => value.normalize("NFC").replace(WHITE_SPACE_RE, " ").replace(/^ | $/g, "");

/**
 * Clave de identidad de una ubicación (estado, ciudad o zona). Dos valores son el MISMO lugar solo si
 * tienen la misma clave. Pasos: NFC → tabla `LOCATION_FOLD` → tramos de espacios a uno solo → recortar.
 * `""` significa «sin valor utilizable» (no es un lugar).
 * La expresión equivalente en SQL vive en `apps/api/src/lib/property-search.ts` y usa estas mismas constantes.
 */
export function locationKey(value: string): string {
  const folded = Array.from(value.normalize("NFC"), (ch) => LOCATION_FOLD.map.get(ch) ?? ch).join("");
  return folded.replace(WHITE_SPACE_RE, " ").replace(/^ | $/g, "");
}
