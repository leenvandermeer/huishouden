import { requireEnvironment } from "./environment";
import { hash } from "@node-rs/argon2";
import { Pool } from "pg";

const databaseUrl = requireEnvironment("DATABASE_URL");

async function main() {
  const [, , email, name = email, role = "owner"] = process.argv;
  const password = requireEnvironment("USER_PASSWORD");
  if (!email) {
    throw new Error("Gebruik: npm run user:create -- email naam [owner|admin|readonly]; stel USER_PASSWORD in via de omgeving");
  }

  if (password.length < 12) throw new Error("Wachtwoord moet minimaal 12 tekens hebben.");
  if (!["owner", "admin", "readonly"].includes(role)) throw new Error("Ongeldige gebruikersrol.");
  const pool = new Pool({ connectionString: databaseUrl });
  const passwordHash = await hash(password);
  try {
    await pool.query(
      `insert into users (id, name, email, password_hash, role)
       values ($1, $2, $3, $4, $5)
       on conflict (email) do update
       set name = excluded.name, password_hash = excluded.password_hash, role = excluded.role, disabled_at = null`,
      [`usr_${email.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")}`, name, email, passwordHash, role],
    );
    console.log(`User ready: ${email}`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
  