import { createClient } from "@supabase/supabase-js";
import { env } from "./env.js";
import { HttpError } from "./errors.js";

const BUCKET = "property-images";

const client =
  env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
    : undefined;

function bucket() {
  if (!client) throw new HttpError(503, "storage_unavailable", "El almacenamiento de fotos no está configurado");
  return client.storage.from(BUCKET);
}

export async function uploadImage(path: string, bytes: Buffer, contentType: string) {
  const { error } = await bucket().upload(path, bytes, { contentType, upsert: false });
  if (error) throw new HttpError(502, "storage_error", "No se pudo guardar la foto, intenta de nuevo");
}

/** Borra el archivo; si falla no se interrumpe (queda huérfano, no afecta al usuario). */
export async function removeImage(path: string) {
  if (path.startsWith("/") || path.startsWith("http")) return; // fotos de ejemplo estáticas
  await bucket().remove([path]).catch(() => undefined);
}

/** URL pública de una foto: las de ejemplo ya vienen como ruta del web. */
export function imageUrl(path: string): string {
  if (path.startsWith("/") || path.startsWith("http")) return path;
  return `${env.SUPABASE_URL ?? ""}/storage/v1/object/public/${BUCKET}/${path}`;
}
