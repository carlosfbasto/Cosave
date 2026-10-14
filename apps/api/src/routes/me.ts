import { Router } from "express";
import { z } from "zod";
import { handler, HttpError } from "../lib/errors.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { myPropertiesRouter } from "./myProperties.js";

export const meRouter = Router();
meRouter.use(requireAuth);
meRouter.use("/properties", myPropertiesRouter);

const updateSchema = z
  .object({
    fullName: z.string().trim().min(1).max(120).optional(),
    phone: z.string().trim().max(30).nullable().optional(),
    city: z.string().trim().max(80).nullable().optional(),
  })
  .strict();

meRouter.get(
  "/",
  handler(async (req, res) => {
    const profile = await prisma.profile.findUnique({ where: { id: req.user!.id } });
    if (!profile) throw new HttpError(404, "not_found", "Perfil no encontrado");
    res.json({ data: profile });
  }),
);

meRouter.patch(
  "/",
  handler(async (req, res) => {
    const data = updateSchema.parse(req.body);
    const profile = await prisma.profile.update({ where: { id: req.user!.id }, data });
    res.json({ data: profile });
  }),
);
