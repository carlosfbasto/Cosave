/**
 * Aplica las migraciones a la base de PRUEBAS, y solo a ella.
 *
 *   pnpm --filter @cosave/api db:deploy:test            (valida y migra)
 *   pnpm --filter @cosave/api db:deploy:test -- --check (solo valida; no migra)
 *
 * Por qué existe: `prisma migrate deploy` conecta con DIRECT_URL y carga solo `apps/api/.env` (tu Supabase) para
 * cualquier variable que NO esté definida en la terminal. Con una sola variable definida, la otra saldría del `.env`.
 * Este script lee SOLO `TEST_DATABASE_URL`, falla antes de migrar si el destino no es local y de pruebas (incluida una
 * pregunta al propio servidor), y entonces ejecuta Prisma con DATABASE_URL y DIRECT_URL forzadas a esa URL.
 * No imprime usuarios ni contraseñas.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { assertLocalTestServer, assertSafeTestDatabase, describeTarget, inspectServer, sameTarget, versionLabel } from "../src/lib/test-database.js";

const apiDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const checkOnly = process.argv.includes("--check");

function fail(message: string): never {
  console.error(`✖ ${message}`);
  console.error("  No se migró nada.");
  process.exit(1);
}

/** Valores de DATABASE_URL y DIRECT_URL del `.env` real, solo para comparar destinos (no se muestran). */
function realEnvTargets(): string[] {
  const file = join(apiDir, ".env");
  if (!existsSync(file)) return [];
  const found: string[] = [];
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = /^\s*(DATABASE_URL|DIRECT_URL)\s*=\s*(.*?)\s*$/.exec(line);
    if (m) found.push(m[2]!.replace(/^["']|["']$/g, ""));
  }
  return found;
}

const raw = process.env["TEST_DATABASE_URL"];
if (!raw) fail("Falta TEST_DATABASE_URL (la URL de la base local de pruebas). Este script nunca lee DATABASE_URL ni DIRECT_URL.");

try {
  assertSafeTestDatabase(raw);
} catch (e) {
  fail((e as Error).message);
}

if (realEnvTargets().some((t) => sameTarget(raw, t))) fail("TEST_DATABASE_URL apunta al mismo servidor y base que apps/api/.env.");

const client = new PrismaClient({ datasourceUrl: raw });
let info;
try {
  info = await inspectServer(client);
} catch (e) {
  // Nunca se imprime el mensaje crudo de Prisma: solo su código.
  const { code, errorCode } = e as { code?: string; errorCode?: string };
  fail(`No se pudo consultar el servidor${code ?? errorCode ? ` (código ${code ?? errorCode})` : ""}. ¿Está PostgreSQL encendido en ${describeTarget(raw)} y existe la base?`);
} finally {
  await client.$disconnect();
}
try {
  assertLocalTestServer(info, "migrate");
} catch (e) {
  fail((e as Error).message);
}
console.log(`✔ Destino verificado: ${describeTarget(raw)} · PostgreSQL ${versionLabel(info.versionNum)} · base «${info.database}» en ${info.address}`);
if (Math.floor(info.versionNum / 10000) !== 17) console.log("  Aviso: el proyecto corre en PostgreSQL 17; esta versión es distinta (compatible, pero conviene usar 17).");

if (checkOnly) {
  console.log("✔ --check: el destino es válido. No se migró nada.");
  process.exit(0);
}

const prismaCli = join(apiDir, "node_modules", "prisma", "build", "index.js");
if (!existsSync(prismaCli)) fail("No se encontró el CLI de Prisma del proyecto. Ejecuta pnpm install.");

// Las dos variables se fuerzan a la URL de pruebas: lo definido en el entorno gana sobre apps/api/.env (comprobado con Prisma 6.19.3).
const result = spawnSync(process.execPath, [prismaCli, "migrate", "deploy", "--schema", join(apiDir, "prisma", "schema.prisma")], {
  cwd: apiDir,
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: raw, DIRECT_URL: raw, PRISMA_HIDE_UPDATE_MESSAGE: "1" },
});
if (result.status !== 0) {
  console.error(`✖ prisma migrate deploy terminó con código ${result.status ?? "desconocido"}.`);
  process.exit(result.status ?? 1);
}
console.log(`✔ Migraciones aplicadas en ${describeTarget(raw)}.`);
