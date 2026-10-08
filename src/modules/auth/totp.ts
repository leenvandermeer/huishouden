import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const BASE32_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const TOTP_PERIOD_SECONDS = 30;
const TOTP_DIGITS = 6;
const ENCRYPTION_PREFIX = "totp:v1:";
const PENDING_PREFIX = "pending:v1:";
const PENDING_TTL_SECONDS = 5 * 60;
const BACKUP_CODE_COUNT = 5;
const BACKUP_CODE_BYTES = 9;

export const PENDING_2FA_COOKIE_NAME = "huishouden_pending_2fa";

function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_CHARS[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32_CHARS[(value << (5 - bits)) & 31];
  return output;
}

function base32Decode(value: string): Buffer {
  let bits = 0;
  let current = 0;
  const output: number[] = [];
  for (const char of value.toUpperCase().replace(/=+$/g, "")) {
    const index = BASE32_CHARS.indexOf(char);
    if (index < 0) continue;
    current = (current << 5) | index;
    bits += 5;
    if (bits >= 8) {
      output.push((current >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}

function encryptionKey(): Buffer | null {
  const hex = process.env.TOTP_ENCRYPTION_KEY ?? "";
  if (process.env.NODE_ENV === "production" && !hex) throw new Error("TOTP_ENCRYPTION_KEY ontbreekt in productie.");
  if (!/^[0-9a-f]{64}$/i.test(hex)) {
    if (process.env.NODE_ENV === "production") throw new Error("TOTP_ENCRYPTION_KEY moet 64 hex-tekens zijn in productie.");
    return null;
  }
  return Buffer.from(hex, "hex");
}

function pendingSecret(): string {
  const secret = process.env.TOTP_PENDING_SECRET ?? process.env.TOTP_ENCRYPTION_KEY ?? "";
  if (process.env.NODE_ENV === "production") {
    if (!secret) throw new Error("TOTP_PENDING_SECRET of TOTP_ENCRYPTION_KEY ontbreekt in productie.");
    if (secret.length < 32) throw new Error("TOTP_PENDING_SECRET moet minimaal 32 tekens zijn in productie.");
  }
  return secret || "huishouden-local-pending-secret-change-in-production";
}

function hotp(key: Buffer, counter: bigint): string {
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(counter);
  const hash = createHmac("sha1", key).update(message).digest();
  const offset = hash[hash.length - 1] & 0x0f;
  const code = ((hash[offset] & 0x7f) << 24) | ((hash[offset + 1] & 0xff) << 16) | ((hash[offset + 2] & 0xff) << 8) | (hash[offset + 3] & 0xff);
  return String(code % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, "0");
}

export function generateTotpToken(secret: string, now = Date.now()): string {
  return hotp(base32Decode(secret), BigInt(Math.floor(now / 1000 / TOTP_PERIOD_SECONDS)));
}

export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

export function buildTotpUri(secret: string, email: string): string {
  const issuer = encodeURIComponent(process.env.TOTP_ISSUER ?? "Vdmeer Huishouden");
  const label = encodeURIComponent(`Vdmeer Huishouden:${email}`);
  return `otpauth://totp/${label}?secret=${encodeURIComponent(secret)}&issuer=${issuer}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_PERIOD_SECONDS}`;
}

export function verifyTotpToken(secret: string, token: string, now = Date.now()): boolean {
  const code = token.replace(/\s/g, "");
  if (!/^\d{6}$/.test(code)) return false;
  const key = base32Decode(secret);
  const counter = BigInt(Math.floor(now / 1000 / TOTP_PERIOD_SECONDS));
  for (let delta = -1; delta <= 1; delta++) {
    if (hotp(key, counter + BigInt(delta)) === code) return true;
  }
  return false;
}

export function generateBackupCodes(): string[] {
  return Array.from({ length: BACKUP_CODE_COUNT }, () => randomBytes(BACKUP_CODE_BYTES).toString("hex").toUpperCase());
}

export function normalizeBackupCode(code: string): string {
  return code.replace(/[\s-]/g, "").toUpperCase();
}

export function hashBackupCode(code: string): string {
  return createHash("sha256").update(normalizeBackupCode(code)).digest("hex");
}

export function encryptTotpSecret(secret: string): string {
  const key = encryptionKey();
  if (!key) return `plain:${secret}`;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${ENCRYPTION_PREFIX}${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptTotpSecret(stored: string | null): string | null {
  if (!stored) return null;
  if (stored.startsWith("plain:")) return stored.slice(6);
  if (!stored.startsWith(ENCRYPTION_PREFIX)) return null;
  const key = encryptionKey();
  if (!key) return null;
  const [ivHex, authTagHex, encryptedHex] = stored.slice(ENCRYPTION_PREFIX.length).split(":");
  if (!ivHex || !authTagHex || !encryptedHex) return null;
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
    return Buffer.concat([decipher.update(Buffer.from(encryptedHex, "hex")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

export function createPendingTwoFactorToken(userId: string): string {
  const payload = Buffer.from(JSON.stringify({ userId, exp: Math.floor(Date.now() / 1000) + PENDING_TTL_SECONDS })).toString("base64url");
  const signature = createHmac("sha256", pendingSecret()).update(payload).digest("base64url");
  return `${PENDING_PREFIX}${payload}.${signature}`;
}

export function readPendingTwoFactorToken(token: string | undefined): { userId: string } | null {
  if (!token?.startsWith(PENDING_PREFIX)) return null;
  const [payload, signature] = token.slice(PENDING_PREFIX.length).split(".");
  if (!payload || !signature) return null;
  const expected = createHmac("sha256", pendingSecret()).update(payload).digest("base64url");
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { userId?: unknown; exp?: unknown };
    if (typeof parsed.userId !== "string" || typeof parsed.exp !== "number") return null;
    if (Date.now() / 1000 > parsed.exp) return null;
    return { userId: parsed.userId };
  } catch {
    return null;
  }
}

export { PENDING_TTL_SECONDS };
