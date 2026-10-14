import { IMAGE_LIMITS } from "@cosave/shared";

type Mime = (typeof IMAGE_LIMITS.mimeTypes)[number];

/** Tipo real de la imagen según sus primeros bytes (no se confía en la extensión ni en el Content-Type). */
export function sniffImage(b: Buffer): Mime | null {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (b.length > 12 && b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  return null;
}

export const EXTENSION: Record<Mime, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
