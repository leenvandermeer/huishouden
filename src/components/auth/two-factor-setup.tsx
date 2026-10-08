"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button, FieldLabel, Input, StatusBadge } from "@/components/ui";
import { setupTwoFactor, enableTwoFactor, disableTwoFactor } from "@/modules/auth/actions";

interface TwoFactorSetupProps {
  userId: string;
  email: string;
  enabled: boolean;
}

export function TwoFactorSetup({ userId, email, enabled }: TwoFactorSetupProps) {
  const router = useRouter();
  const [step, setStep] = useState<"idle" | "setup" | "verify" | "backup" | "done">(enabled ? "idle" : "idle");
  const [secret, setSecret] = useState("");
  const [uri, setUri] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function startSetup() {
    setLoading(true);
    setError("");
    try {
      const result = await setupTwoFactor(userId);
      if (result) {
        setSecret(result.secret);
        setUri(result.uri);
        setQrDataUrl(result.qrDataUrl);
        setBackupCodes(result.backupCodes);
        setStep("setup");
      }
    } catch {
      setError("Kon 2FA niet initialiseren.");
    }
    setLoading(false);
  }

  async function verifyToken(token: string) {
    setLoading(true);
    setError("");
    try {
      const result = await enableTwoFactor(userId, token);
      if (result?.success) {
        setStep("backup");
      } else {
        setError("Ongeldige code. Probeer opnieuw.");
      }
    } catch {
      setError("Verificatie mislukt.");
    }
    setLoading(false);
  }

  async function handleDisable() {
    setLoading(true);
    setError("");
    try {
      await disableTwoFactor(userId);
      setStep("idle");
      router.refresh();
    } catch {
      setError("Uitschakelen mislukt.");
    }
    setLoading(false);
  }

  return (
    <div className="grid gap-3">
      {step === "idle" && !enabled && (
        <section className="rounded-[var(--radius-lg)] border border-border bg-white p-4 shadow-[var(--shadow-sm)]">
          <h2 className="text-sm font-semibold text-brand">Authenticator instellen</h2>
          <p className="mt-2 text-xs text-[var(--color-text-muted)]">
            Download een authenticator-app op je telefoon (Google Authenticator, Authy, 1Password) en scan de QR-code die volgt.
          </p>
          {error ? <StatusBadge tone="warning" className="mt-2">{error}</StatusBadge> : null}
          <Button onClick={startSetup} disabled={loading} variant="primary" className="mt-3">
            {loading ? "Bezig..." : "2FA activeren"}
          </Button>
        </section>
      )}

      {step === "setup" && (
        <section className="rounded-[var(--radius-lg)] border border-border bg-white p-4 shadow-[var(--shadow-sm)]">
          <h2 className="text-sm font-semibold text-brand">QR-code scannen</h2>
          <p className="mt-2 text-xs text-[var(--color-text-muted)]">
            Scan deze QR-code met je authenticator-app. Of voer de handmatige sleutel hieronder in.
          </p>
          <div className="mt-4 flex flex-col items-center gap-3">
            <div className="rounded-lg border border-border bg-white p-4">
              {qrDataUrl ? (
                <Image src={qrDataUrl} alt="QR-code voor authenticator" width={200} height={200} unoptimized className="block" />
              ) : (
                <div className="grid h-[200px] w-[200px] place-items-center rounded bg-[var(--color-surface)]">
                  <p className="text-center text-xs text-[var(--color-text-muted)]">QR-code laden...</p>
                </div>
              )}
            </div>
            <div className="w-full max-w-md rounded-md bg-[var(--color-surface)] p-3">
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[var(--color-text-subtle)]">Handmatige sleutel</p>
              <code className="mt-1 block break-all font-mono text-xs font-semibold text-brand">{secret}</code>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-xs font-semibold text-brand">Voer de 6-cijferige code in uit je app:</p>
            <VerifyForm onVerify={verifyToken} loading={loading} error={error} />
          </div>
        </section>
      )}

      {step === "backup" && (
        <section className="rounded-[var(--radius-lg)] border border-border bg-white p-4 shadow-[var(--shadow-sm)]">
          <StatusBadge tone="success" className="mb-3">2FA geactiveerd!</StatusBadge>
          <h2 className="text-sm font-semibold text-brand">Backup codes</h2>
          <p className="mt-2 text-xs text-[var(--color-text-muted)]">
            Bewaar deze codes op een veilige plek. Je kunt ze gebruiken als je je telefoon kwijt bent. Elke code is eenmalig bruikbaar.
          </p>
          <div className="mt-3 grid gap-1 rounded-md bg-[var(--color-surface)] p-3 font-mono text-xs">
            {backupCodes.map((code, i) => (
              <span key={i} className="font-semibold text-brand">{code}</span>
            ))}
          </div>
          <Button onClick={() => { setStep("idle"); router.refresh(); }} variant="primary" className="mt-3">
            Klaar
          </Button>
        </section>
      )}

      {step === "idle" && enabled && (
        <section className="rounded-[var(--radius-lg)] border border-border bg-white p-4 shadow-[var(--shadow-sm)]">
          <StatusBadge tone="success" className="mb-3">2FA is actief</StatusBadge>
          <p className="text-xs text-[var(--color-text-muted)]">
            Je authenticator is ingeschakeld. Bij elke login moet je een code uit je authenticator-app invoeren.
          </p>
          {error ? <StatusBadge tone="warning" className="mt-2">{error}</StatusBadge> : null}
          <div className="mt-3">
            <Button onClick={handleDisable} variant="danger" disabled={loading}>
              Uitschakelen
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}

function VerifyForm({ onVerify, loading, error }: { onVerify: (token: string) => void; loading: boolean; error: string }) {
  const [token, setToken] = useState("");

  return (
    <div className="mt-2 flex gap-2">
      <Input
        type="text"
        inputMode="numeric"
        pattern="[0-9]{6}"
        maxLength={6}
        placeholder="000000"
        value={token}
        onChange={(e) => setToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
        className="w-32 font-mono text-center text-lg tracking-widest"
        autoFocus
      />
      <Button onClick={() => onVerify(token)} disabled={loading || token.length !== 6} variant="primary">
        {loading ? "Bezig..." : "Verifiëren"}
      </Button>
      {error ? <span className="text-xs text-amber-700">{error}</span> : null}
    </div>
  );
}
