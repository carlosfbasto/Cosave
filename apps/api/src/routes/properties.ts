import { Router } from "express";
import { z } from "zod";
import { inquiryInputSchema, operationTypeSchema, propertyTypeSchema } from "@cosave/shared";
import { handler, HttpError } from "../lib/errors.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { propertyInclude, publicView } from "../lib/property-view.js";

/** Rutas PÚBLICAS: ver propiedades no requiere cuenta. Publicar sí (etapa 2); contactar exige cuenta. */
export const propertiesRouter = Router();

const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
  operation: operationTypeSchema.optional(),
  type: propertyTypeSchema.optional(),
  city: z.string().trim().min(1).optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().positive().optional(),
});

propertiesRouter.get(
  "/",
  handler(async (req, res) => {
    const q = listQuery.parse(req.query);
    const where = {
      status: "published" as const,
      ...(q.operation && { operation: q.operation }),
      ...(q.type && { type: q.type }),
      ...(q.city && { location: { is: { city: { equals: q.city, mode: "insensitive" as const } } } }),
      ...((q.minPrice !== undefined || q.maxPrice !== undefined) && {
        price: { ...(q.minPrice !== undefined && { gte: q.minPrice }), ...(q.maxPrice !== undefined && { lte: q.maxPrice }) },
      }),
    };
    const [data, total] = await Promise.all([
      prisma.property.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        select: {
          publicCode: true,
          title: true,
          type: true,
          operation: true,
          price: true,
          currency: true,
          location: { select: { state: true, city: true, zone: true } },
          features: { select: { bedrooms: true, bathrooms: true, builtAreaM2: true } },
        },
      }),
      prisma.property.count({ where }),
    ]);
    res.json({ data, meta: { page: q.page, pageSize: q.pageSize, total } });
  }),
);

/** Estados en los que una propiedad ya se vio públicamente (borrador, pendiente y rechazada nunca se muestran). */
const VISIBLE = ["published", "paused", "sold", "rented", "archived"] as const;

/** Todo el catálogo publicado de una vez: la web filtra, ordena y cuenta por su cuenta. */
propertiesRouter.get(
  "/catalog",
  handler(async (_req, res) => {
    const rows = await prisma.property.findMany({
      where: { status: "published" },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      take: 500,
      include: propertyInclude,
    });
    res.json({ data: rows.map(publicView), meta: { total: rows.length } });
  }),
);

const codeParam = z.object({ code: z.string().trim().min(1).max(40) });

/** Detalle público, incluido su estado (la ficha avisa si ya no está disponible). */
propertiesRouter.get(
  "/:code",
  handler(async (req, res) => {
    const { code } = codeParam.parse(req.params);
    const property = await prisma.property.findFirst({
      where: { publicCode: code, status: { in: [...VISIBLE] } },
      include: { ...propertyInclude, owner: { select: { fullName: true, createdAt: true } } },
    });
    if (!property) throw new HttpError(404, "not_found", "Propiedad no encontrada");
    res.json({
      data: { ...publicView(property), advertiser: { fullName: property.owner.fullName, memberSince: property.owner.createdAt.toISOString() } },
    });
  }),
);

/** "Me interesa": registra la consulta con la propiedad y el usuario. Solo propiedades publicadas. */
propertiesRouter.post(
  "/:code/contact",
  requireAuth,
  handler(async (req, res) => {
    const { code } = codeParam.parse(req.params);
    const input = inquiryInputSchema.parse(req.body);
    const property = await prisma.property.findUnique({
      where: { publicCode: code },
      select: { id: true, status: true, ownerId: true },
    });
    if (!property) throw new HttpError(404, "not_found", "Propiedad no encontrada");
    if (property.status !== "published") throw new HttpError(409, "unavailable", "Esta publicación ya no está disponible");
    if (property.ownerId === req.user!.id) throw new HttpError(409, "own_property", "No puedes contactar tu propia publicación");
    const inquiry = await prisma.inquiry.create({
      data: { ...input, propertyId: property.id, senderId: req.user!.id },
      select: { id: true, status: true, createdAt: true },
    });
    res.status(201).json({ data: inquiry });
  }),
);
