import { Landmark } from "lucide-react";
import { cookies } from "next/headers";
import { LoginForm } from "@/components/auth/login-form";
import { PENDING_2FA_COOKIE_NAME, readPendingTwoFactorToken } from "@/modules/auth/totp";

export default async function LoginPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const params = (await searchParams) ?? {};
  const resetComplete = params.reset === "gelukt";
  const error = typeof params.error === "string" ? params.error : undefined;
  const pendingToken = (await cookies()).get(PENDING_2FA_COOKIE_NAME)?.value;
  const twoFactorPending = Boolean(readPendingTwoFactorToken(pendingToken));

  return (
    <main className="grid min-h-screen place-items-center bg-[var(--color-bg)] p-4">
      <section className="w-full max-w-sm rounded-[var(--radius-lg)] border border-border bg-white p-5 shadow-[var(--shadow-sm)]">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-md bg-brand text-white">
            <Landmark aria-hidden="true" size={20} />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-accent">Huishouden</p>
            <h1 className="text-lg font-semibold text-[var(--color-text)]">Inloggen</h1>
          </div>
        </div>
        <LoginForm resetComplete={resetComplete} error={error} twoFactorPending={twoFactorPending} />
      </section>
    </main>
  );
}
