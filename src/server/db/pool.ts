import { Pool, type QueryResultRow } from "pg";

declare global {
  var huishoudenPool: Pool | undefined;
}

export function getDatabaseUrl() {
  const value = process.env.DATABASE_URL;
  if (!value?.trim()) throw new Error("DATABASE_URL ontbreekt in de omgevingsconfiguratie.");
  return value;
}

export function getPool() {
  if (!globalThis.huishoudenPool) {
    globalThis.huishoudenPool = new Pool({
      connectionString: getDatabaseUrl(),
    });
  }
  return globalThis.huishoudenPool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(text: string, values: unknown[] = []) {
  return getPool().query<T>(text, values);
}
