import { Prisma } from "@prisma/client";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { lockSellerRequest } from "./seller-requests.js";

/**
 * Valida en un PostgreSQL REAL (PGlite: PostgreSQL en WASM, un solo usuario) el SQL que usa el candado:
 * que sea válido, que tome un candado de aviso, que `lock_timeout` quede fijado solo dentro de la transacción
 * y que el candado se suelte al terminarla. Ejecuta el texto SQL que genera `lockSellerRequest`, no una copia.
 *
 * LÍMITE: PGlite solo tiene una conexión, así que NO puede mostrar a dos transacciones compitiendo ni el
 * vencimiento de `lock_timeout`. Eso lo cubre seller-requests.integration.test.ts (necesita TEST_DATABASE_URL).
 */
let db: PGlite;

beforeAll(async () => {
  db = await PGlite.create();
});
afterAll(async () => {
  await db.close();
});

type Query = { query: (text: string, values?: unknown[]) => Promise<{ rows: any[] }> };

/** Adapta una transacción de PGlite a lo que usa `lockSellerRequest` (`tx.$executeRaw` como etiqueta de plantilla). */
const asPrismaTx = (t: Query) =>
  ({
    $executeRaw: async (strings: TemplateStringsArray, ...values: unknown[]) => {
      const { text, values: params } = Prisma.sql(strings, ...values);
      await t.query(text, params);
      return 1;
    },
  }) as unknown as Prisma.TransactionClient;

const advisory = async (t: Query) => (await t.query(`SELECT classid, objid FROM pg_locks WHERE locktype = 'advisory' AND granted ORDER BY classid, objid`)).rows;
const A = "00000000-0000-4000-8000-00000000000a";
const B = "00000000-0000-4000-8000-00000000000b";

describe("SQL del candado en PostgreSQL real (PGlite)", () => {
  it("es válido: toma un candado de aviso y fija lock_timeout = 3s dentro de la transacción", async () => {
    await db.transaction(async (t) => {
      expect((await t.query<{ lock_timeout: string }>("SHOW lock_timeout")).rows[0]!.lock_timeout).toBe("0");
      expect(await advisory(t)).toHaveLength(0);
      await lockSellerRequest(asPrismaTx(t), A, "services");
      expect((await t.query<{ lock_timeout: string }>("SHOW lock_timeout")).rows[0]!.lock_timeout).toBe("3s");
      expect(await advisory(t)).toHaveLength(1);
    });
  });

  it("al terminar la transacción se libera el candado y lock_timeout vuelve a su valor (SET LOCAL)", async () => {
    await db.transaction(async (t) => lockSellerRequest(asPrismaTx(t), A, "services"));
    expect((await db.query<{ lock_timeout: string }>("SHOW lock_timeout")).rows[0]!.lock_timeout).toBe("0");
    expect((await db.query(`SELECT 1 FROM pg_locks WHERE locktype = 'advisory'`)).rows).toHaveLength(0);
  });

  it("también se libera si la transacción falla", async () => {
    await expect(
      db.transaction(async (t) => {
        await lockSellerRequest(asPrismaTx(t), A, "services");
        throw new Error("falla a propósito");
      }),
    ).rejects.toThrow("falla a propósito");
    expect((await db.query(`SELECT 1 FROM pg_locks WHERE locktype = 'advisory'`)).rows).toHaveLength(0);
  });

  it("la misma persona y tipo repiten la misma clave (reentrante); otra persona u otro tipo toman otra distinta", async () => {
    await db.transaction(async (t) => {
      const tx = asPrismaTx(t);
      await lockSellerRequest(tx, A, "services");
      await lockSellerRequest(tx, A, "services"); // misma clave: no cuenta como un segundo candado
      expect(await advisory(t)).toHaveLength(1);
      await lockSellerRequest(tx, B, "services");
      await lockSellerRequest(tx, A, "find_agent");
      expect(await advisory(t)).toHaveLength(3);
    });
  });
});
