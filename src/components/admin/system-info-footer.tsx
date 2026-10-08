export function SystemInfoFooter() {
  return (
    <footer className="rounded-lg border border-border bg-white/60 px-4 py-3 text-center text-[0.68rem] text-[var(--color-text-subtle)]">
      <p>Huishouden · PostgreSQL 16 · Sessieduur 1 uur</p>
      <p className="mt-0.5">Rollen: Owner, Admin, Alleen-lezen · 2FA: TOTP authenticator</p>
    </footer>
  );
}
