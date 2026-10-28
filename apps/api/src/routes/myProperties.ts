import { Router, raw } from "express";
import { z } from "zod";
import {
  allowedTransitions,
  BLURRY_IMAGE_MESSAGE,
  editScope,
  IMAGE_LABEL,
  IMAGE_LIMITS,
  LIMITED_EDIT_FIELDS,
  propertyCreateSchema,
  propertyPatchSchema,
  PROPERTY_STATUS_LABEL,
  propertyStatusSchema,
} from "@cosave/shared";
import { auditCreate, changedFields } from "../lib/audit.js";
import { handler, HttpError } from "../lib/errors.js";
import { MIN_SHARPNESS, sharpness } from "../lib/image-quality.js";
import { EXTENSION, sniffImage } from "../lib/magic.js";
import { prisma } from "../lib/prisma.js";
import { assertComplete, currentValues, moveStatus, nextPublicCode, ownedProperty, submit, withPostalCode, writeData } from "../lib/property-service.js";
import { ownerView, propertyInclude } from "../lib/property-view.js";
import { removeImage, uploadImage } from "../lib/storage.js";

/** Mis propiedades (se monta en /me/properties; ya exige cuenta). Todo se filtra por dueño. */
export const myPropertiesRouter = Router();

const idParam = z.object({ id: z.string().uuid() });
const imageParam = z.object({ id: z.string().uuid(), imageId: z.string().uuid() });

async function view(id: string, ownerId: string) {
  const p = await ownedProperty(id, ownerId);
  const pendingInquiries = await prisma.inquiry.count({ where: { propertyId: p.id, status: "pending" } });
  return ownerView(p, { pendingInquiries });
}

myPropertiesRouter.get(
  "/",
  handler(async (req, res) => {
    const rows = await prisma.property.findMany({
      where: { ownerId: req.user!.id },
      orderBy: { updatedAt: "desc" },
      include: propertyInclude,
    });
    const counts = await prisma.inquiry.groupBy({
      by: ["propertyId"],
      where: { status: "pending", property: { ownerId: req.user!.id } },
      _count: true,
    });
    const byProperty = new Map(counts.map((c) => [c.propertyId, c._count]));
    res.json({ data: rows.map((p) => ownerView(p, { pendingInquiries: byProperty.get(p.id) ?? 0 })) });
  }),
);

myPropertiesRouter.post(
  "/",
  handler(async (req, res) => {
    const input = await withPostalCode(propertyCreateSchema.parse(req.body));
    const { property, location, features } = writeData(input, input.type);
    const id = await prisma.$transaction(async (tx) => {
      const created = await tx.property.create({
        data: {
          publicCode: await nextPublicCode(tx),
          type: input.type,
          operation: input.operation,
          title: input.title ?? "",
          description: input.description ?? null,
          price: input.price ?? 0,
          maintenanceFee: property.maintenanceFee as number | null | undefined,
          ownerId: req.user!.id,
          status: "draft",
          location: { create: { state: input.state ?? "", city: input.city ?? "", ...location } },
          features: { create: features },
        },
        select: { id: true },
      });
      return created.id;
    });
    res.status(201).json({ data: await view(id, req.user!.id) });
  }),
);

myPropertiesRouter.get(
  "/:id",
  handler(async (req, res) => {
    const { id } = idParam.parse(req.params);
    const data = await view(id, req.user!.id);
    const events = await prisma.propertyStatusEvent.findMany({ where: { propertyId: id }, orderBy: { createdAt: "desc" }, take: 20 });
    res.json({ data: { ...data, history: events.map((e) => ({ from: e.fromStatus, to: e.toStatus, note: e.note, at: e.createdAt.toISOString() })) } });
  }),
);

myPropertiesRouter.patch(
  "/:id",
  handler(async (req, res) => {
    const { id } = idParam.parse(req.params);
    const p = await ownedProperty(id, req.user!.id);
    const parsed = propertyPatchSchema.parse(req.body);
    // Estado y ciudad salen del código postal: si cambió se vuelven a tomar del catálogo; si no, se conservan los guardados.
    const patch =
      parsed.postalCode && parsed.postalCode !== p.location?.postalCode
        ? await withPostalCode(parsed)
        : p.location?.postalCode
          ? { ...parsed, state: undefined, city: undefined }
          : parsed;

    const scope = editScope(p.status);
    if (scope === "locked") {
      const why =
        p.status === "pending"
          ? "Está en revisión y no se puede editar. Regrésala a borrador si necesitas hacer cambios."
          : `Una propiedad ${PROPERTY_STATUS_LABEL[p.status].toLowerCase()} ya no se puede editar.`;
      throw new HttpError(409, "locked", why);
    }
    if (scope === "limited") {
      const current = currentValues(p);
      const blocked = Object.entries(patch).filter(
        ([k, v]) => !(LIMITED_EDIT_FIELDS as readonly string[]).includes(k) && v !== undefined && (v ?? null) !== (current[k] ?? null),
      );
      if (blocked.length) {
        throw new HttpError(
          409,
          "limited",
          "En una propiedad publicada solo puedes cambiar precio, descripción y características. Para cambiar tipo, operación o ubicación regrésala a borrador.",
          { fields: blocked.map(([k]) => k) },
        );
      }
    }

    const type = patch.type ?? p.type;
    const { property, location, features } = writeData(patch, type, p.features?.amenities ?? []);
    // En una propiedad ya visible (publicada o pausada) cada cambio queda en la bitácora; un borrador no.
    const changes = scope === "limited" ? changedFields(currentValues(p), patch) : null;
    await prisma.$transaction([
      prisma.property.update({
        where: { id },
        data: {
          ...property,
          ...(Object.keys(location).length && { location: { upsert: { create: { state: "", city: "", ...location }, update: location } } }),
          ...(Object.keys(features).length && { features: { upsert: { create: features, update: features } } }),
        },
      }),
      ...(changes?.keys.length
        ? [auditCreate({ actorId: req.user!.id, action: "property.edited", entityType: "property", entityId: id, before: changes.before, after: changes.after })]
        : []),
    ]);
    res.json({ data: await view(id, req.user!.id) });
  }),
);

/** Envía a revisión. Si hay posibles duplicados responde 409 y se reenvía con `confirmDuplicate`. */
myPropertiesRouter.post(
  "/:id/submit",
  handler(async (req, res) => {
    const { id } = idParam.parse(req.params);
    const { confirmDuplicate } = z.object({ confirmDuplicate: z.boolean().default(false) }).strict().parse(req.body ?? {});
    const p = await ownedProperty(id, req.user!.id);
    if (!allowedTransitions(p.status, "owner", p.operation).includes("pending")) {
      throw new HttpError(409, "invalid_transition", `Una propiedad ${PROPERTY_STATUS_LABEL[p.status].toLowerCase()} no se puede enviar a revisión.`);
    }
    await submit(p, req.user!.id, confirmDuplicate);
    res.json({ data: await view(id, req.user!.id) });
  }),
);

/** Cambia el estado (pausar, reactivar, vendida/rentada, retirar, volver a borrador). */
myPropertiesRouter.post(
  "/:id/status",
  handler(async (req, res) => {
    const { id } = idParam.parse(req.params);
    const { to } = z.object({ to: propertyStatusSchema }).strict().parse(req.body);
    if (to === "pending") throw new HttpError(409, "use_submit", "Para enviar a revisión usa el botón Enviar.");
    const p = await ownedProperty(id, req.user!.id);
    if (!allowedTransitions(p.status, "owner", p.operation).includes(to)) {
      throw new HttpError(
        409,
        "invalid_transition",
        `No puedes pasar de «${PROPERTY_STATUS_LABEL[p.status]}» a «${PROPERTY_STATUS_LABEL[to]}».`,
      );
    }
    // Reactivar exige que siga cumpliendo las condiciones para mostrarse.
    if (to === "published") assertComplete(p);
    await moveStatus(p, to, req.user!.id, { data: to === "draft" ? { submittedAt: null } : {} });
    res.json({ data: await view(id, req.user!.id) });
  }),
);

/** Fotos: el cuerpo es el archivo tal cual (Content-Type de la imagen). Una foto por petición. */
myPropertiesRouter.post(
  "/:id/images",
  raw({ type: () => true, limit: IMAGE_LIMITS.maxBytes }),
  handler(async (req, res) => {
    const { id } = idParam.parse(req.params);
    const p = await ownedProperty(id, req.user!.id);
    if (editScope(p.status) === "locked") throw new HttpError(409, "locked", "No puedes cambiar las fotos en este estado.");
    if (p.images.length >= IMAGE_LIMITS.maxCount) {
      throw new HttpError(422, "too_many_images", `Ya tienes ${IMAGE_LIMITS.maxCount} fotos, el máximo. Elimina alguna para subir otra.`);
    }
    const body = req.body as unknown;
    if (!Buffer.isBuffer(body) || body.length === 0) throw new HttpError(422, "invalid_image", "No se recibió ninguna imagen.");
    const mime = sniffImage(body);
    if (!mime) throw new HttpError(422, "invalid_image", `Ese archivo no es una imagen permitida. Usa ${IMAGE_LABEL}.`);
    const score = await sharpness(body).catch(() => null);
    if (score === null) throw new HttpError(422, "invalid_image", "No pudimos leer esa imagen. Prueba con otra o vuelve a exportarla.");
    if (score < MIN_SHARPNESS) {
      const message = BLURRY_IMAGE_MESSAGE.charAt(0).toUpperCase() + BLURRY_IMAGE_MESSAGE.slice(1);
      throw new HttpError(422, "blurry_image", message, { sharpness: Math.round(score) });
    }

    const path = `${p.id}/${crypto.randomUUID()}.${EXTENSION[mime]}`;
    await uploadImage(path, body, mime);
    const position = p.images.reduce((m, i) => Math.max(m, i.position), -1) + 1;
    await prisma.propertyImage.create({ data: { propertyId: p.id, storagePath: path, position } });
    res.status(201).json({ data: await view(id, req.user!.id) });
  }),
);

myPropertiesRouter.delete(
  "/:id/images/:imageId",
  handler(async (req, res) => {
    const { id, imageId } = imageParam.parse(req.params);
    const p = await ownedProperty(id, req.user!.id);
    if (editScope(p.status) === "locked") throw new HttpError(409, "locked", "No puedes cambiar las fotos en este estado.");
    const img = p.images.find((i) => i.id === imageId);
    if (!img) throw new HttpError(404, "not_found", "Foto no encontrada");
    // Una propiedad visible no puede quedarse sin fotos.
    if (p.status === "published" && p.images.length === 1) {
      throw new HttpError(409, "last_image", "Una propiedad publicada necesita al menos una foto. Sube otra antes de borrar esta.");
    }
    await prisma.$transaction([
      prisma.propertyImage.delete({ where: { id: imageId } }),
      auditCreate({
        actorId: req.user!.id,
        action: "property.image_deleted",
        entityType: "property",
        entityId: id,
        before: { imageId, storagePath: img.storagePath, position: img.position },
      }),
    ]);
    await removeImage(img.storagePath);
    res.json({ data: await view(id, req.user!.id) });
  }),
);

/** La foto principal es la de posición 0: se intercambia con la actual. */
myPropertiesRouter.patch(
  "/:id/images/:imageId/cover",
  handler(async (req, res) => {
    const { id, imageId } = imageParam.parse(req.params);
    const p = await ownedProperty(id, req.user!.id);
    if (editScope(p.status) === "locked") throw new HttpError(409, "locked", "No puedes cambiar las fotos en este estado.");
    const ordered = p.images.map((i) => i.id);
    if (!ordered.includes(imageId)) throw new HttpError(404, "not_found", "Foto no encontrada");
    const next = [imageId, ...ordered.filter((x) => x !== imageId)];
    await prisma.$transaction(next.map((imgId, position) => prisma.propertyImage.update({ where: { id: imgId }, data: { position } })));
    res.json({ data: await view(id, req.user!.id) });
  }),
);
