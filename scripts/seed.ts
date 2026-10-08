import { hash } from "@node-rs/argon2";
import { Pool } from "pg";
import { defaultCategories } from "../src/modules/finance/default-categories";
import { marketCategories, marketMappingRules } from "../src/modules/finance/market-mapping";

const databaseUrl = process.env.DATABASE_URL || "postgres://huishouden:huishouden@localhost:5434/huishouden";
const adminEmail = process.env.SEED_ADMIN_EMAIL || "leen@vdmeer.local";
const adminPassword = process.env.SEED_ADMIN_PASSWORD || "huishoudboekje-dev";
const forceAdminPassword = process.env.SEED_ADMIN_PASSWORD_FORCE === "true";
const seedCategories = [...defaultCategories, ...marketCategories];
const seedRules = marketMappingRules;

async function main() {
  const pool = new Pool({ connectionString: databaseUrl });
  const client = await pool.connect();
  try {
    await client.query("begin");

    for (const category of seedCategories) {
      await client.query(
        `insert into categories (id, name, parent, kind)
         values ($1, $2, $3, $4)
         on conflict (id) do update set name = excluded.name, parent = excluded.parent, kind = excluded.kind`,
        [category.id, category.name, category.parent ?? null, category.kind],
      );
    }

    for (const rule of seedRules) {
      await client.query(
        `insert into categorization_rules (id, pattern, category_id, kind, active)
         values ($1, $2, $3, $4, true)
         on conflict (id) do update set pattern = excluded.pattern, category_id = excluded.category_id, kind = excluded.kind, active = true`,
        [rule.id, rule.pattern, rule.categoryId, rule.kind],
      );
    }

    const existingUser = await client.query<{ id: string }>("select id from users where lower(email) = lower($1)", [adminEmail]);
    if (existingUser.rows.length === 0 || forceAdminPassword) {
      const passwordHash = await hash(adminPassword);
      await client.query(
        `insert into users (id, name, email, password_hash, role)
         values ('usr_owner', 'Leen van der Meer', $1, $2, 'owner')
         on conflict (email) do update set name = excluded.name, password_hash = excluded.password_hash, role = excluded.role, disabled_at = null`,
        [adminEmail, passwordHash],
      );
    } else {
      await client.query(
        `update users
         set name = 'Leen van der Meer',
             role = 'owner',
             disabled_at = null
         where lower(email) = lower($1)`,
        [adminEmail],
      );
    }

    await client.query("commit");
    console.log(`Seeded owner user: ${adminEmail}`);
    console.log(existingUser.rows.length === 0 ? "Seeded owner password for new user." : forceAdminPassword ? "Forced owner password reset from SEED_ADMIN_PASSWORD." : "Kept existing owner password.");
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
