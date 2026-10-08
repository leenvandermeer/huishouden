import { Pool, type QueryResultRow } from "pg";

const defaultDatabaseUrl = "postgres://huishouden:huishouden@localhost:5434/huishouden";

declare global {
  var huishoudenPool: Pool | undefined;
}

export function getDatabaseUrl() {
  return process.env.DATABASE_URL || defaultDatabaseUrl;
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
