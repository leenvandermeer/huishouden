import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getDatabaseUrl } from "../src/server/db/pool";

test("databaseverbinding vereist expliciete configuratie zonder ingebouwde inloggegevens", () => {
  const previous = process.env.DATABASE_URL;
  try {
    delete process.env.DATABASE_URL;
    assert.throws(() => getDatabaseUrl(), /DATABASE_URL ontbreekt/);
    process.env.DATABASE_URL = "  ";
    assert.throws(() => getDatabaseUrl(), /DATABASE_URL ontbreekt/);
    process.env.DATABASE_URL = "postgresql://localhost/test";
    assert.equal(getDatabaseUrl(), process.env.DATABASE_URL);
  } finally {
    if (previous === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previous;
  }
});

test("voorbeeldconfiguratie bevat geen vooraf ingevulde account- of databasegegevens", () => {
  for (const filename of [".env.example", "infra/.env.prod.example"]) {
    const content = readFileSync(filename, "utf8");
    for (const key of ["DATABASE_URL", "POSTGRES_USER", "POSTGRES_PASSWORD", "SEED_ADMIN_EMAIL", "SEED_ADMIN_PASSWORD"]) {
      assert.match(content, new RegExp(`^${key}=$`, "m"), `${filename}: ${key} moet leeg zijn`);
    }
  }
});

test("tweefactor-tokens vereisen een privé signing secret, ook lokaal", async () => {
  const { createPendingTwoFactorToken } = await import("../src/modules/auth/totp");
  const previousPending = process.env.TOTP_PENDING_SECRET;
  const previousEncryption = process.env.TOTP_ENCRYPTION_KEY;
  try {
    delete process.env.TOTP_PENDING_SECRET;
    delete process.env.TOTP_ENCRYPTION_KEY;
    assert.throws(() => createPendingTwoFactorToken("test-user"), /ontbreekt/);
    process.env.TOTP_PENDING_SECRET = "short";
    assert.throws(() => createPendingTwoFactorToken("test-user"), /minimaal 32/);
  } finally {
    if (previousPending === undefined) delete process.env.TOTP_PENDING_SECRET;
    else process.env.TOTP_PENDING_SECRET = previousPending;
    if (previousEncryption === undefined) delete process.env.TOTP_ENCRYPTION_KEY;
    else process.env.TOTP_ENCRYPTION_KEY = previousEncryption;
  }
});
