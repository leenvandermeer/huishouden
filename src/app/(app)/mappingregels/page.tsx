import { Button, ButtonLink, FieldLabel, Input, PageHeader, Select, StatusBadge } from "@/components/ui";
import { ReadonlyNotice } from "@/components/finance/readonly-notice";
import { applyRules, deleteRule, saveRule } from "@/modules/finance/actions";
import { requireUser } from "@/modules/auth/service";
import { getFinanceMetadata } from "@/modules/finance/data-source";
import { getCategorizationRulesLightFromDatabase, getTransactionCountFromDatabase } from "@/modules/finance/repository";

export default async function MappingRulesPage() {
  const [user, { categories }, rules, transactionCount] = await Promise.all([
    requireUser(),
    getFinanceMetadata(),
    getCategorizationRulesLightFromDatabase().catch(() => []),
    getTransactionCountFromDatabase(),
  ]);
  const canMutate = user.role !== "readonly";
  const activeCategories = categories.filter((category) => !category.validTo);
  const ruleCategories = activeCategories.filter((category) => category.kind !== "interne_overboeking");
  const activeRules = rules.filter((rule) => rule.active);

  return (
    <>
      <PageHeader
        eyebrow="Automatisch indelen"
        title="Herkenningsregels"
        description={canMutate ? "Laat betalingen van dezelfde winkel automatisch in de juiste categorie komen." : "Je kunt de regels bekijken, maar niet aanpassen."}
        actions={<ButtonLink href="/categorieen" variant="secondary">Categorieën</ButtonLink>}
        stats={[
          { label: "Actieve regels", value: activeRules.length.toLocaleString("nl-NL"), detail: "worden toegepast" },
          { label: "Doelcategorieën", value: ruleCategories.length.toLocaleString("nl-NL"), detail: "beschikbaar" },
          { label: "Transacties", value: transactionCount.toLocaleString("nl-NL"), detail: "opgeslagen" },
        ]}
      />
      {!canMutate ? <div className="mb-8"><ReadonlyNotice /></div> : null}

      <section className="mb-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,0.6fr)]">
        {canMutate ? (
        <form action={saveRule} className="border border-border bg-[var(--color-panel-strong)] p-5 md:p-6">
          <h2 className={CARD_LABEL}>Nieuwe herkenningsregel</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_10rem_minmax(0,1fr)_auto] sm:items-end">
            <div>
              <FieldLabel htmlFor="pattern">Herkenning</FieldLabel>
              <Input id="pattern" name="pattern" placeholder="Albert Heijn" required />
            </div>
            <div>
              <FieldLabel htmlFor="matchScope">Zoekt in</FieldLabel>
              <Select id="matchScope" name="matchScope" defaultValue="all">
                <option value="all">Alles</option>
                <option value="counterparty">Tegenpartij</option>
                <option value="description">Omschrijving</option>
                <option value="counter_account">Tegenrekening</option>
                <option value="counterparty_description">Tegenpartij + omschrijving</option>
                <option value="counterparty_counter_account">Tegenpartij + tegenrekening</option>
                <option value="description_counter_account">Omschrijving + tegenrekening</option>
              </Select>
            </div>
            <div>
              <FieldLabel htmlFor="ruleCategory">Categorie</FieldLabel>
              <Select id="ruleCategory" name="categoryId" defaultValue="boodschappen">
                {ruleCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </div>
            <Button type="submit" variant="primary">
              Regel opslaan
            </Button>
          </div>
        </form>
        ) : null}

        <section className="border border-border bg-[var(--color-surface)] p-5 md:p-6">
          <h2 className={CARD_LABEL}>Hoe werkt dit?</h2>
          <p className="mt-4 font-[family-name:var(--font-serif-house)] text-[0.95rem] leading-7 text-[var(--color-text-muted)]">Een regel herkent tekst op je bankafschrift en kiest daarna automatisch een categorie.</p>
        </section>
      </section>

      {canMutate ? (
      <section className="mb-12">
        <details className="border border-border bg-[var(--color-panel-strong)] p-5 md:p-6">
          <summary className="cursor-pointer text-[0.66rem] uppercase tracking-[0.2em] text-[var(--color-text)]">Bestaande transacties bijwerken</summary>
          <form action={applyRules} className="mt-4 border-t border-border pt-4">
          <div className="flex h-full flex-wrap items-center justify-between gap-4">
            <div className="max-w-2xl">
              <h2 className="text-sm font-medium text-[var(--color-text)]">Alle regels opnieuw toepassen</h2>
              <p className="mt-1 text-xs leading-5 text-[var(--color-text-muted)]">
                Alleen nodig nadat je regels hebt aangepast en bestaande transacties opnieuw wilt indelen. Nieuwe imports passen actieve regels automatisch toe. Actief: {activeRules.length} regels, transacties: {transactionCount}.
              </p>
            </div>
            <Button type="submit" variant="secondary">
              Opnieuw toepassen
            </Button>
          </div>
          </form>
        </details>
      </section>
      ) : null}

      <section className="mb-12">
        <div className="section-head">
          <div>
            <h2>Alle herkenningsregels</h2>
            <p className="mt-2">Pas aan waar een regel op let en in welke categorie de betaling terechtkomt.</p>
          </div>
          <StatusBadge tone="info">{activeRules.length} actief</StatusBadge>
        </div>
        <div className="divide-y divide-border border-y border-border border-t-[var(--color-text)]">
          {activeRules.length ? (
            activeRules.map((rule) => (
              <article key={rule.id} className="grid gap-3 px-1 py-5">
                {canMutate ? (
                <form action={saveRule} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem_minmax(0,1fr)_auto] sm:items-end">
                  <input type="hidden" name="ruleId" value={rule.id} />
                  <div>
                    <FieldLabel htmlFor={`pattern-${rule.id}`}>Herkenning</FieldLabel>
                    <Input id={`pattern-${rule.id}`} name="pattern" defaultValue={rule.pattern} disabled={!rule.active} />
                  </div>
                  <div>
                    <FieldLabel htmlFor={`scope-${rule.id}`}>Zoekt in</FieldLabel>
                    <Select id={`scope-${rule.id}`} name="matchScope" defaultValue={rule.matchScope} disabled={!rule.active}>
                      <option value="all">Alles</option>
                      <option value="counterparty">Tegenpartij</option>
                      <option value="description">Omschrijving</option>
                      <option value="counter_account">Tegenrekening</option>
                      <option value="counterparty_description">Tegenpartij + omschrijving</option>
                      <option value="counterparty_counter_account">Tegenpartij + tegenrekening</option>
                      <option value="description_counter_account">Omschrijving + tegenrekening</option>
                    </Select>
                  </div>
                  <div>
                    <FieldLabel htmlFor={`rule-category-${rule.id}`}>Categorie</FieldLabel>
                    <Select id={`rule-category-${rule.id}`} name="categoryId" defaultValue={rule.categoryId} disabled={!rule.active}>
                      {ruleCategories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <Button type="submit" size="sm" disabled={!rule.active}>
                    Wijzigen
                  </Button>
                </form>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_10rem_minmax(0,1fr)]">
                    <Info label="Herkenning" value={rule.pattern} />
                    <Info label="Zoekt in" value={getScopeLabel(rule.matchScope)} />
                    <Info label="Categorie" value={getCategoryLabel(categories, rule.categoryId)} />
                  </div>
                )}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-subtle)]">
                    <StatusBadge tone={rule.active ? "success" : "neutral"}>{rule.active ? "Actief" : "Uit"}</StatusBadge>
                    <span>{getScopeLabel(rule.matchScope)}</span>
                    <span>{getCategoryLabel(categories, rule.categoryId)}</span>
                  </div>
                  {canMutate ? <RuleDeleteButton ruleId={rule.id} active={rule.active} /> : null}
                </div>
              </article>
            ))
          ) : (
            <p className="px-1 py-6 text-sm text-[var(--color-text-muted)]">Nog geen regels. Maak bijvoorbeeld: Albert Heijn hoort bij Boodschappen.</p>
          )}
        </div>
      </section>

    </>
  );
}

function RuleDeleteButton({ ruleId, active }: { ruleId: string; active: boolean }) {
  if (!active) return <StatusBadge tone="neutral">Uitgeschakeld</StatusBadge>;

  return (
    <form action={deleteRule}>
      <input type="hidden" name="ruleId" value={ruleId} />
      <Button type="submit" size="sm" variant="danger">
        Verwijderen
      </Button>
    </form>
  );
}

function getCategoryLabel(categories: Array<{ id: string; name: string }>, categoryId: string) {
  return categories.find((category) => category.id === categoryId)?.name ?? "Onbekend";
}

function getScopeLabel(scope: string) {
  if (scope === "counterparty") return "Tegenpartij";
  if (scope === "description") return "Omschrijving";
  if (scope === "counter_account") return "Tegenrekening";
  if (scope === "counterparty_description") return "Tegenpartij + omschrijving";
  if (scope === "counterparty_counter_account") return "Tegenpartij + tegenrekening";
  if (scope === "description_counter_account") return "Omschrijving + tegenrekening";
  return "Alles";
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-l border-border py-1 pl-3 text-sm">
      <dt className="text-[0.62rem] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">{label}</dt>
      <dd className="mt-1 text-[var(--color-text)]">{value}</dd>
    </div>
  );
}

const CARD_LABEL = "text-[0.62rem] font-normal uppercase tracking-[0.22em] text-[var(--color-text-muted)]";
