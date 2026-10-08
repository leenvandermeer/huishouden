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
    <div className="management-page">
      <PageHeader
        eyebrow="Systeem"
        title="Instellingen"
        description="Richt je boekhouding in, verwerk bankgegevens en beheer toegang en back-ups."
      />

      {!canMutate ? <div className="mb-4"><ReadonlyNotice /></div> : null}
      {statusMessage ? <div className="management-notice" role="status">{statusMessage}</div> : null}

      <div className="management-layout">
        <aside className="management-index" aria-label="Beheeronderdelen">
          <p>Op deze pagina</p>
          <nav>
            <a href="#overzicht"><ShieldCheck aria-hidden="true" size={16} /> Overzicht</a>
            <a href="#inrichting"><WalletCards aria-hidden="true" size={16} /> Inrichting</a>
            <a href="#verwerken"><ListChecks aria-hidden="true" size={16} /> Verwerken</a>
            <a href="#toegang"><Fingerprint aria-hidden="true" size={16} /> Toegang</a>
            <a href="#data"><DatabaseBackup aria-hidden="true" size={16} /> Data</a>
          </nav>
          <div className="management-index__context">
            <span>{user.name}</span>
            <strong>{roleLabel(user.role)}</strong>
          </div>
        </aside>

        <div className="management-content">
          <section id="overzicht" className="management-overview" aria-labelledby="management-overview-title">
            <div className="management-section-heading">
              <div>
                <p>Status</p>
                <h2 id="management-overview-title">Alles in orde?</h2>
              </div>
              <StatusBadge tone={twoFactorStatus.enabled ? "success" : "warning"}>{twoFactorStatus.enabled ? "Beveiligd met 2FA" : "2FA nog uit"}</StatusBadge>
            </div>
            <dl className="management-stats">
              <ManagementStat label="Rekeningen" value={dataset.accounts.length} detail="gekoppeld" />
              <ManagementStat label="Categorieën" value={activeCategories} detail={`${inactiveCategories} inactief`} />
              <ManagementStat label="Herkenningsregels" value={activeRules} detail="actief" />
              <ManagementStat label="Transacties" value={transactionCount} detail="opgeslagen" />
            </dl>
            <p className="management-last-import">
              {dataset.importInfo
                ? `Laatste import: ${dataset.importInfo.transactionCount} transacties toegevoegd`
                : "Er is nog geen bankbestand geïmporteerd."}
            </p>
          </section>

          <ManagementSection id="inrichting" eyebrow="Indeling" title="Rekeningen en categorieën" description="Bepaal waar je geld staat en hoe betalingen worden ingedeeld.">
            <ManagementLink href="/rekeningen" icon={<Landmark aria-hidden="true" size={20} />} title="Rekeningen" description="Namen, saldi en rekeningsoorten." meta={`${dataset.accounts.length} rekeningen`} />
            <ManagementLink href="/categorieen" icon={<ListFilter aria-hidden="true" size={20} />} title="Categorieën" description="Onderwerpen zoals wonen en boodschappen." meta={`${activeCategories} actief`} />
            <ManagementLink href="/mappingregels" icon={<Route aria-hidden="true" size={20} />} title="Automatisch indelen" description="Laat nieuwe betalingen meteen de juiste categorie krijgen." meta={`${activeRules} regels`} />
            <ManagementLink href="/vaste-lasten" icon={<ReceiptText aria-hidden="true" size={20} />} title="Inkomen en vaste lasten" description="Salaris, huur en andere vaste betalingen." meta={fixedCandidates ? `${fixedCandidates} voorstellen` : `${fixedExpenses.length} actief`} tone={fixedCandidates ? "warning" : "neutral"} />
          </ManagementSection>

          <ManagementSection id="verwerken" eyebrow="Bijwerken" title="Nieuwe bankgegevens" description="Voeg betalingen toe en controleer wat nog niet goed is ingedeeld.">
            <ManagementLink href="/importeren" icon={<Upload aria-hidden="true" size={20} />} title="Bankgegevens importeren" description="Upload CSV, CAMT.053 of MT940 en bekijk eerst de preview." meta="Toevoegen" accent />
            <ManagementLink href="/categoriseren" icon={<ListChecks aria-hidden="true" size={20} />} title="Categorieën controleren" description="Geef betalingen zonder duidelijke categorie de juiste plek." meta={reviewCount ? `${reviewCount} open` : "Klaar"} tone={reviewCount ? "warning" : "success"} />
          </ManagementSection>

          <section id="toegang" className="management-section" aria-labelledby="management-access-title">
            <div className="management-section-heading">
              <div>
                <p>Persoonlijk</p>
                <h2 id="management-access-title">Toegang en beveiliging</h2>
                <span>Je wachtwoord, extra beveiliging en andere gebruikers.</span>
              </div>
            </div>
            <div className="management-link-list">
              <ManagementLink href="/instellingen" icon={<Palette aria-hidden="true" size={20} />} title="Licht of donker" description="Kies licht, donker of volg je apparaat." meta="Weergave" />
              <ManagementLink href="/instellingen/2fa" icon={<Fingerprint aria-hidden="true" size={20} />} title="Authenticator" description="Een extra beveiligingscode bij het inloggen." meta={twoFactorStatus.enabled ? "Actief" : "Instellen"} tone={twoFactorStatus.enabled ? "success" : "warning"} />
            </div>

            <div className="management-disclosures">
              <details>
                <summary><span><KeyRound aria-hidden="true" size={18} /> Wachtwoord wijzigen</span><ArrowRight aria-hidden="true" size={16} /></summary>
                <form action={changePassword} className="management-form">
                  <div><FieldLabel htmlFor="currentPassword">Huidig wachtwoord</FieldLabel><PasswordInput id="currentPassword" name="currentPassword" autoComplete="current-password" required /></div>
                  <div><FieldLabel htmlFor="password">Nieuw wachtwoord</FieldLabel><PasswordInput id="password" name="password" autoComplete="new-password" minLength={12} required /></div>
                  <div><FieldLabel htmlFor="passwordConfirm">Herhaal nieuw wachtwoord</FieldLabel><PasswordInput id="passwordConfirm" name="passwordConfirm" autoComplete="new-password" minLength={12} required /></div>
                  <SubmitButton variant="primary" pendingLabel="Wijzigen...">Wachtwoord wijzigen</SubmitButton>
                </form>
              </details>

              <details>
                <summary>
                  <span><Users aria-hidden="true" size={18} /> Gebruikers</span>
                  <span className="management-summary-meta">{activeUserCount} actief{disabledUserCount ? ` · ${disabledUserCount} uit` : ""} <ArrowRight aria-hidden="true" size={16} /></span>
                </summary>
                <div className="management-users">
                  {canManageUsers ? (
                    <details className="management-add-user">
                      <summary><UserPlus aria-hidden="true" size={16} /> Gebruiker toevoegen</summary>
                      <form action={createUser} className="management-form management-form--user">
                        <div><FieldLabel htmlFor="new-user-name">Naam</FieldLabel><Input id="new-user-name" name="name" required /></div>
                        <div><FieldLabel htmlFor="new-user-email">E-mail</FieldLabel><Input id="new-user-email" name="email" type="email" autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} inputMode="email" required /></div>
                        <div><FieldLabel htmlFor="new-user-role">Rol</FieldLabel><Select id="new-user-role" name="role" defaultValue="readonly"><option value="owner">Eigenaar</option><option value="admin">Beheerder</option><option value="readonly">Alleen lezen</option></Select></div>
                        <div><FieldLabel htmlFor="new-user-password">Tijdelijk wachtwoord</FieldLabel><PasswordInput id="new-user-password" name="password" autoComplete="new-password" minLength={12} required /></div>
                        <SubmitButton variant="primary" pendingLabel="Toevoegen...">Toevoegen</SubmitButton>
                      </form>
                    </details>
                  ) : <ReadonlyNotice>Alleen de eigenaar kan gebruikers toevoegen of uitschakelen.</ReadonlyNotice>}

                  <div className="management-user-list">
                    {users.map((managedUser) => (
                      <article key={managedUser.id}>
                        <span className="management-avatar">{managedUser.name.slice(0, 1).toUpperCase()}</span>
                        <span className="management-user-copy">
                          <strong>{managedUser.name}</strong>
                          <small>{managedUser.email} · sinds {formatDate(managedUser.createdAt)}</small>
                        </span>
                        <StatusBadge tone={managedUser.disabledAt ? "neutral" : "success"}>{managedUser.disabledAt ? "Uitgeschakeld" : roleLabel(managedUser.role)}</StatusBadge>
                        {canManageUsers && !managedUser.disabledAt && managedUser.id !== user.id ? (
                          <form action={disableUser}>
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

          <ManagementSection id="data" eyebrow="Bewaren" title="Back-up en geschiedenis" description="Download je gegevens of kijk wat er is aangepast.">
            <ManagementLink href="/beheer/productstatus" icon={<Activity aria-hidden="true" size={20} />} title="Productstatus" description="Fouten, ontbrekende bronnen en gebruikte correcties." meta="Controleren" />
            <ManagementLink href="/exporteren" icon={<DatabaseBackup aria-hidden="true" size={20} />} title="Back-up downloaden" description="Bewaar een kopie van je gegevens." meta="Download" />
            <ManagementLink href="/audit" icon={<FileClock aria-hidden="true" size={20} />} title="Eerdere wijzigingen" description="Bekijk wat is geïmporteerd of aangepast." meta="Bekijken" />
          </ManagementSection>

          <footer className="management-footer">Huishouden · PostgreSQL 16 · sessieduur 1 uur</footer>
        </div>
      </div>
    </div>
  );
}

function ManagementSection({ id, eyebrow, title, description, children }: { id: string; eyebrow: string; title: string; description: string; children: React.ReactNode }) {
  return (
    <section id={id} className="management-section" aria-labelledby={`${id}-title`}>
      <div className="management-section-heading">
        <div>
          <p>{eyebrow}</p>
          <h2 id={`${id}-title`}>{title}</h2>
          <span>{description}</span>
        </div>
      </div>
      <div className="management-link-list">{children}</div>
    </section>
  );
}

function ManagementLink({ href, icon, title, description, meta, tone = "neutral", accent = false }: { href: string; icon: React.ReactNode; title: string; description: string; meta: string; tone?: "neutral" | "success" | "warning"; accent?: boolean }) {
  return (
    <Link href={href} className={accent ? "management-link management-link--accent" : "management-link"}>
      <span className="management-link__icon">{icon}</span>
      <span className="management-link__copy"><strong>{title}</strong><small>{description}</small></span>
      <span className={`management-link__meta management-link__meta--${tone}`}>{meta}</span>
      <ArrowRight aria-hidden="true" className="management-link__arrow" size={18} />
    </Link>
  );
}

function ManagementStat({ label, value, detail }: { label: string; value: number; detail: string }) {
  return <div><dt>{label}</dt><dd>{value.toLocaleString("nl-NL")}</dd><small>{detail}</small></div>;
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
