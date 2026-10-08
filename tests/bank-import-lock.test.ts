import assert from "node:assert/strict";
import test from "node:test";
import type { Pool } from "pg";
import { withBankImportLock } from "../src/modules/finance/repository";

test("bankimport weigert gelijktijdige verwerking en geeft de verbinding vrij", async () => {
  const previous = globalThis.huishoudenPool;
  let released = false;
  let processed = false;
  globalThis.huishoudenPool = {
    connect: async () => ({
      query: async () => ({ rows: [{ locked: false }] }),
      release: () => { released = true; },
    }),
  } as unknown as Pool;
  try {
    const result = await withBankImportLock(async () => { processed = true; });
    assert.equal(result, undefined);
    assert.equal(processed, false);
    assert.equal(released, true);
  } finally {
    globalThis.huishoudenPool = previous;
  }
});

test("bankimport geeft de serverblokkering ook na een verwerkingsfout vrij", async () => {
  const previous = globalThis.huishoudenPool;
  const queries: string[] = [];
  let destroyed = false;
  globalThis.huishoudenPool = {
    connect: async () => ({
      query: async (sql: string) => {
        queries.push(sql);
        return { rows: [{ locked: true }] };
      },
      release: (destroy: boolean) => { destroyed = destroy; },
    }),
  } as unknown as Pool;
  try {
    await assert.rejects(withBankImportLock(async () => { throw new Error("verwerking mislukt"); }), /verwerking mislukt/);
    assert.equal(queries.length, 2);
    assert.match(queries[1], /pg_advisory_unlock/);
    assert.equal(destroyed, true);
  } finally {
    globalThis.huishoudenPool = previous;
  }
});
