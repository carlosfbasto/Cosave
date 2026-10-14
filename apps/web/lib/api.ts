import type { UserRole } from "@cosave/shared";
import { getSupabase } from "./supabase";

export interface Profile {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  city: string | null;
  role: UserRole;
  createdAt?: string;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

/** Llama al api y devuelve el cuerpo completo `{ data, meta }`, adjuntando el JWT si hay sesión. */
export async function apiRaw<T>(path: string, init: RequestInit = {}): Promise<T> {
  // Las rutas públicas funcionan sin sesión (o sin Supabase configurado).
  const token = await getSupabase()
    .auth.getSession()
    .then(({ data }) => data.session?.access_token)
    .catch(() => undefined);
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3300"}/api/v1${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...init.headers,
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, body?.error?.message ?? "Error en la solicitud", body?.error?.code, body?.error?.details);
  return body as T;
}

/** Como apiRaw, pero devuelve solo `data` (recursos individuales). */
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  return (await apiRaw<{ data: T }>(path, init)).data;
}
