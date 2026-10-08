import { appUrl } from "@/lib/http/redirect-url";
import { noStoreRedirect } from "@/lib/http/security";
import { checkRateLimit, getClientIp } from "@/modules/auth/rate-limit";
import { resetPasswordWithToken } from "@/modules/auth/service";

export async function POST(request: Request) {
  const formData = await request.formData();
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "");
  const resetLimit = await checkRateLimit({
    scope: "reset-confirm:ip",
    key: getClientIp(request),
    maxAttempts: 12,
    windowSeconds: 15 * 60,
  });

  if (!resetLimit.allowed) {
    const response = noStoreRedirect(appUrl("/wachtwoord-resetten?status=te-veel-pogingen", request));
    response.headers.set("Retry-After", String(resetLimit.retryAfterSeconds));
    return response;
  }

  if (!token || password.length < 12 || password !== passwordConfirm) {
    return noStoreRedirect(appUrl(`/wachtwoord-resetten?token=${encodeURIComponent(token)}&status=ongeldig`, request));
  }

  const changed = await resetPasswordWithToken(token, password).catch(() => false);
  if (!changed) {
    return noStoreRedirect(appUrl("/wachtwoord-resetten?status=verlopen", request));
  }

  return noStoreRedirect(appUrl("/inloggen?reset=gelukt", request));
}
