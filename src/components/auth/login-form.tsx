import { LockKeyhole, RotateCcw, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Button, FieldLabel, Input, PasswordInput, StatusBadge } from "@/components/ui";

export function LoginForm({ resetComplete = false, error, twoFactorPending = false }: { resetComplete?: boolean; error?: string; twoFactorPending?: boolean }) {
  return (
    <form action="/api/auth/login" method="post" className="space-y-5">
      {resetComplete && !twoFactorPending ? (
        <div className="rounded-md border border-border bg-[var(--color-brand-subtle)] p-3 text-xs text-brand">
          Je wachtwoord is gewijzigd. Je kunt nu inloggen.
        </div>
      ) : null}
      {error ? (
        <div className="rounded-md border border-border bg-[var(--color-warning-subtle)] p-3 text-xs font-semibold text-amber-800">
          {loginErrorMessage(error)}
        </div>
      ) : null}
      {twoFactorPending ? (
        <>
          <StatusBadge tone="info">Tweestapsverificatie</StatusBadge>
          <div>
            <FieldLabel htmlFor="twoFactorToken">Authenticator- of backupcode</FieldLabel>
            <Input
              id="twoFactorToken"
              name="twoFactorToken"
              type="text"
              autoComplete="one-time-code"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              placeholder="000000"
              required
              autoFocus
            />
          </div>
          <Button type="submit" variant="primary" className="w-full">
            <ShieldCheck aria-hidden="true" size={16} /> Verifiëren
          </Button>
          <Button type="submit" name="intent" value="restart" variant="ghost" className="w-full">
            <RotateCcw aria-hidden="true" size={16} /> Opnieuw inloggen
          </Button>
        </>
      ) : (
        <>
          <StatusBadge tone="info">Privé</StatusBadge>
          <div>
            <FieldLabel htmlFor="email">E-mailadres</FieldLabel>
            <Input id="email" name="email" type="email" autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} inputMode="email" placeholder="naam@example.nl" required autoFocus />
          </div>
          <div>
            <FieldLabel htmlFor="password">Wachtwoord</FieldLabel>
            <PasswordInput id="password" name="password" autoComplete="current-password" required />
          </div>
          <Button type="submit" variant="primary" className="w-full">
            <LockKeyhole aria-hidden="true" size={16} /> Inloggen
          </Button>
          <Link href="/wachtwoord-vergeten" className="block text-center text-xs font-semibold text-brand">
            Wachtwoord vergeten
          </Link>
        </>
      )}
    </form>
  );
}

function loginErrorMessage(error: string) {
  if (error === "te-veel-pogingen") return "Te veel pogingen. Wacht even en probeer het opnieuw.";
  if (error === "2fa-ongeldig") return "Authenticator- of backupcode klopt niet.";
  if (error === "2fa-verlopen") return "De verificatiestap is verlopen. Log opnieuw in.";
  return "E-mailadres of wachtwoord klopt niet.";
}
