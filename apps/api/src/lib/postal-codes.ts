import type { PostalCodeInfo } from "@cosave/shared";
import { prisma } from "./prisma.js";

/** El valor que más se repite (la ciudad o el municipio de un código suele ser uno solo). */
function mostCommon(values: (string | null)[]): string | null {
  const counts = new Map<string, number>();
  for (const v of values) if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

/** Promedio de las coordenadas de las colonias que las tienen. */
function centerOf(rows: { latitude: number | null; longitude: number | null }[]): PostalCodeInfo["center"] {
  const points = rows.filter((r) => r.latitude !== null && r.longitude !== null);
  if (!points.length) return null;
  return {
    lat: points.reduce((s, r) => s + r.latitude!, 0) / points.length,
    lng: points.reduce((s, r) => s + r.longitude!, 0) / points.length,
  };
}

/** Recuadro con todas las coordenadas del municipio (para que el mapa lo muestre completo). */
async function municipalityBounds(state: string, municipality: string): Promise<PostalCodeInfo["bounds"]> {
  const r = await prisma.postalCode.aggregate({
    where: { state, municipality, latitude: { not: null } },
    _min: { latitude: true, longitude: true },
    _max: { latitude: true, longitude: true },
  });
  const { _min: lo, _max: hi } = r;
  if (lo.latitude === null || lo.longitude === null || hi.latitude === null || hi.longitude === null) return null;
  return [
    [lo.latitude, lo.longitude],
    [hi.latitude, hi.longitude],
  ];
}

/** Estado, ciudad, municipio, colonias, centro y recuadro del municipio de un código postal; null si no está en el catálogo. */
export async function lookupPostalCode(code: string): Promise<PostalCodeInfo | null> {
  const rows = await prisma.postalCode.findMany({
    where: { code },
    select: { settlement: true, state: true, municipality: true, city: true, latitude: true, longitude: true },
  });
  if (!rows.length) return null;
  const state = mostCommon(rows.map((r) => r.state))!;
  const municipality = mostCommon(rows.map((r) => r.municipality))!;
  return {
    code,
    state,
    municipality,
    // GeoNames no siempre trae la ciudad: entonces se usa el municipio (Mérida, Panabá, Kanasín…).
    city: mostCommon(rows.map((r) => r.city)) ?? municipality,
    settlements: [...new Set(rows.map((r) => r.settlement))].sort((a, b) => a.localeCompare(b, "es")),
    center: centerOf(rows),
    bounds: await municipalityBounds(state, municipality),
  };
}
