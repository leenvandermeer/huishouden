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
      />
      {!canMutate ? <div className="mb-3"><ReadonlyNotice /></div> : null}

      <section className="mb-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,0.65fr)]">
        {canMutate ? (
        <form action={saveRule} className="rounded-[var(--radius-lg)] border border-border bg-white p-3 shadow-[var(--shadow-sm)]">
          <h2 className="text-sm font-semibold text-brand">Nieuwe herkenningsregel</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem_minmax(0,1fr)_auto] sm:items-end">
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

        <section className="rounded-[var(--radius-lg)] border border-border bg-[var(--color-surface)] p-3">
          <h2 className="text-sm font-semibold text-brand">Hoe werkt dit?</h2>
          <div className="mt-2 grid gap-2 text-xs text-[var(--color-text-muted)]">
            <p className="rounded-md bg-white p-2">Een regel herkent tekst op je bankafschrift en kiest daarna automatisch een categorie.</p>
          </div>
        </section>
      </section>

      {canMutate ? (
      <section className="mb-3">
        <details className="rounded-[var(--radius-lg)] border border-border bg-white p-3 shadow-[var(--shadow-sm)]">
          <summary className="cursor-pointer text-sm font-semibold text-brand">Bestaande transacties bijwerken</summary>
          <form action={applyRules} className="mt-3 rounded-md bg-[var(--color-brand-subtle)] p-3">
          <div className="flex h-full flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-brand">Alle regels opnieuw toepassen</h2>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
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

      <section className="rounded-[var(--radius-lg)] border border-border bg-white shadow-[var(--shadow-sm)]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2">
          <h2 className="text-sm font-semibold text-brand">Alle herkenningsregels</h2>
          <StatusBadge tone="info">{activeRules.length} actief</StatusBadge>
        </div>
        <div className="divide-y divide-border">
          {activeRules.length ? (
            activeRules.map((rule) => (
              <article key={rule.id} className="grid gap-2 p-3">
                {canMutate ? (
                <form action={saveRule} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_10rem_minmax(0,1fr)_auto] sm:items-end">
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
                  <div className="flex flex-wrap items-center gap-2 text-[0.7rem] text-[var(--color-text-subtle)]">
                    <StatusBadge tone={rule.active ? "success" : "neutral"}>{rule.active ? "Actief" : "Uit"}</StatusBadge>
                    <span>{getScopeLabel(rule.matchScope)}</span>
                    <span>{getCategoryLabel(categories, rule.categoryId)}</span>
                  </div>
                  {canMutate ? <RuleDeleteButton ruleId={rule.id} active={rule.active} /> : null}
                </div>
              </article>
            ))
          ) : (
            <p className="p-3 text-xs text-[var(--color-text-muted)]">Nog geen regels. Maak bijvoorbeeld: Albert Heijn hoort bij Boodschappen.</p>
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
    <div className="rounded-md bg-[var(--color-surface)] p-2 text-xs">
      <dt className="text-[var(--color-text-subtle)]">{label}</dt>
      <dd className="mt-1 font-semibold text-[var(--color-text)]">{value}</dd>
    </div>
  );
}
