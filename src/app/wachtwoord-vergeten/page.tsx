import Link from "next/link";
import { Landmark, Mail } from "lucide-react";
import { Button, FieldHint, FieldLabel, Input, StatusBadge } from "@/components/ui";

export default async function ForgotPasswordPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const params = (await searchParams) ?? {};
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
            <h1 className="text-lg font-semibold text-brand">Wachtwoord resetten</h1>
          </div>
        </div>
        {status === "verstuurd" ? (
          <div className="mb-4 rounded-md border border-border bg-[var(--color-brand-subtle)] p-3 text-xs text-brand">
            Als het e-mailadres bestaat, is er een resetverzoek aangemaakt. Gebruik de eenmalige link die door beheer is gedeeld.
          </div>
        ) : null}
        {status === "te-veel-pogingen" ? (
          <div className="mb-4 rounded-md border border-border bg-[var(--color-warning-subtle)] p-3 text-xs font-semibold text-amber-800">
            Te veel resetverzoeken. Wacht even en probeer het later opnieuw.
          </div>
        ) : null}
        <form action="/api/auth/password-reset/request" method="post" className="space-y-5">
          <StatusBadge tone="info">Eenmalige resetlink</StatusBadge>
          <div>
            <FieldLabel htmlFor="email">E-mailadres</FieldLabel>
            <Input id="email" name="email" type="email" autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} inputMode="email" required autoFocus />
            <FieldHint>De app toont om veiligheidsredenen altijd dezelfde melding.</FieldHint>
          </div>
          <Button type="submit" variant="primary" className="w-full">
            <Mail aria-hidden="true" size={16} /> Reset aanvragen
          </Button>
        </form>
        <Link href="/inloggen" className="mt-4 block text-center text-xs font-semibold text-brand">
          Terug naar inloggen
        </Link>
      </section>
    </main>
  );
}
