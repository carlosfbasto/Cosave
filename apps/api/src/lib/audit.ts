import type { Prisma } from "@prisma/client";
import type { AuditAction } from "@cosave/shared";
import { prisma } from "./prisma.js";

export interface AuditEntry {
  actorId: string;
  action: AuditAction;
  entityType: "profile" | "property";
  entityId: string;
  /** Solo los campos relevantes que cambiaron; nunca contraseñas ni tokens. */
  before?: Prisma.InputJsonObject;
  after?: Prisma.InputJsonObject;
}

/**
 * Registro en la bitácora. Devuelve la operación sin ejecutarla para incluirla en el mismo
 * `prisma.$transaction([...])` que el cambio: o quedan los dos, o ninguno.
 */
export const auditCreate = (e: AuditEntry) => prisma.auditLog.create({ data: e });

/** Solo los campos que cambiaron entre dos versiones (`before` / `after` de la bitácora). */
export function changedFields(before: Record<string, unknown>, after: Record<string, unknown>) {
  const keys = Object.keys(after).filter((k) => after[k] !== undefined && (after[k] ?? null) !== (before[k] ?? null));
  const pick = (src: Record<string, unknown>) => Object.fromEntries(keys.map((k) => [k, (src[k] ?? null) as Prisma.InputJsonValue | null]));
  return { keys, before: pick(before), after: pick(after) };
}
