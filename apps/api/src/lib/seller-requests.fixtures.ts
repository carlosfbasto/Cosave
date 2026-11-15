import { randomUUID } from "node:crypto";

/**
 * Base en memoria SOLO para pruebas de lógica y rutas de solicitudes. Imita lo mínimo de Prisma.
 * NO simula concurrencia ni bloqueos: las transacciones se ejecutan una detrás de otra, así que esto
 * NO sirve como evidencia de que el candado funciona (eso lo comprueba seller-requests.integration.test.ts
 * contra PostgreSQL real).
 */
export interface Row {
  id: string;
  sellerId: string;
  kind: string;
  status: string;
  notes: string | null;
  agentId: string | null;
  createdAt: Date;
}

type Where = { sellerId?: string; kind?: string; status?: string | { in: string[] }; id?: string | { not: string } };

const matches = (r: Row, w: Where = {}): boolean =>
  (w.sellerId === undefined || r.sellerId === w.sellerId) &&
  (w.kind === undefined || r.kind === w.kind) &&
  (w.status === undefined || (typeof w.status === "string" ? r.status === w.status : w.status.in.includes(r.status))) &&
  (w.id === undefined || (typeof w.id === "string" ? r.id === w.id : r.id !== w.id.not));

/** Devuelve solo los campos pedidos en `select`, para detectar si una ruta expone datos internos. */
const pick = (r: Row, select?: Record<string, unknown>): Partial<Row> =>
  select ? (Object.fromEntries(Object.keys(select).filter((k) => select[k]).map((k) => [k, r[k as keyof Row]])) as Partial<Row>) : { ...r };

export function createFakeDb() {
  const rows: Row[] = [];
  const roles = new Map<string, string>();
  let tick = 0;
  const state = {
    /** Registro ordenado de lo que pasó (cerrojo, lecturas, escrituras) para comprobar el orden. */
    calls: [] as string[],
    /** Opciones con que se abrió cada transacción. */
    txOptions: [] as unknown[],
    /** Si se define, la siguiente transacción falla con este error. */
    failNextTransaction: undefined as unknown,
  };

  const sellerRequest = {
    async findFirst({ where, select }: { where?: Where; select?: Record<string, unknown> }) {
      state.calls.push("findFirst");
      const r = rows.find((x) => matches(x, where));
      return r ? pick(r, select) : null;
    },
    async findUnique({ where, select }: { where: { id: string }; select?: Record<string, unknown> }) {
      state.calls.push("findUnique");
      const r = rows.find((x) => x.id === where.id);
      return r ? pick(r, select) : null;
    },
    async create({ data, select }: { data: Partial<Row>; select?: Record<string, unknown> }) {
      state.calls.push("create");
      // `createdAt` crece un milisegundo por fila: el orden es determinista.
      const r = { id: randomUUID(), status: "open", notes: null, agentId: null, createdAt: new Date(Date.UTC(2026, 0, 1) + ++tick), ...data } as Row;
      rows.push(r);
      return pick(r, select);
    },
    async update({ where, data, select }: { where: { id: string }; data: Partial<Row>; select?: Record<string, unknown> }) {
      state.calls.push("update");
      const r = rows.find((x) => x.id === where.id)!;
      Object.assign(r, data);
      return pick(r, select);
    },
    async findMany({ where, orderBy, skip = 0, take, select }: { where?: Where; orderBy?: unknown; skip?: number; take?: number; select?: Record<string, unknown> }) {
      state.calls.push("findMany");
      void orderBy; // siempre `createdAt desc, id desc`
      const list = rows.filter((x) => matches(x, where)).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.id.localeCompare(a.id));
      return list.slice(skip, take === undefined ? undefined : skip + take).map((r) => pick(r, select));
    },
    async count({ where }: { where?: Where }) {
      return rows.filter((x) => matches(x, where)).length;
    },
  };

  /** Etiqueta de plantilla de `$executeRaw`: registra el candado y el `lock_timeout`. */
  const executeRaw = async (strings: TemplateStringsArray, ...values: unknown[]) => {
    const sql = strings.join("?");
    if (sql.includes("lock_timeout")) state.calls.push("lock_timeout");
    else if (sql.includes("pg_advisory_xact_lock")) state.calls.push(`lock:${String(values[0])}`);
    else state.calls.push(`sql:${sql}`);
    return 1;
  };

  const tx = { sellerRequest, $executeRaw: executeRaw };

  return {
    rows,
    roles,
    state,
    sellerRequest,
    $executeRaw: executeRaw,
    profile: {
      async upsert({ where }: { where: { id: string } }) {
        return { id: where.id, role: roles.get(where.id) ?? "buyer" };
      },
    },
    async $transaction<T>(fn: (t: typeof tx) => Promise<T>, options?: unknown): Promise<T> {
      state.txOptions.push(options);
      if (state.failNextTransaction !== undefined) {
        const err = state.failNextTransaction;
        state.failNextTransaction = undefined;
        throw err;
      }
      return fn(tx);
    },
    /** Inserta una solicitud directamente (para preparar escenarios, sin pasar por el servicio). */
    seed(partial: Partial<Row> & { sellerId: string; kind: string }): Row {
      const r: Row = { id: randomUUID(), status: "open", notes: null, agentId: null, createdAt: new Date(Date.UTC(2026, 0, 1) + ++tick), ...partial };
      rows.push(r);
      return r;
    },
  };
}

export type FakeDb = ReturnType<typeof createFakeDb>;
