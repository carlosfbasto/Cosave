import type { ListedProperty } from "./mock-data";

// `norm`, `parseQuery` y `ParsedQuery` viven en `packages/shared` (los comparte el api para buscar en el servidor).
import { norm, parseQuery, type ParsedQuery } from "@cosave/shared";

export { norm, parseQuery };
export type { ParsedQuery };

/** Todas las palabras deben aparecer en alguna parte de la ficha, y el precio dentro del rango pedido. */
export function matchesQuery(p: ListedProperty, q: ParsedQuery): boolean {
  if (q.minPrice !== undefined && p.price < q.minPrice) return false;
  if (q.maxPrice !== undefined && p.price > q.maxPrice) return false;
  if (q.words.length === 0) return true;
  const op = p.operation === "rent" ? "renta rentar alquiler" : "venta vender comprar";
  const hay = norm(`${p.title} ${p.description} ${p.city} ${p.type} ${p.zone} ${p.state} ${op}`);
  return q.words.every((w) => hay.includes(w));
}
