import { Router } from "express";
import { z } from "zod";
import { handler, HttpError } from "../lib/errors.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

/** Bandeja de consultas. Crear una consulta vive en `POST /properties/:code/contact`. */
export const inquiriesRouter = Router();
inquiriesRouter.use(requireAuth);

const listQuery = z.object({ property: z.string().trim().min(1).max(40).optional() });

const select = {
  id: true,
  message: true,
  status: true,
  createdAt: true,
  property: { select: { publicCode: true, title: true, status: true } },
} as const;

/** Consultas que envié yo (opcionalmente solo las de una propiedad). */
inquiriesRouter.get(
  "/",
  handler(async (req, res) => {
    const q = listQuery.parse(req.query);
    const data = await prisma.inquiry.findMany({
      where: { senderId: req.user!.id, ...(q.property && { property: { publicCode: q.property } }) },
      orderBy: { createdAt: "desc" },
      select,
    });
    res.json({ data });
  }),
);

/** Consultas recibidas en mis propiedades (anunciante). Incluye los datos de contacto que la persona compartió. */
inquiriesRouter.get(
  "/received",
  handler(async (req, res) => {
    const data = await prisma.inquiry.findMany({
      where: { property: { ownerId: req.user!.id } },
      orderBy: { createdAt: "desc" },
      select: { ...select, contactName: true, contactEmail: true, contactPhone: true },
    });
    res.json({ data });
  }),
);

/** El anunciante marca una consulta recibida como respondida (la respuesta va por el contacto que dejó la persona). */
inquiriesRouter.patch(
  "/:id",
  handler(async (req, res) => {
    const id = z.string().uuid().parse(req.params["id"]);
    z.object({ status: z.literal("answered") }).strict().parse(req.body);
    const inquiry = await prisma.inquiry.findFirst({ where: { id, property: { ownerId: req.user!.id } }, select: { id: true } });
    if (!inquiry) throw new HttpError(404, "not_found", "Consulta no encontrada");
    const data = await prisma.inquiry.update({ where: { id }, data: { status: "answered" }, select });
    res.json({ data });
  }),
);
