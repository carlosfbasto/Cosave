import { Router } from "express";
import { savedSearchCriteriaSchema } from "@cosave/shared";
import { z } from "zod";
import { handler } from "../lib/errors.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

/** Búsquedas guardadas ("No encontré lo que busco"): criterios para avisar al usuario cuando haya coincidencias. */
export const savedSearchesRouter = Router();
savedSearchesRouter.use(requireAuth);

const select = {
  id: true,
  operation: true,
  propertyType: true,
  state: true,
  city: true,
  minPrice: true,
  maxPrice: true,
  createdAt: true,
} as const;

type Row = { minPrice: { toNumber(): number } | null; maxPrice: { toNumber(): number } | null };
const view = <T extends Row>(r: T) => ({ ...r, minPrice: r.minPrice?.toNumber() ?? null, maxPrice: r.maxPrice?.toNumber() ?? null });

/** Mis búsquedas guardadas activas, más recientes primero. */
savedSearchesRouter.get(
  "/",
  handler(async (req, res) => {
    const rows = await prisma.savedSearch.findMany({
      where: { userId: req.user!.id, active: true },
      orderBy: { createdAt: "desc" },
      select,
    });
    res.json({ data: rows.map(view) });
  }),
);

savedSearchesRouter.post(
  "/",
  handler(async (req, res) => {
    const c = savedSearchCriteriaSchema.parse(req.body);
    // El aviso de coincidencias se manda por correo (Resend).
    const row = await prisma.savedSearch.create({ data: { ...c, userId: req.user!.id, channels: ["email"] }, select });
    res.status(201).json({ data: view(row) });
  }),
);

/** Borrar una búsqueda que ya no existe no es error. Se eliminan en cascada sus coincidencias. */
savedSearchesRouter.delete(
  "/:id",
  handler(async (req, res) => {
    const id = z.string().uuid().parse(req.params["id"]);
    await prisma.savedSearch.deleteMany({ where: { id, userId: req.user!.id } });
    res.json({ data: { id, deleted: true } });
  }),
);
