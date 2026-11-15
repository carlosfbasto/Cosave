import { Router } from "express";
import { z } from "zod";
import { createSellerRequestSchema } from "@cosave/shared";
import { handler } from "../lib/errors.js";
import { prisma } from "../lib/prisma.js";
import { createSellerRequest, listSellerRequests } from "../lib/seller-requests.js";
import { requireAuth } from "../middleware/auth.js";

/**
 * Solicitudes generales de atención del cliente ("Quiero vender"). Cualquier cuenta con sesión puede crearlas;
 * cada persona solo ve las suyas. La gestión (listar todas, cambiar estado) está en /admin/seller-requests.
 */
export const sellerRequestsRouter = Router();
sellerRequestsRouter.use(requireAuth);

const listQuery = z.object({
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

/** Crear una solicitud. El dueño sale del token; el cuerpo solo admite `kind` y `notes`. */
sellerRequestsRouter.post(
  "/",
  handler(async (req, res) => {
    const input = createSellerRequestSchema.parse(req.body);
    const data = await createSellerRequest(prisma, req.user!.id, input);
    res.status(201).json({ data });
  }),
);

/** Mis solicitudes, más recientes primero. No acepta ningún filtro por persona. */
sellerRequestsRouter.get(
  "/",
  handler(async (req, res) => {
    const { page, pageSize } = listQuery.parse(req.query);
    res.json(await listSellerRequests(prisma, req.user!.id, page, pageSize));
  }),
);
