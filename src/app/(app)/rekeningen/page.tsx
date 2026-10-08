import Link from "next/link";
import { ButtonLink, FieldHint, FieldLabel, Input, PageHeader, Select, StatusBadge, SubmitButton } from "@/components/ui";
import { ReadonlyNotice } from "@/components/finance/readonly-notice";
import { formatCurrency, formatDate } from "@/lib/format";
import { getFinanceMetadata } from "@/modules/finance/data-source";
import { createAccount, mergeAccounts, saveAccountAlias, saveAccountDetails, toggleAccountExcludeFromImport } from "@/modules/finance/actions";
import { getAccountAliasesFromDatabase, getAccountSummariesFromDatabase } from "@/modules/finance/repository";
import { requireUser } from "@/modules/auth/service";
import { accountTypeLabel } from "@/modules/finance/wealth";

export default async function AccountsPage() {
  const [user, { accounts, importInfo }, aliases, accountSummaries] = await Promise.all([
    requireUser(),
    getFinanceMetadata(),
    getAccountAliasesFromDatabase(),
    getAccountSummariesFromDatabase(),
  ]);
  const canMutate = user.role !== "readonly";
  const paymentBalance = accounts.filter((account) => account.type === "betaalrekening").reduce((sum, account) => sum + account.balance, 0);
  const savingsBalance = accounts.filter((account) => account.type === "spaarrekening").reduce((sum, account) => sum + account.balance, 0);
  const investmentBalance = accounts.filter((account) => account.type === "beleggingsrekening").reduce((sum, account) => sum + account.balance, 0);
  const debtBalance = accounts.filter((account) => account.type === "schuld").reduce((sum, account) => sum + account.balance, 0);
  const totalBalance = paymentBalance + savingsBalance + investmentBalance + debtBalance;
  return (
    <>
      <PageHeader eyebrow="Rekeningen beheren" title="Je rekeningen" description={canMutate ? (importInfo ? `${importInfo.accountCount} rekeningen gevonden. Controleer of de saldi kloppen.` : "Voeg je betaal-, spaar-, beleggings- of schuldrekening toe.") : "Je kunt de rekeningen bekijken, maar niet aanpassen."} actions={<ButtonLink href="/vermogen" variant="secondary" size="sm">Naar Vermogen</ButtonLink>} />
      {!canMutate ? <div className="mb-3"><ReadonlyNotice /></div> : null}
      <section className="mb-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard label="Betaalrekeningen" value={formatCurrency(paymentBalance)} />
        <SummaryCard label="Spaarrekeningen" value={formatCurrency(savingsBalance)} />
        <SummaryCard label="Beleggingen" value={formatCurrency(investmentBalance)} />
        <SummaryCard label="Schulden" value={formatCurrency(debtBalance)} />
        <SummaryCard label="Netto vermogen" value={formatCurrency(totalBalance)} />
      </section>

      {canMutate ? (
      <form action={createAccount} className="mb-3 rounded-[var(--radius-lg)] border border-border bg-white p-3 shadow-[var(--shadow-sm)]">
        <div className="mb-3">
          <h2 className="text-sm font-semibold text-brand">Rekening toevoegen</h2>
          <p className="mt-1 text-xs leading-5 text-[var(--color-text-muted)]">Voeg een betaal- of spaarrekening toe.</p>
        </div>
        <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_11rem_11rem_9rem_9rem_auto] lg:items-end">
          <div>
            <FieldLabel htmlFor="new-name">Naam</FieldLabel>
            <Input id="new-name" name="name" placeholder="Bijvoorbeeld gezamenlijke rekening" required />
          </div>
          <div>
            <FieldLabel htmlFor="new-iban">IBAN/rekening</FieldLabel>
            <Input id="new-iban" name="iban" placeholder="NL00 BANK 0000 0000 00" required />
          </div>
          <div>
            <FieldLabel htmlFor="new-bank">Bank</FieldLabel>
            <Input id="new-bank" name="bank" placeholder="Bank" defaultValue="Bank" />
          </div>
          <div>
            <FieldLabel htmlFor="new-type">Type</FieldLabel>
            <Select id="new-type" name="type" defaultValue="betaalrekening">
              <option value="betaalrekening">Betaalrekening</option>
              <option value="spaarrekening">Spaarrekening</option>
              <option value="beleggingsrekening">Beleggingsrekening</option>
              <option value="schuld">Schuld (negatief saldo)</option>
            </Select>
          </div>
          <div>
            <FieldLabel htmlFor="new-balance">Bankstand</FieldLabel>
            <Input id="new-balance" name="balance" inputMode="decimal" defaultValue="0,00" />
          </div>
          <div>
            <FieldLabel htmlFor="new-balance-date">Peildatum</FieldLabel>
            <Input id="new-balance-date" name="balanceDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-[var(--color-text-muted)]">Kies of dit een betaal- of spaarrekening is.</p>
          <SubmitButton variant="primary" pendingLabel="Toevoegen...">Voeg rekening toe</SubmitButton>
        </div>
      </form>
      ) : null}

      {canMutate && accounts.length > 1 ? (
        <details className="mb-3 rounded-[var(--radius-lg)] border border-border bg-white p-3 shadow-[var(--shadow-sm)]">
          <summary className="cursor-pointer text-sm font-semibold text-brand">Rekeningen samenvoegen</summary>
          <form action={mergeAccounts} className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
            <div>
              <FieldLabel htmlFor="sourceAccountId">Verplaats transacties van</FieldLabel>
              <Select id="sourceAccountId" name="sourceAccountId" required>
                {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
              </Select>
            </div>
            <div>
              <FieldLabel htmlFor="targetAccountId">Naar rekening</FieldLabel>
              <Select id="targetAccountId" name="targetAccountId" required>
                {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
              </Select>
            </div>
            <SubmitButton variant="secondary" pendingLabel="Samenvoegen...">Samenvoegen</SubmitButton>
          </form>
          <FieldHint>Gebruik dit voor dubbele rekeningen of importvarianten. De bronrekening wordt gearchiveerd; aliases blijven naar de doelrekening wijzen.</FieldHint>
        </details>
      ) : null}

      <section className="grid gap-3 xl:grid-cols-3">
        {accounts.map((account) => {
          const accountAliases = aliases.filter((alias) => alias.accountId === account.id);
          const summary = accountSummaries.get(account.id);
          const balanceDifference = Math.round((summary?.balanceDifference ?? 0) * 100) / 100;
          const typeLabel = accountTypeLabel(account.type);
          const importLabel = account.excluded_from_import ? "Uitgesloten" : "Doet mee";
          const balanceSourceLabel = account.balanceSource === "manual" ? "Handmatig" : "Laatste import";
          return (
            <article key={account.id} className="min-w-0 rounded-[var(--radius-lg)] border border-border bg-white p-3 shadow-[var(--shadow-sm)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-brand"><Link href={`/rekeningen/${account.id}`} className="hover:underline">{account.name}</Link></h2>
                  <p className="mt-1 text-xs text-[var(--color-text-muted)]">{account.iban}</p>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <StatusBadge tone={account.type === "spaarrekening" ? "info" : account.type === "beleggingsrekening" ? "warning" : account.type === "schuld" ? "error" : "success"}>{typeLabel}</StatusBadge>
                  <ButtonLink href={`/rekeningen/${account.id}`} variant="secondary" size="sm">Open rekening</ButtonLink>
                </div>
              </div>
              {canMutate ? (
                <form action={toggleAccountExcludeFromImport} className="mt-3 flex items-center gap-2">
                  <input type="hidden" name="accountId" value={account.id} />
                  <button
                    type="submit"
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 ${account.excluded_from_import ? "bg-[var(--color-warning)]" : "bg-emerald-600"}`}
                    role="switch"
                    aria-checked={!account.excluded_from_import}
                    aria-label={account.excluded_from_import ? "Sluit uit van import" : "Sluit in bij import"}
                  >
                    <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${account.excluded_from_import ? "translate-x-4" : "translate-x-0"}`} />
                  </button>
                  <span className="text-[0.68rem] font-semibold text-[var(--color-text-subtle)]">
                    {account.excluded_from_import ? "Uitgesloten van import" : "Meedoen aan import"}
                  </span>
                </form>
              ) : null}
              <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-md bg-[var(--color-surface)] p-2">
                  <dt className="text-[var(--color-text-subtle)]">Bankstand</dt>
                  <dd className="mt-1 font-semibold text-brand">{formatCurrency(account.balance)}</dd>
                </div>
                <div className="rounded-md bg-[var(--color-surface)] p-2">
                  <dt className="text-[var(--color-text-subtle)]">Type</dt>
                  <dd className="mt-1 font-semibold">{typeLabel}</dd>
                </div>
                <div className="rounded-md bg-[var(--color-surface)] p-2">
                  <dt className="text-[var(--color-text-subtle)]">Import</dt>
                  <dd className={`mt-1 font-semibold ${account.excluded_from_import ? "text-amber-700" : "text-emerald-700"}`}>{importLabel}</dd>
                </div>
                <div className="rounded-md bg-[var(--color-surface)] p-2">
                  <dt className="text-[var(--color-text-subtle)]">Controle</dt>
                  <dd className={`mt-1 font-semibold ${Math.abs(balanceDifference) < 0.01 ? "text-emerald-700" : "text-amber-700"}`}>
                    {Math.abs(balanceDifference) < 0.01 ? "Klopt" : `${formatCurrency(balanceDifference)} verschil`}
                  </dd>
                </div>
              </dl>
              <div className="mt-3 rounded-md border border-border bg-white p-2 text-[0.7rem] text-[var(--color-text-subtle)]">
                <p>Saldo: {balanceSourceLabel}{account.balanceDate ? ` per ${formatDate(account.balanceDate)}` : ""}.</p>
                {account.balanceCheckedAt ? <p>Controle bijgewerkt: {formatDate(account.balanceCheckedAt)}.</p> : null}
              </div>
              {canMutate ? (
              <details className="mt-3 rounded-md border border-border bg-white p-2">
                <summary className="cursor-pointer text-xs font-semibold text-brand">Bewerken en aliases</summary>
                <form action={saveAccountDetails} className="mt-3 min-w-0 overflow-hidden rounded-md bg-[var(--color-surface)] p-2">
                  <input type="hidden" name="accountId" value={account.id} />
                  <input type="hidden" name="accountIban" value={account.iban} />
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-xs font-semibold text-brand">Rekening bijwerken</h3>
                    <span className="max-w-full truncate rounded-md bg-white px-2 py-1 text-[0.68rem] font-semibold text-[var(--color-text-muted)]">{account.iban}</span>
                  </div>
                  <div className="grid gap-3">
                    <div>
                      <FieldLabel htmlFor={`name-${account.id}`}>Displaynaam in app</FieldLabel>
                      <Input id={`name-${account.id}`} name="name" defaultValue={account.name} autoComplete="off" />
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2 sm:items-end">
                      <div>
                        <FieldLabel htmlFor={`type-${account.id}`}>Type</FieldLabel>
                        <Select id={`type-${account.id}`} name="type" defaultValue={account.type}>
                          <option value="betaalrekening">Betaalrekening</option>
                          <option value="spaarrekening">Spaarrekening</option>
                          <option value="beleggingsrekening">Beleggingsrekening</option>
                          <option value="schuld">Schuld (negatief saldo)</option>
                        </Select>
                      </div>
                      <div>
                        <FieldLabel htmlFor={`balance-${account.id}`}>Bankstand</FieldLabel>
                        <Input id={`balance-${account.id}`} name="balance" inputMode="decimal" defaultValue={String(account.balance).replace(".", ",")} />
                      </div>
                      <div>
                        <FieldLabel htmlFor={`date-${account.id}`}>Peildatum</FieldLabel>
                        <Input id={`date-${account.id}`} name="balanceDate" type="date" defaultValue={account.balanceDate ?? new Date().toISOString().slice(0, 10)} />
                      </div>
                      <SubmitButton variant="primary" pendingLabel="Opslaan..." className="w-full sm:col-span-2">Opslaan</SubmitButton>
                    </div>
                  </div>
                  <FieldHint>Deze displaynaam wordt gebruikt in overzichten en transacties. De bankstand wordt als peildatum opgeslagen en maakt geen uitgavetransactie aan.</FieldHint>
                </form>
                <form action={saveAccountAlias} className="mt-2 min-w-0 overflow-hidden rounded-md bg-[var(--color-surface)] p-2">
                  <input type="hidden" name="accountId" value={account.id} />
                  <div className="grid gap-2 sm:grid-cols-2 sm:items-end">
                    <div>
                      <FieldLabel htmlFor={`alias-${account.id}`}>Alias IBAN/rekeningnummer</FieldLabel>
                      <Input id={`alias-${account.id}`} name="alias" placeholder={account.iban} />
                    </div>
                    <div>
                      <FieldLabel htmlFor={`alias-label-${account.id}`}>Omschrijving alias</FieldLabel>
                      <Input id={`alias-label-${account.id}`} name="label" placeholder="Oude export" />
                    </div>
                    <SubmitButton variant="secondary" pendingLabel="Toevoegen..." className="w-full sm:col-span-2">Alias toevoegen</SubmitButton>
                  </div>
                  <FieldHint>Gebruik aliases alleen voor extra IBANs of oude rekeningnummers die bij deze rekening horen.</FieldHint>
                  {accountAliases.length ? (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {accountAliases.map((alias) => (
                        <span key={alias.id} className="max-w-full truncate rounded-md bg-white px-2 py-1 text-[0.68rem] font-semibold text-[var(--color-text-muted)]">{alias.label ? `${alias.label}: ` : ""}{alias.alias}</span>
                      ))}
                    </div>
                  ) : null}
                </form>
              </details>
              ) : null}
            </article>
          );
        })}
      </section>
    </>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-white p-3 shadow-[var(--shadow-sm)]">
      <p className="text-[0.68rem] font-bold uppercase tracking-wide text-[var(--color-text-subtle)]">{label}</p>
      <p className="mt-1 text-lg font-semibold text-brand">{value}</p>
    </div>
  );
}
