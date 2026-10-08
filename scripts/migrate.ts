import { requireEnvironment } from "./environment";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Pool } from "pg";

const databaseUrl = requireEnvironment("DATABASE_URL");
const migrationsDir = join(process.cwd(), "infra", "sql", "migrations");

async function main() {
  const pool = new Pool({ connectionString: databaseUrl });
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query("create table if not exists schema_migrations (filename text primary key, applied_at timestamptz not null default now())");
    const applied = await client.query<{ filename: string }>("select filename from schema_migrations");
    const appliedNames = new Set(applied.rows.map((row) => row.filename));
    const files = readdirSync(migrationsDir).filter((file) => file.endsWith(".sql")).sort();

    for (const file of files) {
      if (appliedNames.has(file)) continue;
      const sql = readFileSync(join(migrationsDir, file), "utf8");
      await client.query(sql);
      await client.query("insert into schema_migrations (filename) values ($1) on conflict do nothing", [file]);
      console.log(`Applied ${file}`);
    }
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
