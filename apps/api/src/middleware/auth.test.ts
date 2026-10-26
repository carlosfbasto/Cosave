import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { SignJWT } from "jose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../app.js";

// Las rutas protegidas deben rechazar sin llegar a la BD (en pruebas, DATABASE_URL apunta a un puerto cerrado).
let server: Server;
let base: string;

beforeAll(async () => {
  server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", () => resolve()));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

const call = (path: string, init: RequestInit = {}) => fetch(`${base}${path}`, init);
const errorCode = async (res: Response) => ((await res.json()) as { error: { code: string } }).error.code;
const bearer = (token: string) => ({ headers: { Authorization: `Bearer ${token}` } });

/** JWT firmado con otro secreto: bien formado, firma falsa. */
const forged = () =>
  new SignJWT({ email: "intruso@example.com", role: "authenticated" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject("00000000-0000-0000-0000-000000000000")
    .setExpirationTime("1h")
    .sign(new TextEncoder().encode("otro-secreto"));

const protectedRoutes: [string, string][] = [
  ["GET", "/api/v1/me"],
  ["GET", "/api/v1/favorites"],
  ["GET", "/api/v1/inquiries"],
  ["GET", "/api/v1/saved-searches"],
  ["GET", "/api/v1/notifications"],
  ["POST", "/api/v1/notifications/read-all"],
  ["GET", "/api/v1/me/properties"],
  ["GET", "/api/v1/admin/users"],
  ["GET", "/api/v1/admin/audit"],
  ["PATCH", "/api/v1/admin/users/00000000-0000-0000-0000-000000000000/role"],
  ["POST", "/api/v1/admin/properties/00000000-0000-0000-0000-000000000000/review"],
];

describe("acceso al api", () => {
  it("/health responde sin sesión", async () => {
    const res = await call("/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });

  it("una ruta inexistente responde 404 con el formato de error", async () => {
    const res = await call("/api/v1/no-existe");
    expect(res.status).toBe(404);
    expect(await errorCode(res)).toBe("not_found");
  });

  it.each(protectedRoutes)("%s %s sin token → 401", async (method, path) => {
    const res = await call(path, { method });
    expect(res.status).toBe(401);
    expect(await errorCode(res)).toBe("unauthorized");
  });

  it.each(protectedRoutes)("%s %s con token mal formado → 401", async (method, path) => {
    const res = await call(path, { method, ...bearer("no-es-un-jwt") });
    expect(res.status).toBe(401);
  });

  it.each(protectedRoutes)("%s %s con firma falsa → 401", async (method, path) => {
    const res = await call(path, { method, ...bearer(await forged()) });
    expect(res.status).toBe(401);
  });
});
