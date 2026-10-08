import { redirect } from "next/navigation";
import { getTwoFactorStatus, requireUser } from "@/modules/auth/service";
import { TwoFactorSetup } from "@/components/auth/two-factor-setup";

export default async function TwoFactorPage() {
  const user = await requireUser();
  const status = await getTwoFactorStatus(user.id);

  return (
    <div className="cockpit-canvas grid gap-3">
      <div className="command-panel view-card rounded-[var(--radius-lg)] p-4 md:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex rounded-md bg-[var(--color-accent-subtle)] px-2 py-0.5 text-xs font-bold uppercase tracking-[0.14em] text-accent">Beveiliging</span>
        </div>
        <h1 className="mt-4 max-w-4xl text-3xl font-semibold leading-tight text-[var(--color-brand-strong)] sm:text-4xl">Extra beveiliging</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-text-muted)]">
          {status.enabled ? "Je inlogcode is actief. Je kunt hem opnieuw instellen of uitschakelen." : "Gebruik naast je wachtwoord ook een code uit een authenticator-app."}
        </p>
      </div>

      <TwoFactorSetup userId={user.id} email={user.email} enabled={status.enabled} />
    </div>
  );
}
