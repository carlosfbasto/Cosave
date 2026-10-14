import type { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { createRemoteJWKSet, jwtVerify } from "jose";
import type { UserRole } from "@cosave/shared";
import { env } from "../lib/env.js";
import { HttpError } from "../lib/errors.js";
import { prisma } from "../lib/prisma.js";

export interface AuthUser {
  id: string;
  role: UserRole;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const jwks = env.SUPABASE_URL
  ? createRemoteJWKSet(new URL("/auth/v1/.well-known/jwks.json", env.SUPABASE_URL))
  : undefined;
const secret = env.SUPABASE_JWT_SECRET ? new TextEncoder().encode(env.SUPABASE_JWT_SECRET) : undefined;

/**
 * Valida el JWT de Supabase (Authorization: Bearer ...), crea el Profile en el
 * primer acceso y llena req.user. El rol sale de la BD (fuente de verdad), no del token.
 */
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
    if (!token) throw new HttpError(401, "unauthorized", "Falta el token");
    if (!jwks && !secret) throw new HttpError(500, "internal", "Auth no configurada");

    let payload;
    try {
      ({ payload } = await (jwks ? jwtVerify(token, jwks) : jwtVerify(token, secret!)));
    } catch {
      throw new HttpError(401, "unauthorized", "Token inválido");
    }

    const id = payload.sub;
    const email = typeof payload["email"] === "string" ? payload["email"] : undefined;
    if (!id || !email) throw new HttpError(401, "unauthorized", "Token inválido");

    const meta = (payload["user_metadata"] ?? {}) as { full_name?: unknown };
    const fullName = typeof meta.full_name === "string" && meta.full_name.trim() ? meta.full_name.trim() : email.split("@")[0]!;

    // Si otro perfil ya usa este correo (p. ej. una cuenta borrada en Supabase cuyo perfil quedó huérfano),
    // el correo único choca: se responde 409 claro en vez de un 500 genérico.
    const profile = await prisma.profile
      .upsert({
        where: { id },
        update: {},
        create: { id, email, fullName },
        select: { id: true, role: true },
      })
      .catch((err: unknown) => {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
          throw new HttpError(409, "account_conflict", "Ya existe un perfil asociado a este correo. Contacta a soporte.");
        }
        throw err;
      });
    req.user = { id: profile.id, role: profile.role };
    next();
  } catch (err) {
    next(err);
  }
}

/** Exige que req.user tenga alguno de los roles dados. Usar después de requireAuth. */
export const requireRole =
  (...roles: UserRole[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      next(new HttpError(403, "forbidden", "No tienes permiso"));
      return;
    }
    next();
  };
