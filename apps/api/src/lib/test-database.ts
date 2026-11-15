/**
 * Guarda de la base de PRUEBAS. La usan `scripts/migrate-test-db.ts` (antes de migrar) y las pruebas de integración
 * (antes de escribir). Su único trabajo es negarse a tocar cualquier base que no sea local y de pruebas.
 * Ningún mensaje de error incluye la URL ni la contraseña.
 */

const LOCAL_HOSTS = ["localhost", "127.0.0.1", "::1"];
const LOOPBACK = (address: string) => address === "socket" || address === "::1" || address.startsWith("127.");

export interface TestTarget {
  host: string;
  port: string;
  database: string;
}

/** Devuelve host, puerto y base de la URL, o lanza si no es una base local de pruebas. */
export function parseTestTarget(raw: string): TestTarget {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    // Sin adjuntar la URL ni el error original: podrían traer la contraseña.
    throw new Error("TEST_DATABASE_URL no es una URL válida.");
  }
  if (u.protocol !== "postgresql:" && u.protocol !== "postgres:") throw new Error("TEST_DATABASE_URL debe empezar con postgresql://");
  const host = u.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!LOCAL_HOSTS.includes(host)) throw new Error(`TEST_DATABASE_URL no es local (host «${host}»): no se escribe.`);
  // Un parámetro `host=` puede redirigir la conexión a otro servidor aunque el host de la URL parezca local.
  for (const key of u.searchParams.keys()) {
    if (["host", "hostaddr", "service", "options"].includes(key.toLowerCase())) throw new Error(`TEST_DATABASE_URL no puede llevar el parámetro «${key}».`);
  }
  const database = decodeURIComponent(u.pathname.slice(1));
  if (!/test/i.test(database)) throw new Error(`La base «${database}» no parece de pruebas (su nombre debe contener «test»): no se escribe.`);
  return { host, port: u.port || "5432", database };
}

/** Valida y devuelve la misma URL, sin cambios. */
export function assertSafeTestDatabase(raw: string): string {
  parseTestTarget(raw);
  return raw;
}

/** La misma URL con el tamaño de pool indicado (las pruebas de concurrencia necesitan varias conexiones). */
export function withPool(raw: string, connections: number): string {
  const u = new URL(raw);
  u.searchParams.set("connection_limit", String(connections));
  return u.toString();
}

/** «host:puerto/base», sin usuario ni contraseña, para mostrar. */
export function describeTarget(raw: string): string {
  const u = new URL(raw);
  return `${u.hostname.replace(/^\[|\]$/g, "")}:${u.port || "5432"}/${decodeURIComponent(u.pathname.slice(1))}`;
}

const canonicalHost = (h: string) => (["localhost", "127.0.0.1", "::1"].includes(h.toLowerCase().replace(/^\[|\]$/g, "")) ? "local" : h.toLowerCase());

/** ¿Las dos URL apuntan al mismo servidor y base? (localhost, 127.0.0.1 y ::1 cuentan como el mismo servidor). Nunca lanza. */
export function sameTarget(a: string, b: string): boolean {
  try {
    const [x, y] = [new URL(a), new URL(b)];
    return (
      canonicalHost(x.hostname) === canonicalHost(y.hostname) &&
      (x.port || "5432") === (y.port || "5432") &&
      decodeURIComponent(x.pathname) === decodeURIComponent(y.pathname)
    );
  } catch {
    return false;
  }
}

export interface ServerInfo {
  database: string;
  /** IP del servidor vista por el propio PostgreSQL, o `socket` si la conexión es por socket local. */
  address: string;
  versionNum: number;
  /** Tablas de `public` que no son `_prisma_migrations`. */
  foreignTables: number;
  hasMigrationsTable: boolean;
}

export interface RawQuerier {
  $queryRaw<T = unknown>(query: TemplateStringsArray, ...values: any[]): PromiseLike<T>;
}

/** Pregunta al propio servidor a qué base y a qué máquina se conectó. */
export async function inspectServer(db: RawQuerier): Promise<ServerInfo> {
  const [row] = await db.$queryRaw<ServerInfo[]>`
    SELECT current_database() AS "database",
           coalesce(host(inet_server_addr()), 'socket') AS "address",
           current_setting('server_version_num')::int AS "versionNum",
           (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name <> '_prisma_migrations')::int AS "foreignTables",
           EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '_prisma_migrations') AS "hasMigrationsTable"`;
  return row!;
}

/** PostgreSQL mínimo aceptado: 15. El proyecto corre en Supabase con 17. */
export const MIN_PG_VERSION_NUM = 150000;

/**
 * Comprueba lo que dijo el servidor. `migrate`: además exige que la base esté vacía o ya la hayan creado estas migraciones
 * (nunca migrar una base ajena con tablas propias). `tests`: exige que las migraciones ya estén aplicadas.
 */
export function assertLocalTestServer(info: ServerInfo, mode: "migrate" | "tests"): void {
  if (!/test/i.test(info.database)) throw new Error(`El servidor respondió con la base «${info.database}», que no parece de pruebas.`);
  if (!LOOPBACK(info.address)) throw new Error(`El servidor está en ${info.address}, que no es esta máquina.`);
  if (info.versionNum < MIN_PG_VERSION_NUM) throw new Error(`PostgreSQL ${Math.floor(info.versionNum / 10000)} es anterior al mínimo (15).`);
  if (mode === "migrate" && info.foreignTables > 0 && !info.hasMigrationsTable)
    throw new Error("La base ya tiene tablas que no creó Prisma: no se migra una base ajena. Usa una base nueva y vacía.");
  if (mode === "tests" && !info.hasMigrationsTable) throw new Error("Faltan las migraciones en la base de pruebas: ejecuta pnpm --filter @cosave/api db:deploy:test");
}

/** «17.11» a partir de `server_version_num` (170011). */
export const versionLabel = (num: number): string => `${Math.floor(num / 10000)}.${num % 10000}`;
