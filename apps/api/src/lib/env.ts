import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(3300),
  WEB_URL: z.string().url().default("http://localhost:5300"),
  DATABASE_URL: z.string().min(1),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_JWT_SECRET: z.string().min(1).optional(),
  /// Solo en el servidor: sube y borra fotos en Supabase Storage. Nunca va al web.
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  /// Si es true (por defecto), una publicación nueva espera la aprobación de un admin.
  PUBLISH_REQUIRES_APPROVAL: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
});

// Una variable vacía (VAR=) cuenta como no definida.
const raw = Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== ""));
const parsed = envSchema.safeParse(raw);
if (!parsed.success) {
  console.error("Variables de entorno inválidas:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
