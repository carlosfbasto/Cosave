import { Router } from "express";
import { z } from "zod";
import { handler, HttpError } from "../lib/errors.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

/** Avisos dentro de la app (campana del header): coincidencias de búsquedas guardadas. */
export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);

const listQuery = z.object({ limit: z.coerce.number().int().min(1).max(100).default(50) });

/** Mis avisos más recientes, con la clave de la propiedad encontrada y cuántos faltan por leer. */
notificationsRouter.get(
  "/",
  handler(async (req, res) => {
    const { limit } = listQuery.parse(req.query);
    const where = { userId: req.user!.id, channel: "in_app" as const };
    const [rows, unread] = await Promise.all([
      prisma.notification.findMany({ where, orderBy: { createdAt: "desc" }, take: limit }),
      prisma.notification.count({ where: { ...where, readAt: null } }),
    ]);
    const ids = [...new Set(rows.map((n) => n.matchPropertyId).filter((id): id is string => !!id))];
    const codes = new Map(
      (await prisma.property.findMany({ where: { id: { in: ids } }, select: { id: true, publicCode: true } })).map((p) => [p.id, p.publicCode]),
    );
    res.json({
      data: rows.map((n) => ({
        id: n.id,
        title: n.subject,
        body: n.body,
        createdAt: n.createdAt,
        read: n.readAt !== null,
        propertyCode: n.matchPropertyId ? (codes.get(n.matchPropertyId) ?? null) : null,
      })),
      meta: { unread },
    });
  }),
);

/** Marca un aviso como leído (solo los propios). */
notificationsRouter.patch(
  "/:id/read",
  handler(async (req, res) => {
    const id = z.string().uuid().parse(req.params["id"]);
    const n = await prisma.notification.findFirst({ where: { id, userId: req.user!.id, channel: "in_app" }, select: { readAt: true } });
    if (!n) throw new HttpError(404, "not_found", "Notificación no encontrada");
    if (!n.readAt) await prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
    res.status(204).end();
  }),
);

/** Elimina un aviso propio. */
notificationsRouter.delete(
  "/:id",
  handler(async (req, res) => {
    const id = z.string().uuid().parse(req.params["id"]);
    const { count } = await prisma.notification.deleteMany({ where: { id, userId: req.user!.id, channel: "in_app" } });
    if (!count) throw new HttpError(404, "not_found", "Notificación no encontrada");
    res.status(204).end();
  }),
);

/** Marca todos mis avisos como leídos. */
notificationsRouter.post(
  "/read-all",
  handler(async (req, res) => {
    await prisma.notification.updateMany({ where: { userId: req.user!.id, channel: "in_app", readAt: null }, data: { readAt: new Date() } });
    res.status(204).end();
  }),
);
