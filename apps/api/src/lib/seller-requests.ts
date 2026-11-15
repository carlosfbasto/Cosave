import { Prisma, type PrismaClient } from "@prisma/client";
import { isOpenSellerRequestStatus, OPEN_SELLER_REQUEST_STATUSES, type SellerRequestKind, type SellerRequestStatus } from "@cosave/shared";
import { HttpError } from "./errors.js";

/**
 * Solicitudes de atención del cliente (`SellerRequest`).
 *
 * Regla: de cada tipo, una persona solo puede tener UNA solicitud abierta (`open` o `assigned`).
 * La base no tiene una restricción única que lo garantice (no hay migración), así que se protege con un
 * candado de aviso de PostgreSQL por persona y tipo (`pg_advisory_xact_lock`), que dura lo que dure la transacción.
 *
 * LÍMITE IMPORTANTE: el candado solo funciona si TODAS las operaciones que abren o reabren una solicitud
 * lo toman (hoy: `createSellerRequest` y `changeSellerRequestStatus`). Una escritura directa (SQL a mano,
 * un script, una ruta nueva que use `prisma.sellerRequest` sin pasar por aquí) lo esquiva. No equivale a
 * una restricción única de la base de datos.
 */

type Db = Pick<PrismaClient, "$transaction" | "sellerRequest">;

/** Lo que la persona dueña de la solicitud puede ver. Sin `sellerId` ni `agentId`, que son internos. */
export const PUBLIC_SELECT = { id: true, kind: true, status: true, notes: true, createdAt: true } as const;

const OPEN: SellerRequestStatus[] = [...OPEN_SELLER_REQUEST_STATUSES];

/** Transacciones cortas: sin llamadas externas dentro. `maxWait` espera una conexión; `timeout` limita la transacción. */
export const TX_OPTIONS = {
  isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
  maxWait: 5_000,
  timeout: 10_000,
} as const;

/** Clave del candado. La misma para crear y reabrir: si cambia en uno, se rompe la protección. */
export const sellerRequestLockKey = (sellerId: string, kind: SellerRequestKind): string => `seller_request:${sellerId}:${kind}`;

/**
 * Toma el candado de la pareja persona + tipo hasta el fin de la transacción.
 * `lock_timeout` evita esperar indefinidamente si otra transacción lo tiene.
 */
export async function lockSellerRequest(tx: Prisma.TransactionClient, sellerId: string, kind: SellerRequestKind): Promise<void> {
  await tx.$executeRaw`SET LOCAL lock_timeout = '3s'`;
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${sellerRequestLockKey(sellerId, kind)}::text, 0))`;
}

const alreadyOpen = (message: string) => new HttpError(409, "request_already_open", message);

/**
 * Distingue un fallo técnico transitorio (espera de conexión, tiempo de la transacción, candado ocupado, interbloqueo)
 * de un conflicto de negocio (409, que ya es un HttpError y pasa tal cual). Los demás errores se relanzan como están.
 */
export function mapBusyError(err: unknown): never {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const sqlState = (err.meta as { code?: unknown } | undefined)?.code;
    if (err.code === "P2028" || err.code === "P2034" || (err.code === "P2010" && sqlState === "55P03")) {
      throw new HttpError(503, "busy", "El sistema está ocupado. Inténtalo de nuevo en unos segundos.");
    }
  }
  throw err;
}

/** Crea una solicitud `open`, sin asesor. 409 si la persona ya tiene una abierta de ese tipo. */
export async function createSellerRequest(db: Db, sellerId: string, input: { kind: SellerRequestKind; notes?: string | undefined }) {
  try {
    return await db.$transaction(async (tx) => {
      await lockSellerRequest(tx, sellerId, input.kind);
      const existing = await tx.sellerRequest.findFirst({ where: { sellerId, kind: input.kind, status: { in: OPEN } }, select: { id: true } });
      if (existing) throw alreadyOpen("Ya tienes una solicitud abierta de este tipo. Podrás crear otra cuando se cierre.");
      return tx.sellerRequest.create({
        data: { sellerId, kind: input.kind, ...(input.notes !== undefined && { notes: input.notes }) },
        select: PUBLIC_SELECT,
      });
    }, TX_OPTIONS);
  } catch (err) {
    return mapBusyError(err);
  }
}

/** Solicitudes de una sola persona (el filtro siempre es `sellerId`; nunca viene del cliente). Orden estable. */
export async function listSellerRequests(db: Db, sellerId: string, page: number, pageSize: number) {
  const where = { sellerId };
  const [data, total] = await Promise.all([
    db.sellerRequest.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: PUBLIC_SELECT,
    }),
    db.sellerRequest.count({ where }),
  ]);
  return { data, meta: { page, pageSize, total } };
}

/**
 * Cambia el estado desde el admin. Solo la REAPERTURA (de `closed` a `open`/`assigned`) ocupa un cupo, así que solo ahí
 * se comprueba que no haya otra abierta del mismo tipo y persona (excluyendo esta misma). El resto de transiciones,
 * incluida `open` → `assigned`, no cambia.
 *
 * No toca `agentId`: hoy `assigned` es solo una etiqueta de estado, sin asesor asociado (decisión pendiente).
 */
export async function changeSellerRequestStatus(db: Db, id: string, status: SellerRequestStatus) {
  const found = await db.sellerRequest.findUnique({ where: { id }, select: { sellerId: true, kind: true } });
  if (!found) throw new HttpError(404, "not_found", "Solicitud no encontrada");
  try {
    return await db.$transaction(async (tx) => {
      // `sellerId` y `kind` no cambian nunca, así que la clave del candado es la misma que se calculó arriba.
      await lockSellerRequest(tx, found.sellerId, found.kind);
      // Con el candado tomado se vuelve a leer: pudo cambiar (o borrarse) mientras se esperaba.
      const current = await tx.sellerRequest.findUnique({ where: { id }, select: { status: true } });
      if (!current) throw new HttpError(404, "not_found", "Solicitud no encontrada");
      if (current.status === "closed" && isOpenSellerRequestStatus(status)) {
        const other = await tx.sellerRequest.findFirst({
          where: { sellerId: found.sellerId, kind: found.kind, status: { in: OPEN }, id: { not: id } },
          select: { id: true },
        });
        if (other) throw alreadyOpen("Esta persona ya tiene otra solicitud abierta de este tipo. Ciérrala antes de reabrir esta.");
      }
      return tx.sellerRequest.update({ where: { id }, data: { status }, select: { id: true, kind: true, status: true } });
    }, TX_OPTIONS);
  } catch (err) {
    return mapBusyError(err);
  }
}
