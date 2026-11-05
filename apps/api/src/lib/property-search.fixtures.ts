import type { PropertyStatus, PropertyType, SearchableProperty } from "@cosave/shared";

/**
 * Propiedades de prueba para la búsqueda (solo pruebas, nunca datos reales). Cubren a propósito:
 * variantes de acentos y mayúsculas, espacios raros, `ñ`, zona nula/vacía, características nulas,
 * propiedades sin ubicación, estados no publicados y empates de precio y fecha.
 */
export interface FixtureRow extends SearchableProperty {
  status: PropertyStatus;
  /** false = no existe fila en PropertyLocation. */
  hasLocation: boolean;
  /** false = no existe fila en PropertyFeatures. */
  hasFeatures: boolean;
  /** Fotos de la propiedad (la principal es la de menor posición). */
  images: { path: string; position: number }[];
}

export const fixtureId = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

interface Spec {
  n: number;
  type: PropertyType;
  operation?: "sale" | "rent";
  status?: PropertyStatus;
  title: string;
  description?: string | null;
  price: number;
  state?: string | null;
  city?: string | null;
  zone?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  built?: number | null;
  land?: number | null;
  published?: string | null;
  created?: string;
  hasLocation?: boolean;
  hasFeatures?: boolean;
  /** [latitud, longitud]; null = sin coordenadas. Por omisión, cerca del centro de la ciudad. */
  coords?: [number, number] | null;
  images?: { path: string; position: number }[];
}

/** Centro aproximado de cada ciudad de prueba (solo para el mapa). */
const CENTER: Record<string, [number, number]> = {
  "mérida": [20.97, -89.62],
  tizimín: [21.14, -88.15],
  valladolid: [20.69, -88.2],
  panabá: [21.29, -88.27],
};
const coordsFor = (s: Spec): [number, number] | null => {
  if (s.coords !== undefined) return s.coords;
  if (s.hasLocation === false) return null;
  const center = CENTER[(s.city ?? "Mérida").toLowerCase()];
  return center ? [center[0] + s.n / 1000, center[1] + s.n / 1000] : null;
};

const row = (s: Spec): FixtureRow => ({
  id: fixtureId(s.n),
  type: s.type,
  operation: s.operation ?? "sale",
  status: s.status ?? "published",
  title: s.title,
  description: s.description ?? null,
  price: s.price,
  state: s.hasLocation === false ? null : (s.state ?? "Yucatán"),
  city: s.hasLocation === false ? null : (s.city ?? "Mérida"),
  zone: s.hasLocation === false ? null : (s.zone ?? null),
  bedrooms: s.hasFeatures === false ? null : (s.bedrooms ?? null),
  bathrooms: s.hasFeatures === false ? null : (s.bathrooms ?? null),
  builtAreaM2: s.hasFeatures === false ? null : (s.built ?? null),
  landAreaM2: s.hasFeatures === false ? null : (s.land ?? null),
  publishedAt: s.published === undefined ? `2026-10-${String(s.n).padStart(2, "0")}T10:00:00.000` : s.published,
  createdAt: s.created ?? `2026-09-${String(s.n).padStart(2, "0")}T08:00:00.000`,
  latitude: coordsFor(s)?.[0] ?? null,
  longitude: coordsFor(s)?.[1] ?? null,
  hasLocation: s.hasLocation ?? true,
  hasFeatures: s.hasFeatures ?? true,
  images: s.images ?? [],
});

const TIE = "2026-10-20T10:00:00.000";

export const FIXTURES: FixtureRow[] = [
  row({ n: 1, type: "house", title: "Casa amplia con alberca", description: "Excelente ubicación", price: 2_500_000, zone: "Centro", bedrooms: 3, bathrooms: 2, built: 180, land: 250, images: [{ path: "p/1-segunda.jpg", position: 1 }, { path: "p/1-principal.jpg", position: 0 }] }),
  row({ n: 2, type: "house", title: "Casa familiar", price: 1_800_000, city: "merida", zone: "Norte", bedrooms: 2, bathrooms: 1, built: 120, land: 200, images: [{ path: "/img/casa-blanca.jpg", position: 0 }] }),
  row({ n: 3, type: "apartment", title: "Departamento moderno", price: 1_200_000, state: "YUCATÁN", city: "MÉRIDA", zone: "Norte ", bedrooms: 2, bathrooms: 2, built: 90 }),
  row({ n: 4, type: "land", title: "Terreno plano", price: 900_000, zone: null, land: 500 }),
  row({ n: 5, type: "commercial", operation: "rent", title: "Local en esquina", price: 15_000, zone: "Zona industrial", bathrooms: 1, built: 60 }),
  row({ n: 6, type: "industrial_warehouse", operation: "rent", title: "Bodega con andén", price: 45_000, zone: "Zona  industrial", bathrooms: 2, built: 800, land: 1000 }),
  row({ n: 7, type: "house", title: "Casa céntrica", price: 700_000, city: "Tizimin", zone: "Centro", bedrooms: 2, bathrooms: 1, built: 100, land: 160, coords: [95, -88.15] }),
  row({ n: 8, type: "house", title: "Casa con patio", price: 800_000, city: "Tizimín", zone: "Oriente", bedrooms: 3, bathrooms: 2, built: 140, land: 220 }),
  row({ n: 9, type: "apartment", operation: "rent", title: "Departamento pequeño", price: 8_000, city: "Tizimín", zone: "Oriente", bedrooms: 1, bathrooms: 1, built: 45 }),
  row({ n: 10, type: "land", title: "Terreno esquina", price: 300_000, city: "TIZIMÍN", zone: "Santa Cruz", land: 400 }),
  row({ n: 11, type: "house", title: "Casa Peña grande", price: 650_000, city: "Peña", zone: "Centro", bedrooms: 3, bathrooms: 2, built: 130, land: 180 }),
  row({ n: 12, type: "house", title: "Casa Pena chica", price: 640_000, city: "Pena", zone: "Centro", bedrooms: 2, bathrooms: 1, built: 90, land: 150 }),
  row({ n: 13, type: "house", title: "Casa San Pedro uno", price: 1_000_000, city: "San Pedro", zone: "Norte", bedrooms: 3, bathrooms: 2, built: 150, land: 200, published: TIE, coords: null }),
  row({ n: 14, type: "house", title: "Casa San Pedro dos", price: 1_000_000, city: "San-Pedro", zone: "Norte", bedrooms: 3, bathrooms: 2, built: 150, land: 200, published: TIE }),
  row({ n: 15, type: "house", title: "Casa San Pedro tres", price: 1_000_000, city: "San Pedro", zone: "Norte", bedrooms: 3, bathrooms: 2, built: 150, land: 200, published: TIE, coords: [Number.NaN, -89] }),
  row({ n: 16, type: "house", title: "Casa del sol", price: 1_500_000, city: "Valladolid", zone: "", bedrooms: 4, bathrooms: 3, built: 220, land: 300 }),
  row({ n: 17, type: "house", operation: "rent", title: "Casa para rentar", price: 12_000, city: "Valladolid", zone: "   ", bedrooms: 2, bathrooms: 1, built: 80 }),
  row({ n: 18, type: "apartment", status: "draft", title: "Borrador sin publicar", price: 500_000, city: "Valladolid", zone: "Sur" }),
  row({ n: 19, type: "house", title: "Casa colonial", description: "Detalles de época y patio con jardín", price: 400_000, city: "Panabá", zone: "Sur", bedrooms: 2, bathrooms: 1, built: 100, land: 150 }),
  row({ n: 20, type: "house", title: "Casa sencilla", price: 380_000, city: "Panaba", zone: "Sur", bedrooms: 1, bathrooms: 1, built: 70, land: 120 }),
  row({ n: 21, type: "house", title: "Casa sin ubicación", price: 500_000, hasLocation: false, bedrooms: 2 }),
  row({ n: 22, type: "land", title: "Terreno ciudad vacía", price: 250_000, city: "", zone: null, land: 300 }),
  row({ n: 23, type: "house", status: "paused", title: "Casa pausada", price: 600_000, zone: "Centro" }),
  row({ n: 24, type: "house", title: "Casa sin características", price: 600_000, hasFeatures: false, zone: "Centro" }),
  row({ n: 25, type: "house", operation: "rent", title: "Casas de playa", description: "Cerca del mar", price: 20_000, zone: "Norte", bedrooms: 2, bathrooms: 2, built: 110, published: null }),
];
