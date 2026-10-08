import { requireEnvironment } from "./environment";
import { hash, verify } from "@node-rs/argon2";
import { Pool } from "pg";

const databaseUrl = requireEnvironment("DATABASE_URL");
const passwordFromEnv = process.env.USER_PASSWORD;

async function main() {
  const [, , emailArg] = process.argv;
  const email = emailArg?.trim();
  const password = passwordFromEnv;
  if (!email || !password) {
    throw new Error("Stel USER_PASSWORD in via de omgeving; gebruik npm run user:set-password -- email");
  }
  if (password.length < 12) {
    throw new Error("Wachtwoord moet minimaal 12 tekens hebben.");
  }

  const pool = new Pool({ connectionString: databaseUrl });
  try {
    const userResult = await pool.query<{ id: string; email: string; password_hash: string }>(
      "select id, email, password_hash from users where lower(email) = lower($1) and disabled_at is null",
      [email],
    );
    const user = userResult.rows[0];
    if (!user) throw new Error(`Geen actieve gebruiker gevonden voor ${email}`);

    const passwordHash = await hash(password);
    await pool.query("update users set password_hash = $1 where id = $2", [passwordHash, user.id]);
    await pool.query("delete from sessions where user_id = $1", [user.id]);

    const verifyResult = await pool.query<{ password_hash: string }>("select password_hash from users where id = $1", [user.id]);
    const valid = await verify(verifyResult.rows[0]?.password_hash ?? "", password);
    if (!valid) throw new Error("Wachtwoord is opgeslagen, maar verificatie faalde.");

    console.log(`Wachtwoord gereset en geverifieerd voor ${user.email}. Sessies zijn ingetrokken.`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
