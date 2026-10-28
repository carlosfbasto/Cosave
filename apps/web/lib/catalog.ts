import type { Amenity, Material, OperationType, PropertyStatus, PropertyType as DbType } from "@cosave/shared";
import { DB_TYPE, listedProperties, type ListedProperty, type PropertyType } from "./mock-data";

/**
 * Catálogo público desde el api (`GET /properties/catalog` y `GET /properties/:code`).
 * Si el api no responde se usan los datos de demostración, para que el sitio no quede vacío en desarrollo.
 */
export interface ApiProperty {
  code: string;
  title: string;
  description: string | null;
  type: DbType;
  operation: OperationType;
  price: number;
  maintenanceFee?: number | null;
  state: string;
  city: string;
  zone: string | null;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  parkingSpots: number | null;
  landAreaM2: number | null;
  builtAreaM2: number | null;
  amenities?: Amenity[];
  materials?: Material[];
  status: PropertyStatus;
  publishedAt: string;
  images: string[];
  advertiser?: { fullName: string; memberSince: string };
}

/** Tipo de la BD → etiqueta del listado. */
const TYPE_LABEL = Object.fromEntries(Object.entries(DB_TYPE).map(([label, db]) => [db, label])) as Record<DbType, PropertyType>;
export const PLACEHOLDER_IMAGE = "/img/casa-blanca.jpg";

const API = () => `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3300"}/api/v1`;

export function toListed(a: ApiProperty): ListedProperty {
  return {
    code: a.code,
    title: a.title,
    description: a.description ?? "",
    operation: a.operation,
    price: a.price,
    city: a.city,
    state: a.state,
    zone: a.zone ?? "Centro",
    type: TYPE_LABEL[a.type],
    bedrooms: a.bedrooms ?? 0,
    bathrooms: a.bathrooms ?? 0,
    area: a.builtAreaM2 ?? a.landAreaM2 ?? 0,
    landArea: a.landAreaM2 ?? 0,
    image: a.images[0] ?? PLACEHOLDER_IMAGE,
    images: a.images,
    publishedAt: a.publishedAt.slice(0, 10),
    map: { x: 50, y: 50 },
    latitude: a.latitude,
    longitude: a.longitude,
    postalCode: a.postalCode,
    parkingSpots: a.parkingSpots,
    maintenanceFee: a.maintenanceFee ?? null,
    amenities: a.amenities ?? [],
    materials: a.materials ?? [],
  };
}

/** Catálogo publicado. `source: "demo"` indica que el api no respondió. */
export async function fetchCatalog(): Promise<{ items: ListedProperty[]; source: "api" | "demo" }> {
  try {
    const res = await fetch(`${API()}/properties/catalog`, { next: { revalidate: 30 } });
    if (!res.ok) throw new Error(String(res.status));
    const body = (await res.json()) as { data: ApiProperty[] };
    return { items: body.data.map(toListed), source: "api" };
  } catch {
    return { items: listedProperties, source: "demo" };
  }
}

export type PropertyLookup =
  | { found: true; property: ListedProperty; status: PropertyStatus; advertiser?: ApiProperty["advertiser"]; source: "api" | "demo" }
  | { found: false };

/** Una propiedad por código, con su estado (la ficha avisa si ya no está disponible). */
export async function fetchProperty(code: string): Promise<PropertyLookup> {
  try {
    const res = await fetch(`${API()}/properties/${encodeURIComponent(code)}`, { next: { revalidate: 30 } });
    if (res.status === 404) return { found: false };
    if (!res.ok) throw new Error(String(res.status));
    const { data } = (await res.json()) as { data: ApiProperty };
    return { found: true, property: toListed(data), status: data.status, advertiser: data.advertiser, source: "api" };
  } catch {
    const demo = listedProperties.find((p) => p.code === code);
    return demo ? { found: true, property: demo, status: "published", source: "demo" } : { found: false };
  }
}
