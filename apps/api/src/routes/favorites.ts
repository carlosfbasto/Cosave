import { Router } from "express";
import { z } from "zod";
import { handler, HttpError } from "../lib/errors.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

/** Favoritos del usuario autenticado. Asociados a la cuenta, así que se ven desde cualquier dispositivo. */
export const favoritesRouter = Router();
favoritesRouter.use(requireAuth);

const codeParam = z.object({ code: z.string().trim().min(1).max(40) });

favoritesRouter.get(
  "/",
  handler(async (req, res) => {
    const rows = await prisma.favorite.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
      select: {
        createdAt: true,
        property: {
          select: {
            publicCode: true,
            title: true,
            status: true,
            operation: true,
            price: true,
            currency: true,
            location: { select: { city: true } },
          },
        },
      },
    });
    res.json({ data: rows.map((r) => ({ savedAt: r.createdAt, ...r.property })) });
  }),
);

/** Idempotente: guardar dos veces la misma propiedad no crea duplicados (clave compuesta). */
favoritesRouter.put(
  "/:code",
  handler(async (req, res) => {
    const { code } = codeParam.parse(req.params);
    const property = await prisma.property.findUnique({ where: { publicCode: code }, select: { id: true, status: true } });
    if (!property) throw new HttpError(404, "not_found", "Propiedad no encontrada");
    if (property.status !== "published") throw new HttpError(409, "unavailable", "Esta propiedad ya no está disponible");
    const userId = req.user!.id;
    await prisma.favorite.upsert({
      where: { userId_propertyId: { userId, propertyId: property.id } },
      update: {},
      create: { userId, propertyId: property.id },
    });
    res.json({ data: { code, saved: true } });
  }),
);

/** Quitar un favorito que ya no existe no es error. Se permite aunque la propiedad ya no esté publicada. */
favoritesRouter.delete(
  "/:code",
  handler(async (req, res) => {
    const { code } = codeParam.parse(req.params);
    await prisma.favorite.deleteMany({ where: { userId: req.user!.id, property: { publicCode: code } } });
    res.json({ data: { code, saved: false } });
  }),
);
