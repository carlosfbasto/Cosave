// Uso: pnpm --filter @cosave/api db:make-admin correo@ejemplo.com
// El usuario debe haber iniciado sesión al menos una vez (para tener Profile).
import { prisma } from "../src/lib/prisma.js";

const email = process.argv[2];
if (!email) {
  console.error("Falta el correo: db:make-admin correo@ejemplo.com");
  process.exit(1);
}

const result = await prisma.profile.updateMany({ where: { email }, data: { role: "admin" } });
console.log(result.count ? `${email} ahora es admin` : `No existe un perfil con ${email}`);
await prisma.$disconnect();
process.exit(result.count ? 0 : 1);
