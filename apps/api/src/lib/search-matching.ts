import type { OperationType, PropertyType } from "@cosave/shared";
import { prisma } from "./prisma.js";
import type { PropertyRow } from "./property-view.js";

/** Lo que importa de una propiedad para compararla con búsquedas guardadas. */
export interface MatchTarget {
  operation: OperationType;
  type: PropertyType;
  price: number;
  state: string;
  city: string;
  zone: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
}

/** Criterios de una búsqueda guardada; null = "cualquiera". Precios en MXN. */
export interface MatchCriteria {
  operation: OperationType;
  propertyType: PropertyType | null;
  state: string | null;
  city: string | null;
  zone: string | null;
  minPrice: number | null;
  maxPrice: number | null;
  minBedrooms: number | null;
  minBathrooms: number | null;
}

/** "Mérida" = "merida": sin acentos, mayúsculas ni espacios de más. */
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
const same = (wanted: string | null, actual: string | null) => wanted === null || (actual !== null && norm(wanted) === norm(actual));

/**
 * ¿La propiedad cumple la búsqueda? Operación obligatoria; el resto solo si la búsqueda lo pide.
 * Precio exacto, sin margen. Si la propiedad no informa recámaras o baños, no cumple un mínimo pedido.
 */
export function matchesSearch(s: MatchCriteria, p: MatchTarget): boolean {
  return (
    s.operation === p.operation &&
    (s.propertyType === null || s.propertyType === p.type) &&
    same(s.state, p.state) &&
    same(s.city, p.city) &&
    same(s.zone, p.zone) &&
    (s.minPrice === null || p.price >= s.minPrice) &&
    (s.maxPrice === null || p.price <= s.maxPrice) &&
    (s.minBedrooms === null || (p.bedrooms ?? 0) >= s.minBedrooms) &&
    (s.minBathrooms === null || (p.bathrooms ?? 0) >= s.minBathrooms)
  );
}

export const toMatchTarget = (p: PropertyRow): MatchTarget => ({
  operation: p.operation,
  type: p.type,
  price: Number(p.price),
  state: p.location?.state ?? "",
  city: p.location?.city ?? "",
  zone: p.location?.zone ?? null,
  bedrooms: p.features?.bedrooms ?? null,
  bathrooms: p.features?.bathrooms ?? null,
});

/**
 * Al publicarse una propiedad: registra cada coincidencia nueva (SearchMatch) y avisa en la app
 * a quien guardó la búsqueda. Nunca avisa al dueño de la propiedad. Devuelve cuántos avisos creó.
 */
export async function notifySavedSearchMatches(p: PropertyRow): Promise<number> {
  const target = toMatchTarget(p);
  const candidates = await prisma.savedSearch.findMany({
    where: {
      active: true,
      operation: target.operation,
      userId: { not: p.ownerId },
      OR: [{ propertyType: null }, { propertyType: target.type }],
    },
  });
  const hits = candidates.filter((s) =>
    matchesSearch({ ...s, minPrice: s.minPrice?.toNumber() ?? null, maxPrice: s.maxPrice?.toNumber() ?? null }, target),
  );
  if (!hits.length) return 0;

  // Una búsqueda que ya coincidió con esta propiedad (p. ej. publicada, pausada y vuelta a publicar) no se avisa dos veces.
  const already = await prisma.searchMatch.findMany({
    where: { propertyId: p.id, savedSearchId: { in: hits.map((s) => s.id) } },
    select: { savedSearchId: true },
  });
  const seen = new Set(already.map((m) => m.savedSearchId));
  const fresh = hits.filter((s) => !seen.has(s.id));
  if (!fresh.length) return 0;

  const now = new Date();
  await prisma.$transaction([
    prisma.searchMatch.createMany({
      data: fresh.map((s) => ({ savedSearchId: s.id, propertyId: p.id, notifiedAt: now })),
      skipDuplicates: true,
    }),
    prisma.notification.createMany({
      data: fresh.map((s) => ({
        userId: s.userId,
        channel: "in_app" as const,
        status: "sent" as const,
        sentAt: now,
        subject: "Encontramos una propiedad para ti",
        body: `«${p.title}» (${p.publicCode}) coincide con tu búsqueda guardada.`,
        matchSavedSearchId: s.id,
        matchPropertyId: p.id,
      })),
    }),
  ]);
  return fresh.length;
}
