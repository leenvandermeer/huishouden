import { appUrl } from "@/lib/http/redirect-url";
import { noStoreRedirect } from "@/lib/http/security";
import { checkRateLimit, clearRateLimit, getClientIp } from "@/modules/auth/rate-limit";
import { PENDING_2FA_COOKIE_NAME, readPendingTwoFactorToken } from "@/modules/auth/totp";
import { clearPendingTwoFactor, completeTwoFactorLogin, login } from "@/modules/auth/service";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");
  if (intent === "restart") {
    await clearPendingTwoFactor();
    return noStoreRedirect(appUrl("/inloggen", request));
  }

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const twoFactorToken = String(formData.get("twoFactorToken") ?? "").trim();
  const ip = getClientIp(request);

  if (twoFactorToken) {
    const twoFactorLimit = await checkRateLimit({ scope: "login:2fa", key: ip, maxAttempts: 8, windowSeconds: 15 * 60 });
    if (!twoFactorLimit.allowed) {
      const response = noStoreRedirect(appUrl("/inloggen?stap=2fa&error=te-veel-pogingen", request));
      response.headers.set("Retry-After", String(twoFactorLimit.retryAfterSeconds));
      return response;
    }

    const pendingToken = (await cookies()).get(PENDING_2FA_COOKIE_NAME)?.value;
    if (!readPendingTwoFactorToken(pendingToken)) {
      await clearPendingTwoFactor();
      return noStoreRedirect(appUrl("/inloggen?error=2fa-verlopen", request));
    }

    const user = await completeTwoFactorLogin(pendingToken, twoFactorToken).catch(() => undefined);
    if (!user) {
      return noStoreRedirect(appUrl("/inloggen?stap=2fa&error=2fa-ongeldig", request));
    }

    await clearRateLimit("login:2fa", ip);
    return noStoreRedirect(appUrl("/", request));
  }

  const [ipLimit, accountLimit] = await Promise.all([
    checkRateLimit({ scope: "login:ip", key: ip, maxAttempts: 30, windowSeconds: 15 * 60 }),
    checkRateLimit({ scope: "login:account", key: `${ip}:${email.toLowerCase()}`, maxAttempts: 8, windowSeconds: 15 * 60 }),
  ]);

  if (!ipLimit.allowed || !accountLimit.allowed) {
    const response = noStoreRedirect(appUrl("/inloggen?error=te-veel-pogingen", request));
    response.headers.set("Retry-After", String(Math.max(ipLimit.retryAfterSeconds, accountLimit.retryAfterSeconds)));
    return response;
  }

  const result = await login(email, password).catch(() => ({ status: "invalid" as const }));
  if (result.status === "invalid") {
    await clearPendingTwoFactor();
    return noStoreRedirect(appUrl("/inloggen?error=ongeldig", request));
  }

  await Promise.all([
    clearRateLimit("login:ip", ip),
    clearRateLimit("login:account", `${ip}:${email.toLowerCase()}`),
  ]);

  if (result.status === "two_factor_required") {
    return noStoreRedirect(appUrl("/inloggen?stap=2fa", request));
  }

  return noStoreRedirect(appUrl("/", request));
}
