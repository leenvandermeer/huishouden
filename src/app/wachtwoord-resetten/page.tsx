import Link from "next/link";
import { Landmark, LockKeyhole } from "lucide-react";
import { Button, FieldHint, FieldLabel, PasswordInput, StatusBadge } from "@/components/ui";

export default async function ResetPasswordPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const params = (await searchParams) ?? {};
  const token = typeof params.token === "string" ? params.token : "";
  const status = typeof params.status === "string" ? params.status : undefined;

  return (
    <main className="grid min-h-screen place-items-center bg-[var(--color-bg)] p-4">
      <section className="w-full max-w-sm rounded-[var(--radius-lg)] border border-border bg-white p-5 shadow-[var(--shadow-sm)]">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-md bg-brand text-white">
            <Landmark aria-hidden="true" size={20} />
          </span>
          <div>
            <p className="text-[0.6rem] font-bold uppercase tracking-[0.12em] text-accent">Huishouden</p>
            <h1 className="text-lg font-semibold text-brand">Nieuw wachtwoord</h1>
          </div>
        </div>
        {status ? (
          <div className="mb-4 rounded-md border border-border bg-[var(--color-brand-subtle)] p-3 text-xs text-brand">
            {status === "ongeldig" ? "Controleer de wachtwoorden. Gebruik minimaal 12 tekens en vul twee keer hetzelfde wachtwoord in." : null}
            {status === "verlopen" ? "Deze resetlink is verlopen of al gebruikt." : null}
            {status === "te-veel-pogingen" ? "Te veel pogingen. Wacht even en probeer het later opnieuw." : null}
          </div>
        ) : null}
        <form action="/api/auth/password-reset/confirm" method="post" className="space-y-5">
          <StatusBadge tone="info">Wachtwoord wijzigen</StatusBadge>
          <input type="hidden" name="token" value={token} />
          <div>
            <FieldLabel htmlFor="password">Nieuw wachtwoord</FieldLabel>
            <PasswordInput id="password" name="password" autoComplete="new-password" minLength={12} required autoFocus />
            <FieldHint>Minimaal 12 tekens.</FieldHint>
          </div>
          <div>
            <FieldLabel htmlFor="passwordConfirm">Herhaal wachtwoord</FieldLabel>
            <PasswordInput id="passwordConfirm" name="passwordConfirm" autoComplete="new-password" minLength={12} required />
          </div>
          <Button type="submit" variant="primary" className="w-full" disabled={!token}>
            <LockKeyhole aria-hidden="true" size={16} /> Opslaan
          </Button>
        </form>
        <Link href="/inloggen" className="mt-4 block text-center text-xs font-semibold text-brand">
          Terug naar inloggen
        </Link>
      </section>
    </main>
  );
}
