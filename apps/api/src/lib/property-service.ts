import type { Prisma, PropertyStatus } from "@prisma/client";
import { amenitiesFor, FEATURE_FIELDS_BY_TYPE, IMAGE_LIMITS, materialsFor, needsMaintenanceFee, propertyDraftSchema, REQUIRED_FIELD_LABEL, type PropertyPatch } from "@cosave/shared";
import { auditCreate, type AuditEntry } from "./audit.js";
import { env } from "./env.js";
import { HttpError } from "./errors.js";
import { lookupPostalCode } from "./postal-codes.js";
import { prisma } from "./prisma.js";
import { propertyInclude, type PropertyRow } from "./property-view.js";

const FEATURES = ["bedrooms", "bathrooms", "parkingSpots", "landAreaM2", "builtAreaM2"] as const;
const LOCATION = ["state", "city", "zone", "address", "postalCode", "latitude", "longitude"] as const;

/** Carga una propiedad propia. Si no existe o es de otra persona responde 404 (no revela que existe). */
export async function ownedProperty(id: string, ownerId: string): Promise<PropertyRow> {
  const p = await prisma.property.findFirst({ where: { id, ownerId }, include: propertyInclude });
  if (!p) throw new HttpError(404, "not_found", "Propiedad no encontrada");
  return p;
}

/** Valores actuales en el mismo formato que el formulario (null = vacío). */
export function currentValues(p: PropertyRow): Record<string, unknown> {
  return {
    operation: p.operation,
    type: p.type,
    title: p.title,
    description: p.description,
    price: Number(p.price),
    maintenanceFee: p.maintenanceFee === null ? null : Number(p.maintenanceFee),
    state: p.location?.state,
    city: p.location?.city,
    zone: p.location?.zone,
    address: p.location?.address,
    postalCode: p.location?.postalCode,
    latitude: p.location?.latitude,
    longitude: p.location?.longitude,
    bedrooms: p.features?.bedrooms,
    bathrooms: p.features?.bathrooms,
    parkingSpots: p.features?.parkingSpots,
    landAreaM2: p.features?.landAreaM2,
    builtAreaM2: p.features?.builtAreaM2,
    amenities: p.features?.amenities ?? [],
    materials: p.features?.materials ?? [],
  };
}

/**
 * El código postal manda: estado y ciudad se toman del catálogo (no se aceptan escritos a mano).
 * Responde 422 si el código no existe.
 */
export async function withPostalCode<T extends PropertyPatch>(patch: T): Promise<T> {
  if (!patch.postalCode) return patch;
  const info = await lookupPostalCode(patch.postalCode);
  if (!info) throw new HttpError(422, "unknown_postal_code", "No encontramos ese código postal. Revisa que esté bien escrito.", { fields: ["postalCode"] });
  return { ...patch, state: info.state, city: info.city };
}

/**
 * Arma los datos de escritura a partir de un parche (null borra, undefined no toca).
 * `amenities`: las características vigentes, para saber si aplica la cuota de mantenimiento.
 */
export function writeData(patch: PropertyPatch, type: PropertyRow["type"], amenities: readonly string[] = []) {
  const allowed = new Set<string>(FEATURE_FIELDS_BY_TYPE[type]);
  const location: Record<string, unknown> = {};
  const features: Record<string, unknown> = {};
  for (const k of LOCATION) if (patch[k] !== undefined) location[k] = patch[k];
  for (const k of FEATURES) if (patch[k] !== undefined) features[k] = allowed.has(k) ? patch[k] : null;
  // Un tipo sin esa característica (p. ej. terreno sin recámaras) no la conserva.
  if (patch.type) for (const k of FEATURES) if (!allowed.has(k)) features[k] = null;
  // Características y materiales: solo las que aplican al tipo.
  if (patch.amenities) features["amenities"] = patch.amenities.filter((a) => amenitiesFor(type).includes(a));
  if (patch.materials) features["materials"] = patch.materials.filter((m) => materialsFor(type).includes(m));
  // Mantenimiento: solo departamentos y propiedades en privada; si deja de aplicar, se borra.
  const fee = needsMaintenanceFee(type, (features["amenities"] as string[] | undefined) ?? amenities)
    ? patch.maintenanceFee
    : patch.maintenanceFee !== undefined || patch.type || patch.amenities
      ? null
      : undefined;
  const property: Prisma.PropertyUpdateInput = {
    ...(fee !== undefined && { maintenanceFee: fee }),
    ...(patch.operation && { operation: patch.operation }),
    ...(patch.type && { type: patch.type }),
    ...(patch.title !== undefined && { title: patch.title }),
    ...(patch.description !== undefined && { description: patch.description }),
    ...(patch.price !== undefined && { price: patch.price }),
  };
  return { property, location, features };
}

export async function nextPublicCode(tx: Prisma.TransactionClient): Promise<string> {
  const rows = await tx.$queryRaw<{ n: bigint }[]>`SELECT nextval('property_code_seq') AS n`;
  return `COS-${String(rows[0]!.n).padStart(6, "0")}`;
}

/** Comprueba que lo esencial esté completo para enviar o reactivar; el mensaje dice qué falta. */
export function assertComplete(p: PropertyRow) {
  const values = Object.fromEntries(Object.entries(currentValues(p)).map(([k, v]) => [k, v === null || v === "" ? undefined : v]));
  const parsed = propertyDraftSchema.safeParse(values);
  const missing = new Set<string>();
  if (!parsed.success) {
    for (const issue of parsed.error.issues) missing.add(String(issue.path[0]));
  }
  const labels = [...missing].map((k) => REQUIRED_FIELD_LABEL[k] ?? k);
  if (p.images.length === 0) labels.push("al menos una foto");
  if (labels.length) {
    throw new HttpError(422, "incomplete", `Falta completar: ${labels.join(", ")}.`, { missing: [...missing, ...(p.images.length === 0 ? ["images"] : [])] });
  }
  if (p.images.length > IMAGE_LIMITS.maxCount) throw new HttpError(422, "too_many_images", `Máximo ${IMAGE_LIMITS.maxCount} fotos.`);
}

const norm = (s: string | null | undefined) =>
  (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Propiedades vivas que se parecen a esta (misma dirección y código postal, o mismo título y precio). */
export async function findDuplicates(p: PropertyRow): Promise<string[]> {
  const others = await prisma.property.findMany({
    where: {
      id: { not: p.id },
      status: { in: ["pending", "published", "paused"] },
      type: p.type,
      operation: p.operation,
      location: { is: { city: { equals: p.location?.city ?? "", mode: "insensitive" } } },
    },
    include: { location: true },
    take: 200,
  });
  const addr = norm(p.location?.address);
  const title = norm(p.title);
  return others
    .filter((o) => {
      const sameAddress = addr.length > 3 && norm(o.location?.address) === addr && (o.location?.postalCode ?? "") === (p.location?.postalCode ?? "");
      const sameListing = norm(o.title) === title && Number(o.price) === Number(p.price);
      return sameAddress || sameListing;
    })
    .map((o) => o.publicCode);
}

/** Cambia el estado y deja constancia en el historial (y en la bitácora si se pide), en una sola transacción. */
export async function moveStatus(
  p: PropertyRow,
  to: PropertyStatus,
  actorId: string,
  opts: { note?: string | null; data?: Prisma.PropertyUpdateInput; audit?: AuditEntry } = {},
) {
  await prisma.$transaction([
    ...(opts.audit ? [auditCreate(opts.audit)] : []),
    prisma.property.update({
      where: { id: p.id },
      data: {
        ...opts.data,
        status: to,
        ...(to === "published" && !p.publishedAt && { publishedAt: new Date() }),
      },
    }),
    prisma.propertyStatusEvent.create({
      data: { propertyId: p.id, fromStatus: p.status, toStatus: to, actorId, note: opts.note ?? null },
    }),
  ]);
}

/** Envía a revisión (o publica directo si la política no exige aprobación). */
export async function submit(p: PropertyRow, actorId: string, confirmDuplicate: boolean) {
  assertComplete(p);
  const dups = await findDuplicates(p);
  if (dups.length && !confirmDuplicate) {
    throw new HttpError(409, "possible_duplicate", "Encontramos publicaciones muy parecidas. Revisa que no sea una repetida.", { codes: dups });
  }
  const note = dups.length ? `Posible duplicado de ${dups.join(", ")} (confirmado por el usuario).` : null;
  await moveStatus(p, "pending", actorId, { note, data: { submittedAt: new Date(), reviewNote: note } });
  if (!env.PUBLISH_REQUIRES_APPROVAL && !dups.length) {
    const fresh = await prisma.property.findUniqueOrThrow({ where: { id: p.id }, include: propertyInclude });
    await moveStatus(fresh, "published", actorId, { note: "Publicada sin revisión (política)" });
  }
}
