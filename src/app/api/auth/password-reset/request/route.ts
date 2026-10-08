import { appUrl } from "@/lib/http/redirect-url";
import { noStoreRedirect } from "@/lib/http/security";
import { checkRateLimit, getClientIp } from "@/modules/auth/rate-limit";
import { createPasswordReset } from "@/modules/auth/service";

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim();
  const ip = getClientIp(request);
  const [ipLimit, emailLimit] = await Promise.all([
    checkRateLimit({ scope: "reset-request:ip", key: ip, maxAttempts: 10, windowSeconds: 60 * 60 }),
    checkRateLimit({ scope: "reset-request:email", key: email.toLowerCase(), maxAttempts: 3, windowSeconds: 60 * 60 }),
  ]);

  if (!ipLimit.allowed || !emailLimit.allowed) {
    const response = noStoreRedirect(appUrl("/wachtwoord-vergeten?status=te-veel-pogingen", request));
    response.headers.set("Retry-After", String(Math.max(ipLimit.retryAfterSeconds, emailLimit.retryAfterSeconds)));
    return response;
  }

  if (email) {
    await createPasswordReset(email).catch(() => undefined);
  }
  return noStoreRedirect(appUrl("/wachtwoord-vergeten?status=verstuurd", request));
}
