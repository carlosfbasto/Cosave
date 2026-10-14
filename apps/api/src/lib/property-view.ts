import type { Prisma } from "@prisma/client";
import { imageUrl } from "./storage.js";

/** Lo que se lee de la BD para armar cualquier vista de una propiedad. */
export const propertyInclude = {
  location: true,
  features: true,
  images: { orderBy: { position: "asc" } },
} satisfies Prisma.PropertyInclude;

export type PropertyRow = Prisma.PropertyGetPayload<{ include: typeof propertyInclude }>;

const flat = (p: PropertyRow) => ({
  code: p.publicCode,
  title: p.title,
  description: p.description,
  type: p.type,
  operation: p.operation,
  price: Number(p.price),
  currency: p.currency,
  state: p.location?.state ?? "",
  city: p.location?.city ?? "",
  zone: p.location?.zone ?? null,
  address: p.location?.address ?? null,
  postalCode: p.location?.postalCode ?? null,
  latitude: p.location?.latitude ?? null,
  longitude: p.location?.longitude ?? null,
  bedrooms: p.features?.bedrooms ?? null,
  bathrooms: p.features?.bathrooms ?? null,
  parkingSpots: p.features?.parkingSpots ?? null,
  landAreaM2: p.features?.landAreaM2 ?? null,
  builtAreaM2: p.features?.builtAreaM2 ?? null,
});

const images = (p: PropertyRow) => p.images.map((i) => ({ id: i.id, url: imageUrl(i.storagePath), position: i.position }));

/** Vista pública: sin dirección exacta ni datos internos. La primera foto es la principal. */
export function publicView(p: PropertyRow) {
  const { address: _address, ...rest } = flat(p);
  return {
    ...rest,
    status: p.status,
    publishedAt: (p.publishedAt ?? p.createdAt).toISOString(),
    images: images(p).map((i) => i.url),
  };
}

/** Vista del dueño y del admin: todo, incluido el estado interno. */
export function ownerView(p: PropertyRow, extra: { pendingInquiries?: number } = {}) {
  return {
    id: p.id,
    ...flat(p),
    status: p.status,
    reviewNote: p.reviewNote,
    submittedAt: p.submittedAt?.toISOString() ?? null,
    publishedAt: p.publishedAt?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    images: images(p),
    ...extra,
  };
}

export type OwnerProperty = ReturnType<typeof ownerView>;
