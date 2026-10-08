import { createHash } from "node:crypto";
import { query } from "@/server/db/pool";

interface RateLimitOptions {
  scope: string;
  key: string;
  maxAttempts: number;
  windowSeconds: number;
}

export async function checkRateLimit({ scope, key, maxAttempts, windowSeconds }: RateLimitOptions) {
  const keyHash = createHash("sha256").update(key).digest("hex");
  const result = await query<{ attempts: number; retry_after_seconds: number }>(
    `insert into auth_rate_limits (scope, key_hash, attempts, expires_at)
     values ($1, $2, 1, now() + ($3::integer * interval '1 second'))
     on conflict (scope, key_hash) do update
     set attempts = case
           when auth_rate_limits.expires_at <= now() then 1
           else auth_rate_limits.attempts + 1
         end,
         expires_at = case
           when auth_rate_limits.expires_at <= now() then now() + ($3::integer * interval '1 second')
           else auth_rate_limits.expires_at
         end,
         updated_at = now()
     returning attempts,
       greatest(0, ceil(extract(epoch from (expires_at - now()))))::integer as retry_after_seconds`,
    [scope, keyHash, windowSeconds],
  );
  await query("delete from auth_rate_limits where expires_at < now() - interval '1 day'").catch(() => undefined);

  const row = result.rows[0];
  const attempts = row?.attempts ?? maxAttempts + 1;
  return {
    allowed: attempts <= maxAttempts,
    retryAfterSeconds: row?.retry_after_seconds ?? windowSeconds,
  };
}

export async function clearRateLimit(scope: string, key: string) {
  const keyHash = createHash("sha256").update(key).digest("hex");
  await query("delete from auth_rate_limits where scope = $1 and key_hash = $2", [scope, keyHash]).catch(() => undefined);
}

export function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return request.headers.get("cf-connecting-ip") ?? request.headers.get("x-real-ip") ?? forwarded ?? "unknown";
}
