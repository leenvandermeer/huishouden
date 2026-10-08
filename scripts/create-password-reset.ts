import { requireEnvironment } from "./environment";
import { createHash, randomBytes } from "node:crypto";
import { Pool } from "pg";

const databaseUrl = requireEnvironment("DATABASE_URL");
const appUrl = process.env.APP_URL || "http://localhost:3001";

async function main() {
  const [, , email] = process.argv;
  if (!email) {
    throw new Error("Gebruik: npm run user:reset-link -- email");
  }

  const pool = new Pool({ connectionString: databaseUrl });
  try {
    const userResult = await pool.query<{ id: string; email: string }>(
      "select id, email from users where lower(email) = lower($1) and disabled_at is null",
      [email],
    );
    const user = userResult.rows[0];
    if (!user) {
      throw new Error(`Geen actieve gebruiker gevonden voor ${email}`);
    }

    const token = `rst_${randomBytes(32).toString("hex")}`;
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
    await pool.query(
      `insert into password_reset_tokens (id, user_id, token_hash, expires_at)
       values ($1, $2, $3, $4)`,
      [`prt_${randomBytes(16).toString("hex")}`, user.id, tokenHash, expiresAt],
    );

    const resetUrl = new URL("/wachtwoord-resetten", appUrl);
    resetUrl.searchParams.set("token", token);
    console.log(`Resetlink voor ${user.email}:`);
    console.log(resetUrl.toString());
    console.log(`Geldig tot: ${expiresAt.toISOString()}`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
