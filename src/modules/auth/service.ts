import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { hash, verify } from "@node-rs/argon2";
import { query } from "@/server/db/pool";
import {
  PENDING_2FA_COOKIE_NAME,
  PENDING_TTL_SECONDS,
  createPendingTwoFactorToken,
  decryptTotpSecret,
  encryptTotpSecret,
  hashBackupCode,
  readPendingTwoFactorToken,
  verifyTotpToken,
} from "./totp";

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "readonly";
  twoFactorEnabled?: boolean;
}

export interface ManagedUser extends AuthenticatedUser {
  disabledAt?: string;
  createdAt: string;
}

const sessionCookie = "huishouden_session";
const sessionHours = 1;
const resetTokenHours = 1;

export type LoginResult =
  | { status: "success"; user: AuthenticatedUser }
  | { status: "two_factor_required" }
  | { status: "invalid" };

export async function login(email: string, password: string): Promise<LoginResult> {
  const userResult = await query<UserRow>(
    "select id, name, email, password_hash, role, two_factor_enabled from users where lower(email) = lower($1) and disabled_at is null",
    [email],
  );
  const user = userResult.rows[0];
  if (!user) return { status: "invalid" };

  const valid = await verify(user.password_hash, password);
  if (!valid) return { status: "invalid" };

  if (user.two_factor_enabled) {
    await setPendingTwoFactor(user.id);
    return { status: "two_factor_required" };
  }

  const sessionUser = await createSession(user.id);
  return sessionUser ? { status: "success", user: sessionUser } : { status: "invalid" };
}

export async function completeTwoFactorLogin(token: string | undefined, code: string): Promise<AuthenticatedUser | undefined> {
  const pending = readPendingTwoFactorToken(token);
  if (!pending) return undefined;

  const valid = await verifyTwoFactorToken(pending.userId, code);
  if (!valid) return undefined;

  await clearPendingTwoFactor();
  return createSession(pending.userId);
}

async function createSession(userId: string): Promise<AuthenticatedUser | undefined> {
  const userResult = await query<UserRow>(
    "select id, name, email, password_hash, role, two_factor_enabled from users where id = $1 and disabled_at is null",
    [userId],
  );
  const user = userResult.rows[0];
  if (!user) return undefined;

  const sessionId = `ses_${randomBytes(32).toString("hex")}`;
  const expiresAt = new Date(Date.now() + sessionHours * 60 * 60 * 1000);
  await query("insert into sessions (id, user_id, expires_at) values ($1, $2, $3)", [sessionId, user.id, expiresAt]);

  (await cookies()).set(sessionCookie, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });

  return mapUser(user);
}

async function setPendingTwoFactor(userId: string) {
  const token = createPendingTwoFactorToken(userId);
  const expiresAt = new Date(Date.now() + PENDING_TTL_SECONDS * 1000);
  (await cookies()).set(PENDING_2FA_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearPendingTwoFactor() {
  (await cookies()).delete(PENDING_2FA_COOKIE_NAME);
}

export async function logout() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(sessionCookie)?.value;
  if (sessionId) {
    await query("delete from sessions where id = $1", [sessionId]).catch(() => undefined);
  }
  cookieStore.delete(sessionCookie);
  cookieStore.delete(PENDING_2FA_COOKIE_NAME);
}

export async function createPasswordReset(email: string) {
  const userResult = await query<Pick<UserRow, "id" | "email">>(
    "select id, email from users where lower(email) = lower($1) and disabled_at is null",
    [email],
  );
  const user = userResult.rows[0];
  if (!user) return undefined;

  const token = `rst_${randomBytes(32).toString("hex")}`;
  const tokenHash = sha256(token);
  const tokenId = `prt_${randomBytes(16).toString("hex")}`;
  const expiresAt = new Date(Date.now() + resetTokenHours * 60 * 60 * 1000);

  await query("update password_reset_tokens set used_at = now() where user_id = $1 and used_at is null", [user.id]);
  await query(
    `insert into password_reset_tokens (id, user_id, token_hash, expires_at)
     values ($1, $2, $3, $4)`,
    [tokenId, user.id, tokenHash, expiresAt],
  );

  return { token, email: user.email, expiresAt };
}

export async function resetPasswordWithToken(token: string, password: string) {
  const tokenHash = sha256(token);
  const resetResult = await query<{ id: string; user_id: string }>(
    `select id, user_id
     from password_reset_tokens
     where token_hash = $1
       and used_at is null
       and expires_at > now()`,
    [tokenHash],
  );
  const reset = resetResult.rows[0];
  if (!reset) return false;

  const passwordHash = await hash(password);
  await query("update users set password_hash = $1 where id = $2", [passwordHash, reset.user_id]);
  const verifyResult = await query<Pick<UserRow, "password_hash">>("select password_hash from users where id = $1", [reset.user_id]);
  const verified = verifyResult.rows[0] ? await verify(verifyResult.rows[0].password_hash, password) : false;
  if (!verified) return false;
  await query("update password_reset_tokens set used_at = now() where id = $1", [reset.id]);
  await query("delete from sessions where user_id = $1", [reset.user_id]);
  return true;
}

export async function changeOwnPassword(userId: string, currentPassword: string, newPassword: string) {
  const userResult = await query<UserRow>("select id, name, email, password_hash, role from users where id = $1 and disabled_at is null", [userId]);
  const user = userResult.rows[0];
  if (!user) return false;

  const valid = await verify(user.password_hash, currentPassword);
  if (!valid) return false;

  const passwordHash = await hash(newPassword);
  await query("update users set password_hash = $1 where id = $2", [passwordHash, userId]);
  await query("delete from sessions where user_id = $1 and id <> $2", [userId, (await cookies()).get(sessionCookie)?.value ?? ""]);
  return true;
}

export async function listManagedUsers(): Promise<ManagedUser[]> {
  const result = await query<ManagedUserRow>(
    "select id, name, email, role, created_at, disabled_at from users order by disabled_at nulls first, name",
  );
  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    disabledAt: row.disabled_at ? (row.disabled_at instanceof Date ? row.disabled_at.toISOString() : String(row.disabled_at)) : undefined,
  }));
}

export async function createManagedUser(input: { name: string; email: string; password: string; role: AuthenticatedUser["role"] }) {
  const passwordHash = await hash(input.password);
  const id = `usr_${sha256(input.email.toLowerCase()).slice(0, 24)}`;
  await query(
    `insert into users (id, name, email, password_hash, role)
     values ($1, $2, $3, $4, $5)
     on conflict (email) do update
     set name = excluded.name,
         password_hash = excluded.password_hash,
         role = excluded.role,
         disabled_at = null`,
    [id, input.name, input.email, passwordHash, input.role],
  );
  return id;
}

export async function disableManagedUser(userId: string, actorUserId: string) {
  if (userId === actorUserId) return false;
  const result = await query("update users set disabled_at = now() where id = $1 and disabled_at is null", [userId]);
  await query("delete from sessions where user_id = $1", [userId]);
  return (result.rowCount ?? 0) > 0;
}

export async function getCurrentUser(): Promise<AuthenticatedUser | undefined> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(sessionCookie)?.value;
  if (!sessionId) return undefined;

  const result = await query<UserRow & { expires_at: Date | string }>(
    `select u.id, u.name, u.email, u.password_hash, u.role, u.two_factor_enabled, s.expires_at
     from sessions s
     join users u on u.id = s.user_id
     where s.id = $1
       and s.expires_at > now()
       and s.created_at > now() - ($2::integer * interval '1 hour')
       and u.disabled_at is null`,
    [sessionId, sessionHours],
  ).catch(() => undefined);

  const user = result?.rows[0];
  if (!user) {
    await query("delete from sessions where id = $1", [sessionId]).catch(() => undefined);
    return undefined;
  }

  await query("delete from sessions where expires_at < now() or created_at <= now() - ($1::integer * interval '1 hour')", [sessionHours]).catch(() => undefined);
  return mapUser(user);
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/inloggen");
  return user;
}

export async function requireMutableUser() {
  const user = await requireUser();
  if (user.role === "readonly") {
    throw new Error("Alleen eigenaar of beheerder mag wijzigingen opslaan.");
  }
  return user;
}

export async function requireOwner() {
  const user = await requireUser();
  if (user.role !== "owner") {
    throw new Error("Alleen eigenaar mag deze actie uitvoeren.");
  }
  return user;
}

interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: AuthenticatedUser["role"];
  two_factor_enabled?: boolean;
  totp_secret_enc?: string | null;
}

interface ManagedUserRow {
  id: string;
  name: string;
  email: string;
  role: AuthenticatedUser["role"];
  created_at: Date | string;
  disabled_at?: Date | string;
}

function mapUser(row: UserRow): AuthenticatedUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    twoFactorEnabled: row.two_factor_enabled,
  };
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export async function getTwoFactorStatus(userId: string): Promise<{ enabled: boolean; hasSecret: boolean }> {
  const result = await query<{ two_factor_enabled: boolean; totp_secret_enc: string | null }>(
    "select two_factor_enabled, totp_secret_enc from users where id = $1",
    [userId],
  );
  const row = result.rows[0];
  return { enabled: row?.two_factor_enabled ?? false, hasSecret: Boolean(row?.totp_secret_enc) };
}

export async function setupTwoFactor(userId: string, secret: string, backupCodes: string[]): Promise<void> {
  const enc = encryptTotpSecret(secret);
  const hashedCodes = backupCodes.map((code) => hashBackupCode(code));
  await query(
    "update users set totp_secret_enc = $1, backup_codes = $2 where id = $3",
    [enc, JSON.stringify(hashedCodes), userId],
  );
}

export async function enableTwoFactor(userId: string, token: string): Promise<boolean> {
  const result = await query<{ totp_secret_enc: string | null }>(
    "select totp_secret_enc from users where id = $1",
    [userId],
  );
  const row = result.rows[0];
  if (!row?.totp_secret_enc) return false;

  const secret = decryptTotpSecret(row.totp_secret_enc);
  if (!secret) return false;

  const valid = verifyTotpToken(secret, token);
  if (!valid) return false;

  await query("update users set two_factor_enabled = true where id = $1", [userId]);
  return true;
}

export async function disableTwoFactor(userId: string): Promise<void> {
  await query(
    "update users set two_factor_enabled = false, totp_secret_enc = null, backup_codes = null where id = $1",
    [userId],
  );
}

export async function verifyTwoFactorToken(userId: string, token: string): Promise<boolean> {
  const result = await query<{ totp_secret_enc: string | null; backup_codes: string | null }>(
    "select totp_secret_enc, backup_codes from users where id = $1 and two_factor_enabled = true",
    [userId],
  );
  const row = result.rows[0];
  if (!row) return false;

  if (row.totp_secret_enc) {
    const secret = decryptTotpSecret(row.totp_secret_enc);
    if (secret && verifyTotpToken(secret, token)) return true;
  }

  if (row.backup_codes) {
    const codes: string[] = JSON.parse(row.backup_codes);
    const hashed = hashBackupCode(token);
    const index = codes.indexOf(hashed);
    if (index >= 0) {
      codes.splice(index, 1);
      await query("update users set backup_codes = $1 where id = $2", [JSON.stringify(codes), userId]);
      return true;
    }
  }

  return false;
}
