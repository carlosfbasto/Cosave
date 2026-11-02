import { Router } from "express";
import { z } from "zod";
import { handler, HttpError } from "../lib/errors.js";
import { lookupPostalCode } from "../lib/postal-codes.js";

/** Ruta PÚBLICA: estado, ciudad y colonias de un código postal (formulario de publicar). */
export const postalCodesRouter = Router();

postalCodesRouter.get(
  "/:code",
  handler(async (req, res) => {
    const { code } = z.object({ code: z.string().regex(/^\d{5}$/, "El código postal debe tener 5 dígitos") }).parse(req.params);
    const info = await lookupPostalCode(code);
    if (!info) throw new HttpError(404, "not_found", "No encontramos ese código postal. Revisa que esté bien escrito.");
    res.set("Cache-Control", "public, max-age=3600").json({ data: info });
  }),
);
