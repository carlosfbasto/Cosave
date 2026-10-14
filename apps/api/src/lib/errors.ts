import type { NextFunction, Request, RequestHandler, Response } from "express";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

/** Envuelve handlers async para que los errores lleguen al manejador global. */
export const handler =
  (fn: (req: Request, res: Response) => Promise<void>): RequestHandler =>
  (req, res, next: NextFunction) => {
    fn(req, res).catch(next);
  };

export function errorBody(err: unknown): { status: number; body: { error: { code: string; message: string; details?: unknown } } } {
  if (err instanceof HttpError)
    return { status: err.status, body: { error: { code: err.code, message: err.message, ...(err.details !== undefined && { details: err.details }) } } };
  if (typeof err === "object" && err !== null && (err as { type?: string }).type === "entity.too.large")
    return { status: 413, body: { error: { code: "too_large", message: "El archivo es demasiado pesado" } } };
  if (err instanceof ZodError)
    return { status: 422, body: { error: { code: "validation", message: "Datos inválidos", details: err.flatten().fieldErrors } } };
  return { status: 500, body: { error: { code: "internal", message: "Error interno" } } };
}
