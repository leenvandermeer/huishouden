import Link from "next/link";
import {
  ArrowRight,
  DatabaseBackup,
  FileClock,
  Fingerprint,
  KeyRound,
  Landmark,
  ListChecks,
  ListFilter,
  ReceiptText,
  Route,
  Palette,
  ShieldCheck,
  Activity,
  Upload,
  UserPlus,
  Users,
  WalletCards,
} from "lucide-react";
import { Button, FieldLabel, Input, PageHeader, PasswordInput, Select, StatusBadge, SubmitButton } from "@/components/ui";
import { ReadonlyNotice } from "@/components/finance/readonly-notice";
import { changePassword, createUser, disableUser } from "@/modules/auth/actions";
import { getTwoFactorStatus, listManagedUsers, requireUser } from "@/modules/auth/service";
import { getFinanceMetadata, getFixedExpenses } from "@/modules/finance/data-source";
import { getCategorizationRulesLightFromDatabase, getCategoryReviewCount, getFixedExpenseCandidatesFromDatabase, getTransactionCountFromDatabase } from "@/modules/finance/repository";
import { formatDate } from "@/lib/format";

export default async function ManagementPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const user = await requireUser();
  const [users, dataset, rules, fixedExpenses, fixedExpenseCandidates, reviewCount, transactionCount, twoFactorStatus] = await Promise.all([
    listManagedUsers(),
    getFinanceMetadata(),
    getCategorizationRulesLightFromDatabase(),
    getFixedExpenses(),
    getFixedExpenseCandidatesFromDatabase(),
    getCategoryReviewCount(),
    getTransactionCountFromDatabase(),
    getTwoFactorStatus(user.id),
  ]);
  const activeRules = rules.filter((rule) => rule.active).length;
  const fixedCandidates = fixedExpenseCandidates.filter((candidate) => !candidate.alreadyManaged).length;
  const activeCategories = dataset.categories.filter((category) => !category.validTo).length;
  const inactiveCategories = dataset.categories.length - activeCategories;
  const canMutate = user.role !== "readonly";
  const canManageUsers = user.role === "owner";
  const activeUserCount = users.filter((managedUser) => !managedUser.disabledAt).length;
  const disabledUserCount = users.length - activeUserCount;
  const statusMessage = getStatusMessage(params?.toegang);

  return (
    <>
      <PageHeader
        eyebrow="Systeem"
        title="Instellingen"
        description="Richt je boekhouding in, verwerk bankgegevens en beheer toegang en back-ups."
        stats={[
          { label: "Rekeningen", value: dataset.accounts.length.toLocaleString("nl-NL"), detail: "gekoppeld" },
          { label: "Categorieën", value: activeCategories.toLocaleString("nl-NL"), detail: `${inactiveCategories} inactief` },
          { label: "Herkenningsregels", value: activeRules.toLocaleString("nl-NL"), detail: "actief" },
          { label: "Transacties", value: transactionCount.toLocaleString("nl-NL"), detail: "opgeslagen" },
        ]}
      />

      <div>
        {!canMutate ? <div className="mb-6"><ReadonlyNotice /></div> : null}
        {statusMessage ? <div className="mb-6 border border-border border-l-2 border-l-[var(--color-success)] bg-[var(--color-panel-strong)] px-4 py-3 text-sm text-[var(--color-text)]" role="status">{statusMessage}</div> : null}

        <aside className="mb-10 flex flex-wrap items-center justify-between gap-x-8 gap-y-3 border-y border-border py-3" aria-label="Beheeronderdelen">
          <div className="flex min-w-0 flex-wrap items-center gap-x-6 gap-y-2">
            <p className={LABEL}>Op deze pagina</p>
            <nav className="flex flex-wrap gap-x-5 gap-y-2">
              <IndexLink href="#overzicht" icon={<ShieldCheck aria-hidden="true" size={14} />}>Overzicht</IndexLink>
              <IndexLink href="#inrichting" icon={<WalletCards aria-hidden="true" size={14} />}>Inrichting</IndexLink>
              <IndexLink href="#verwerken" icon={<ListChecks aria-hidden="true" size={14} />}>Verwerken</IndexLink>
              <IndexLink href="#toegang" icon={<Fingerprint aria-hidden="true" size={14} />}>Toegang</IndexLink>
              <IndexLink href="#data" icon={<DatabaseBackup aria-hidden="true" size={14} />}>Data</IndexLink>
            </nav>
          </div>
          <div className="flex items-baseline gap-2 text-xs text-[var(--color-text-muted)]">
            <span className="text-[var(--color-text)]">{user.name}</span>
            <span className={LABEL}>{roleLabel(user.role)}</span>
          </div>
        </aside>

        <div className="min-w-0">
          <section id="overzicht" className="mb-12 scroll-mt-24" aria-labelledby="management-overview-title">
            <div className="section-head">
              <h2 id="management-overview-title">Alles in orde?</h2>
              <StatusBadge tone={twoFactorStatus.enabled ? "success" : "warning"}>{twoFactorStatus.enabled ? "Beveiligd met 2FA" : "2FA nog uit"}</StatusBadge>
            </div>
            <p className="border-t border-[var(--color-text)] pt-4 font-[family-name:var(--font-serif-house)] text-[0.95rem] text-[var(--color-text-muted)]">
              {dataset.importInfo
                ? `Laatste import: ${dataset.importInfo.transactionCount} transacties toegevoegd.`
                : "Er is nog geen bankbestand geïmporteerd."}
            </p>
          </section>

          <ManagementSection id="inrichting" title="Rekeningen en categorieën" description="Bepaal waar je geld staat en hoe betalingen worden ingedeeld.">
            <ManagementLink href="/rekeningen" icon={<Landmark aria-hidden="true" size={18} />} title="Rekeningen" description="Namen, saldi en rekeningsoorten." meta={`${dataset.accounts.length} rekeningen`} />
            <ManagementLink href="/categorieen" icon={<ListFilter aria-hidden="true" size={18} />} title="Categorieën" description="Onderwerpen zoals wonen en boodschappen." meta={`${activeCategories} actief`} />
            <ManagementLink href="/mappingregels" icon={<Route aria-hidden="true" size={18} />} title="Automatisch indelen" description="Laat nieuwe betalingen meteen de juiste categorie krijgen." meta={`${activeRules} regels`} />
            <ManagementLink href="/vaste-lasten" icon={<ReceiptText aria-hidden="true" size={18} />} title="Inkomen en vaste lasten" description="Salaris, huur en andere vaste betalingen." meta={fixedCandidates ? `${fixedCandidates} voorstellen` : `${fixedExpenses.length} actief`} tone={fixedCandidates ? "warning" : "neutral"} />
          </ManagementSection>

          <ManagementSection id="verwerken" title="Nieuwe bankgegevens" description="Voeg betalingen toe en controleer wat nog niet goed is ingedeeld.">
            <ManagementLink href="/importeren" icon={<Upload aria-hidden="true" size={18} />} title="Bankgegevens importeren" description="Upload CSV, CAMT.053 of MT940 en bekijk eerst de preview." meta="Toevoegen" />
            <ManagementLink href="/categoriseren" icon={<ListChecks aria-hidden="true" size={18} />} title="Categorieën controleren" description="Geef betalingen zonder duidelijke categorie de juiste plek." meta={reviewCount ? `${reviewCount} open` : "Klaar"} tone={reviewCount ? "warning" : "success"} />
          </ManagementSection>

          <section id="toegang" className="mb-12 scroll-mt-24" aria-labelledby="management-access-title">
            <div className="section-head">
              <h2 id="management-access-title">Toegang en beveiliging</h2>
              <p>Je wachtwoord, extra beveiliging en andere gebruikers.</p>
            </div>
            <div className="border-t border-[var(--color-text)]">
              <ManagementLink href="/instellingen" icon={<Palette aria-hidden="true" size={18} />} title="Licht of donker" description="Kies licht, donker of volg je apparaat." meta="Weergave" />
              <ManagementLink href="/instellingen/2fa" icon={<Fingerprint aria-hidden="true" size={18} />} title="Authenticator" description="Een extra beveiligingscode bij het inloggen." meta={twoFactorStatus.enabled ? "Actief" : "Instellen"} tone={twoFactorStatus.enabled ? "success" : "warning"} />
            </div>

            <div className="mt-6 border-t border-[var(--color-text)]">
              <details className="group border-b border-border">
                <summary className={SUMMARY}><span className="flex items-center gap-3"><KeyRound aria-hidden="true" size={16} className="text-[var(--color-text-subtle)]" /> Wachtwoord wijzigen</span><ArrowRight aria-hidden="true" size={16} className="text-[var(--color-text-subtle)] transition-transform group-open:rotate-90" /></summary>
                <form action={changePassword} className="grid max-w-[34rem] gap-4 px-1 pb-6">
                  <div><FieldLabel htmlFor="currentPassword">Huidig wachtwoord</FieldLabel><PasswordInput id="currentPassword" name="currentPassword" autoComplete="current-password" required /></div>
                  <div><FieldLabel htmlFor="password">Nieuw wachtwoord</FieldLabel><PasswordInput id="password" name="password" autoComplete="new-password" minLength={12} required /></div>
                  <div><FieldLabel htmlFor="passwordConfirm">Herhaal nieuw wachtwoord</FieldLabel><PasswordInput id="passwordConfirm" name="passwordConfirm" autoComplete="new-password" minLength={12} required /></div>
                  <SubmitButton variant="primary" pendingLabel="Wijzigen...">Wachtwoord wijzigen</SubmitButton>
                </form>
              </details>

              <details className="group border-b border-border">
                <summary className={SUMMARY}>
                  <span className="flex items-center gap-3"><Users aria-hidden="true" size={16} className="text-[var(--color-text-subtle)]" /> Gebruikers</span>
                  <span className="flex items-center gap-3 text-[0.62rem] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">{activeUserCount} actief{disabledUserCount ? ` · ${disabledUserCount} uit` : ""} <ArrowRight aria-hidden="true" size={16} className="text-[var(--color-text-subtle)] transition-transform group-open:rotate-90" /></span>
                </summary>
                <div className="pb-6">
                  {canManageUsers ? (
                    <details className="mb-4 border border-border bg-[var(--color-panel-strong)]">
                      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-4 text-[0.66rem] uppercase tracking-[0.2em] text-[var(--color-text)] [&::-webkit-details-marker]:hidden"><UserPlus aria-hidden="true" size={14} /> Gebruiker toevoegen</summary>
                      <form action={createUser} className="grid gap-4 border-t border-border p-4 sm:grid-cols-2">
                        <div><FieldLabel htmlFor="new-user-name">Naam</FieldLabel><Input id="new-user-name" name="name" required /></div>
                        <div><FieldLabel htmlFor="new-user-email">E-mail</FieldLabel><Input id="new-user-email" name="email" type="email" autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} inputMode="email" required /></div>
                        <div><FieldLabel htmlFor="new-user-role">Rol</FieldLabel><Select id="new-user-role" name="role" defaultValue="readonly"><option value="owner">Eigenaar</option><option value="admin">Beheerder</option><option value="readonly">Alleen lezen</option></Select></div>
                        <div><FieldLabel htmlFor="new-user-password">Tijdelijk wachtwoord</FieldLabel><PasswordInput id="new-user-password" name="password" autoComplete="new-password" minLength={12} required /></div>
                        <SubmitButton variant="primary" pendingLabel="Toevoegen..." className="self-end">Toevoegen</SubmitButton>
                      </form>
                    </details>
                  ) : <div className="mb-4"><ReadonlyNotice>Alleen de eigenaar kan gebruikers toevoegen of uitschakelen.</ReadonlyNotice></div>}

                  <div className="border-t border-border">
                    {users.map((managedUser) => (
                      <article key={managedUser.id} className="grid min-h-16 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 border-b border-border py-3 sm:grid-cols-[auto_minmax(0,1fr)_auto_auto]">
                        <span className="grid h-8 w-8 place-items-center border border-border text-[0.7rem] text-[var(--color-text-muted)]">{managedUser.name.slice(0, 1).toUpperCase()}</span>
                        <span className="min-w-0">
                          <strong className="block truncate text-sm font-medium text-[var(--color-text)]">{managedUser.name}</strong>
                          <small className="mt-0.5 block truncate text-xs text-[var(--color-text-subtle)]">{managedUser.email} · sinds {formatDate(managedUser.createdAt)}</small>
                        </span>
                        <StatusBadge tone={managedUser.disabledAt ? "neutral" : "success"}>{managedUser.disabledAt ? "Uitgeschakeld" : roleLabel(managedUser.role)}</StatusBadge>
                        {canManageUsers && !managedUser.disabledAt && managedUser.id !== user.id ? (
                          <form action={disableUser} className="col-span-3 justify-self-end sm:col-span-1">
                            <input type="hidden" name="userId" value={managedUser.id} />
                            <Button type="submit" variant="danger" size="sm">Uitschakelen</Button>
                          </form>
                        ) : null}
                      </article>
                    ))}
                  </div>
                </div>
              </details>
            </div>
          </section>

          <ManagementSection id="data" title="Back-up en geschiedenis" description="Download je gegevens of kijk wat er is aangepast.">
            <ManagementLink href="/beheer/productstatus" icon={<Activity aria-hidden="true" size={18} />} title="Productstatus" description="Fouten, ontbrekende bronnen en gebruikte correcties." meta="Controleren" />
            <ManagementLink href="/exporteren" icon={<DatabaseBackup aria-hidden="true" size={18} />} title="Back-up downloaden" description="Bewaar een kopie van je gegevens." meta="Download" />
            <ManagementLink href="/audit" icon={<FileClock aria-hidden="true" size={18} />} title="Eerdere wijzigingen" description="Bekijk wat is geïmporteerd of aangepast." meta="Bekijken" />
          </ManagementSection>

          <footer className="mt-12 border-t border-border py-4 text-center text-[0.62rem] uppercase tracking-[0.22em] text-[var(--color-text-subtle)]">Huishouden · PostgreSQL 16 · sessieduur 1 uur</footer>
        </div>
      </div>
    </>
  );
}

const LABEL = "text-[0.62rem] uppercase tracking-[0.22em] text-[var(--color-text-muted)]";
const SUMMARY = "flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 px-1 py-3 text-sm font-medium text-[var(--color-text)] [&::-webkit-details-marker]:hidden";

function IndexLink({ href, icon, children }: { href: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <a href={href} className="inline-flex min-h-8 items-center gap-2 border-b border-transparent text-[0.66rem] uppercase tracking-[0.2em] text-[var(--color-text)] transition-colors hover:border-[var(--color-text)]">
      <span className="text-[var(--color-text-subtle)]">{icon}</span>{children}
    </a>
  );
}

function ManagementSection({ id, title, description, children }: { id: string; title: string; description: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-12 scroll-mt-24" aria-labelledby={`${id}-title`}>
      <div className="section-head">
        <h2 id={`${id}-title`}>{title}</h2>
        <p>{description}</p>
      </div>
      <div className="border-t border-[var(--color-text)]">{children}</div>
    </section>
  );
}

function ManagementLink({ href, icon, title, description, meta, tone = "neutral" }: { href: string; icon: React.ReactNode; title: string; description: string; meta: string; tone?: "neutral" | "success" | "warning" }) {
  const metaColor = tone === "warning" ? "text-[var(--color-warning)]" : tone === "success" ? "text-[var(--color-success)]" : "text-[var(--color-text-muted)]";
  return (
    <Link href={href} className="group grid min-h-[4.5rem] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 border-b border-border px-1 py-3 transition-colors hover:bg-[var(--color-surface)]">
      <span className="text-[var(--color-text-subtle)]">{icon}</span>
      <span className="min-w-0"><strong className="block text-sm font-medium text-[var(--color-text)]">{title}</strong><small className="mt-1 block text-xs leading-5 text-[var(--color-text-muted)]">{description}</small></span>
      <span className="flex items-center gap-3">
        <span className={`whitespace-nowrap text-[0.62rem] uppercase tracking-[0.14em] sm:tracking-[0.22em] ${metaColor}`}>{meta}</span>
        <ArrowRight aria-hidden="true" className="text-[var(--color-text-subtle)] transition-transform group-hover:translate-x-1" size={16} />
      </span>
    </Link>
  );
}

function getStatusMessage(value: string | string[] | undefined) {
  if (!value || Array.isArray(value)) return null;
  const messages: Record<string, string> = {
    "wachtwoord-gewijzigd": "Je wachtwoord is gewijzigd.",
    "huidig-wachtwoord-onjuist": "Het huidige wachtwoord klopt niet.",
    "wachtwoord-ongeldig": "Het nieuwe wachtwoord moet minimaal 12 tekens bevatten.",
    "gebruikers-opgeslagen": "De gebruiker is toegevoegd.",
    "gebruikers-uitgeschakeld": "De gebruiker is uitgeschakeld.",
    "gebruikers-niet-toegestaan": "Je kunt jezelf niet uitschakelen.",
    "gebruikers-ongeldig": "Controleer de gegevens van de gebruiker.",
  };
  return messages[value] ?? null;
}

function roleLabel(role: string) {
  if (role === "owner") return "Eigenaar";
  if (role === "admin") return "Beheerder";
  return "Alleen lezen";
}
