import { z } from "zod";

/**
 * Solicitud general de atención del cliente (tabla `SellerRequest`). NO es un expediente de una propiedad.
 * - `self_publish`: interés en publicar por cuenta propia. No publica nada automáticamente.
 * - `find_agent`: pide que lo atienda un asesor.
 * - `services`: pide información o atención sobre servicios. No confirma contrataciones ni pagos.
 */
export const SELLER_REQUEST_KINDS = ["self_publish", "find_agent", "services"] as const;
/** `open` y `assigned` cuentan como abiertas: de cada tipo solo puede haber una abierta por persona. */
export const SELLER_REQUEST_STATUSES = ["open", "assigned", "closed"] as const;

export const SELLER_REQUEST_NOTES_MAX = 500;

export const sellerRequestKindSchema = z.enum(SELLER_REQUEST_KINDS);
export const sellerRequestStatusSchema = z.enum(SELLER_REQUEST_STATUSES);

export type SellerRequestKind = z.infer<typeof sellerRequestKindSchema>;
export type SellerRequestStatus = z.infer<typeof sellerRequestStatusSchema>;

/** Estados abiertos: ocupan el cupo de su tipo para esa persona. */
export const OPEN_SELLER_REQUEST_STATUSES = ["open", "assigned"] as const satisfies readonly SellerRequestStatus[];

export const isOpenSellerRequestStatus = (status: SellerRequestStatus): boolean =>
  (OPEN_SELLER_REQUEST_STATUSES as readonly string[]).includes(status);

/** Texto para la persona que hizo la solicitud. */
export const SELLER_REQUEST_STATUS_LABEL: Record<SellerRequestStatus, string> = {
  open: "Pendiente",
  assigned: "En proceso",
  closed: "Cerrada",
};

/**
 * Cuerpo de `POST /seller-requests`. Estricto: `sellerId`, `status`, `agentId` u otros campos dan 422.
 * Las notas se recortan antes de medir su largo; si quedan vacías cuentan como "sin notas".
 */
export const createSellerRequestSchema = z
  .object({
    kind: sellerRequestKindSchema,
    notes: z
      .string()
      .trim()
      .max(SELLER_REQUEST_NOTES_MAX)
      .transform((v) => (v === "" ? undefined : v))
      .optional(),
  })
  .strict();

export type CreateSellerRequestInput = z.infer<typeof createSellerRequestSchema>;
