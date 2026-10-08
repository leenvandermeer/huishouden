import Link from "next/link";
import { AlertCircle, CalendarDays, Copy, Sparkles, Trash2, WalletCards } from "lucide-react";
import { ProgressBar } from "@/components/finance/progress-bar";
import { CashflowBudgetBridge } from "@/components/finance/cashflow-budget-bridge";
import { ReadonlyNotice } from "@/components/finance/readonly-notice";
import { Button, ButtonLink, FieldLabel, Input, PageHeader, PeriodPager, Select, StatusBadge, SubmitButton } from "@/components/ui";
import { formatCurrency, formatMonthLabel } from "@/lib/format";
import { applyBudgetSuggestions, copyBudget, deleteAnnualBudget, deleteBudget, saveAnnualBudget, saveBudget } from "@/modules/finance/actions";
import { getAnnualBudgets, getBudgets, getFinanceDataset } from "@/modules/finance/data-source";
import { requireUser } from "@/modules/auth/service";
import { getBudgetSuggestions, getCashflowByMonth, getCategoryName, parseBudgetSuggestionWindow } from "@/modules/finance/reporting";
import { getWeeklyBudgetGuidance } from "@/modules/finance/budget-guidance";
import { buildCashflowBudgetAdvice } from "@/modules/finance/cashflow-budget-advice";
import { getForwardPlanningFromDatabase } from "@/modules/finance/forward-planning-service";
import { buildBudgetCopyPreview } from "@/modules/finance/budget-copy";
import type { AnnualBudget, Category } from "@/modules/finance/types";
import { buildBudgetGroups } from "@/modules/finance/budget-groups";

interface BudgetsPageProps {
  searchParams?: Promise<{ applied?: string; copied?: string; month?: string; source?: string; view?: string; suggestionMonths?: string; copySource?: string; year?: string }>;
}

type BudgetView = "overzicht" | "instellingen" | "jaar";

export default async function BudgetsPage({ searchParams }: BudgetsPageProps) {
  const params = (await searchParams) ?? {};
  const [user, dataset, planning] = await Promise.all([requireUser(), getFinanceDataset(), getForwardPlanningFromDatabase(30)]);
  const canMutate = user.role !== "readonly";
  const months = Array.from(new Set(dataset.transactions.map((transaction) => transaction.date.slice(0, 7)))).sort().reverse();
  const selectedMonth = params.month && months.includes(params.month) ? params.month : months[0] ?? new Date().toISOString().slice(0, 7);
  const selectedMonthIndex = months.indexOf(selectedMonth);
  const previousBudgetMonth = selectedMonthIndex >= 0 ? months[selectedMonthIndex + 1] : undefined;
  const nextBudgetMonth = selectedMonthIndex > 0 ? months[selectedMonthIndex - 1] : undefined;
  const selectedView: BudgetView = params.view === "jaar" ? "jaar" : canMutate && params.view === "instellingen" ? "instellingen" : "overzicht";
  const suggestionMonths = parseBudgetSuggestionWindow(params.suggestionMonths);
  const years = Array.from(new Set([...dataset.transactions.map((transaction) => Number(transaction.date.slice(0, 4))), new Date().getFullYear()])).sort((a, b) => b - a);
  const selectedYear = params.year && years.includes(Number(params.year)) ? Number(params.year) : Number(selectedMonth.slice(0, 4));
  const selectedYearIndex = years.indexOf(selectedYear);
  const budgets = await getBudgets(selectedMonth);
  const annualBudgets = await getAnnualBudgets(selectedYear);
  const copied = typeof params.copied === "string" ? params.copied : undefined;
  const copiedSource = typeof params.source === "string" ? params.source : undefined;
  const suggestions = getBudgetSuggestions(dataset.transactions, dataset.categories, selectedMonth, suggestionMonths);
  const guidance = getWeeklyBudgetGuidance(budgets, dataset.categories, selectedMonth);
  const selectedCashflow = getCashflowByMonth(dataset.transactions).find((row) => row.month === selectedMonth);
  const suggestionByCategory = new Map(suggestions.map((suggestion) => [suggestion.categoryId, suggestion]));
  const budgetGroups = buildBudgetGroups(budgets, dataset.categories);
  const budgetCategories = dataset.categories.filter((category) => !category.validTo && ["vaste_last", "variabele_uitgave", "reservering"].includes(category.kind));
  const annualPlannedIds = new Set(annualBudgets.map((budget) => budget.categoryId));
  const newAnnualBudgetCategories = budgetCategories.filter((category) => !annualPlannedIds.has(category.id));
  const copySource = params.copySource && months.includes(params.copySource) && params.copySource !== selectedMonth ? params.copySource : undefined;
  const sourceBudgets = copySource ? await getBudgets(copySource) : [];
  const copyPreview = copySource ? buildBudgetCopyPreview(sourceBudgets.map((budget) => ({ ...budget, planned: budget.basePlanned ?? budget.planned })), budgets.map((budget) => ({ ...budget, planned: budget.basePlanned ?? budget.planned })), new Set(budgetCategories.map((category) => category.id))) : undefined;
  const plannedCategoryIds = new Set(budgets.filter((budget) => budget.planned > 0).map((budget) => budget.categoryId));
  const newBudgetCategories = budgetCategories.filter((category) => !plannedCategoryIds.has(category.id));
  const missingVariableSuggestions = suggestions.filter((suggestion) => dataset.categories.find((category) => category.id === suggestion.categoryId)?.kind === "variabele_uitgave" && !plannedCategoryIds.has(suggestion.categoryId));
  const totalPlanned = budgets.reduce((sum, budget) => sum + budget.planned, 0);
  const totalActual = selectedCashflow?.spendableExpenses ?? budgets.reduce((sum, budget) => sum + budget.actual, 0);
  const unplannedActual = Math.max(totalActual - budgets.reduce((sum, budget) => sum + budget.actual, 0), 0);
  const cashflowAdvice = buildCashflowBudgetAdvice({ historicalNet: selectedCashflow?.spendableNet, planning: planning.model, budgets, categories: dataset.categories });

  return (
    <>
      <PageHeader
        eyebrow="Budgetten"
        title={selectedView === "overzicht" ? "Budgetten" : selectedView === "jaar" ? "Jaarbudgetten" : "Budget aanpassen"}
        description={canMutate ? (selectedView === "overzicht" ? "Zie wat je wilde uitgeven en wat er nog over is." : selectedView === "jaar" ? "Bewaak grotere uitgaven en reserveringen over een heel kalenderjaar." : "Kies een bedrag per categorie.") : "Je kunt de budgetten bekijken, maar niet aanpassen."}
        actions={(
          selectedView === "jaar" ? <PeriodPager
            label={String(selectedYear)}
            previousHref={years[selectedYearIndex + 1] ? `/budgetten?view=jaar&year=${years[selectedYearIndex + 1]}` : undefined}
            nextHref={selectedYearIndex > 0 ? `/budgetten?view=jaar&year=${years[selectedYearIndex - 1]}` : undefined}
            previousLabel={years[selectedYearIndex + 1] ? String(years[selectedYearIndex + 1]) : "Geen eerder jaar"}
            nextLabel={selectedYearIndex > 0 ? String(years[selectedYearIndex - 1]) : "Geen later jaar"}
          /> : <PeriodPager
            label={formatMonthLabel(selectedMonth)}
            previousHref={previousBudgetMonth ? budgetMonthHref(previousBudgetMonth, selectedView, suggestionMonths) : undefined}
            nextHref={nextBudgetMonth ? budgetMonthHref(nextBudgetMonth, selectedView, suggestionMonths) : undefined}
            previousLabel={previousBudgetMonth ? formatMonthLabel(previousBudgetMonth) : "Geen eerdere maand"}
            nextLabel={nextBudgetMonth ? formatMonthLabel(nextBudgetMonth) : "Geen latere maand"}
          />
        )}
      />
      {!canMutate ? <div className="mb-3"><ReadonlyNotice /></div> : null}

      {copied ? (
        <div className="mb-3 rounded-md border border-border bg-[var(--color-brand-subtle)] p-3 text-xs text-brand">
          Budgetplan gekopieerd: {copied} categorieen overgenomen{copiedSource ? ` van ${copiedSource}` : ""} naar {selectedMonth}.
        </div>
      ) : null}
      {params.applied ? (
        <div className="mb-3 rounded-md border border-border bg-[var(--color-success-subtle)] p-3 text-xs text-[var(--color-success)]">
          {params.applied === "0" ? "Alle bruikbare voorstellen stonden al ingesteld." : `${params.applied} budgetvoorstellen zijn toegevoegd.`}
        </div>
      ) : null}

      <section className="mb-3 rounded-[var(--radius-lg)] border border-border bg-[var(--color-surface)] p-3">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
          {selectedView === "jaar" ? <form action="/budgetten" className="grid gap-2 sm:grid-cols-[minmax(10rem,14rem)_auto] sm:items-end">
            <input type="hidden" name="view" value="jaar" />
            <div><FieldLabel htmlFor="selectedYear">Budgetjaar</FieldLabel><Select id="selectedYear" name="year" defaultValue={String(selectedYear)}>{years.map((year) => <option key={year} value={year}>{year}</option>)}</Select></div>
            <Button type="submit" variant="secondary"><CalendarDays aria-hidden="true" size={14} /> Tonen</Button>
          </form> : <form action="/budgetten" className="grid gap-2 sm:grid-cols-[minmax(10rem,14rem)_auto] sm:items-end">
            <input type="hidden" name="view" value={selectedView} />
            <input type="hidden" name="suggestionMonths" value={suggestionMonths} />
            <div>
              <FieldLabel htmlFor="selectedMonth">Budgetmaand</FieldLabel>
              <Select id="selectedMonth" name="month" defaultValue={selectedMonth} disabled={months.length === 0}>
                {months.length ? months.map((month) => <option key={month} value={month}>{formatMonthLabel(month)}</option>) : <option value={selectedMonth}>{selectedMonth}</option>}
              </Select>
            </div>
            <Button type="submit" variant="secondary">
              <CalendarDays aria-hidden="true" size={14} /> Tonen
            </Button>
          </form>}

          <div className="flex flex-wrap items-end gap-2">
            {selectedView !== "jaar" ? <form action="/budgetten" className="flex items-end gap-2">
              <input type="hidden" name="month" value={selectedMonth} />
              <input type="hidden" name="view" value={selectedView} />
              <div>
                <FieldLabel htmlFor="suggestionMonths">Voorstellen op</FieldLabel>
                <Select id="suggestionMonths" name="suggestionMonths" defaultValue={String(suggestionMonths)}>
                  <option value="3">3 maanden</option>
                  <option value="6">6 maanden</option>
                </Select>
              </div>
              <Button type="submit" size="sm" variant="secondary">Bereken</Button>
            </form> : null}
            {canMutate ? (
              <nav className="flex rounded-md border border-border bg-white p-1 text-xs font-semibold shadow-[var(--shadow-sm)]" aria-label="Budgetweergave">
                <ViewLink href={budgetMonthHref(selectedMonth, "overzicht", suggestionMonths)} active={selectedView === "overzicht"}>Overzicht</ViewLink>
                <ViewLink href={budgetMonthHref(selectedMonth, "instellingen", suggestionMonths)} active={selectedView === "instellingen"}>Instellingen</ViewLink>
                <ViewLink href={`/budgetten?view=jaar&year=${selectedYear}`} active={selectedView === "jaar"}>Jaar</ViewLink>
              </nav>
            ) : null}
          </div>
        </div>
      </section>

      {selectedView === "jaar" ? (
        <AnnualBudgetsSection
          year={selectedYear}
          budgets={annualBudgets}
          categories={dataset.categories}
          availableCategories={newAnnualBudgetCategories}
          canMutate={canMutate}
        />
      ) : <>

      <section className="budget-week mb-3" aria-labelledby="week-budget-title">
        <div className="budget-week__main">
          <span className="budget-week__icon"><WalletCards aria-hidden="true" size={20} /></span>
          <div>
            <p>{guidance.isCurrentMonth ? "Vrij te besteden deze week" : "Gemiddeld vrij per week"}</p>
            <h2 id="week-budget-title">{guidance.hasVariableBudgets ? formatCurrency(guidance.amount) : "Nog niet berekend"}</h2>
            <span>{guidance.hasVariableBudgets ? `${formatCurrency(Math.max(guidance.remainingThisMonth, 0))} over voor variabele uitgaven deze maand.` : "Voeg je voorgestelde budgetten toe om een weekbedrag te zien."}</span>
          </div>
        </div>
        {guidance.hasVariableBudgets ? <p className="budget-week__explain">Verdeeld over {guidance.daysCovered} {guidance.daysCovered === 1 ? "dag" : "dagen"}. Vaste lasten tellen niet mee.</p> : null}
        {guidance.warnings.length ? (
          <div className="budget-week__warnings">
            {guidance.warnings.map((warning) => (
              <Link key={warning.title} href={`/transacties?month=${selectedMonth}&kind=uitgaven&categoryId=${encodeURIComponent(warning.categoryId ?? "")}`}>
                <AlertCircle aria-hidden="true" size={16} />
                <span><strong>{warning.title}</strong><small>{warning.detail}</small></span>
              </Link>
            ))}
          </div>
        ) : null}
      </section>

      <CashflowBudgetBridge advice={cashflowAdvice} />

      <section className="mb-3 grid gap-3 sm:grid-cols-3">
        <SummaryCard label="Gepland" value={formatCurrency(totalPlanned)} />
        <SummaryCard label="Werkelijk geld eruit" value={formatCurrency(totalActual)} />
        <SummaryCard label="Uitgaven zonder budget" value={formatCurrency(unplannedActual)} />
      </section>

      {selectedView === "overzicht" ? (
        <>
        {missingVariableSuggestions.length ? (
          <section className="budget-proposals mb-3" aria-labelledby="budget-proposals-title">
            <div className="budget-proposals__intro">
              <span><Sparkles aria-hidden="true" size={18} /></span>
              <div>
                <h2 id="budget-proposals-title">Voorstellen op basis van je uitgaven</h2>
                <p>Gebaseerd op je vorige {suggestionMonths} maanden. Jij beslist wat je gebruikt.</p>
              </div>
              {canMutate ? (
                <form action={applyBudgetSuggestions}>
                  <input type="hidden" name="month" value={selectedMonth} />
                  <input type="hidden" name="suggestionMonths" value={suggestionMonths} />
                  <SubmitButton size="sm" pendingLabel="Toevoegen...">Voeg alle toe</SubmitButton>
                </form>
              ) : null}
            </div>
            <div className="budget-proposals__list">
              {missingVariableSuggestions.slice(0, 3).map((suggestion) => (
                <article key={suggestion.categoryId}>
                  <span><strong>{getCategoryName(dataset.categories, suggestion.categoryId)}</strong><small>{suggestion.sampleSize} eerdere maanden</small></span>
                  <strong className="money-value">{formatCurrency(suggestion.amount)}<small> per maand</small></strong>
                  {canMutate ? (
                    <form action={saveBudget}>
                      <input type="hidden" name="month" value={selectedMonth} />
                      <input type="hidden" name="categoryId" value={suggestion.categoryId} />
                      <input type="hidden" name="planned" value={String(suggestion.amount).replace(".", ",")} />
                      <SubmitButton size="sm" variant="secondary" pendingLabel="Bezig...">Gebruiken</SubmitButton>
                    </form>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        ) : null}
        <section className="rounded-[var(--radius-lg)] border border-border bg-white shadow-[var(--shadow-sm)]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2">
            <div>
              <h2 className="text-xs font-semibold text-brand">Budgetten {formatMonthLabel(selectedMonth)}</h2>
              <p className="mt-0.5 text-[0.68rem] text-[var(--color-text-subtle)]">{canMutate ? "Bedragen aanpassen doe je via de instellingenweergave." : "Alleen bekijken. Wijzigen is verborgen voor alleen-lezen gebruikers."}</p>
            </div>
            {canMutate ? <ButtonLink href={budgetMonthHref(selectedMonth, "instellingen", suggestionMonths)} size="sm">Instellingen</ButtonLink> : null}
          </div>
          <div className="grid gap-3 p-3">
            {budgetGroups.length ? (
              budgetGroups.map((group) => (
                <details key={group.id} className="rounded-md border border-border bg-[var(--color-surface)]" open={budgetGroups.length <= 4}>
                  <summary className="grid cursor-pointer list-none gap-2 p-3 marker:content-none sm:grid-cols-[minmax(0,1fr)_repeat(3,auto)] sm:items-center">
                    <strong className="text-sm text-brand">{group.label}<small className="ml-2 font-normal text-[var(--color-text-muted)]">{group.budgets.length} {group.budgets.length === 1 ? "categorie" : "categorieën"}</small></strong>
                    <span className="text-xs text-[var(--color-text-muted)]">Budget <strong className="text-brand">{formatCurrency(group.planned)}</strong></span>
                    <span className="text-xs text-[var(--color-text-muted)]">Besteed <strong className="text-brand">{formatCurrency(group.actual)}</strong></span>
                    <StatusBadge tone={group.remaining < 0 ? "warning" : "success"}>{group.remaining < 0 ? `${formatCurrency(Math.abs(group.remaining))} over` : `${formatCurrency(group.remaining)} over`}</StatusBadge>
                  </summary>
                  <div className="grid gap-2 border-t border-border p-3 md:grid-cols-2 xl:grid-cols-3">
                    {group.budgets.map((budget) => <BudgetOverviewCard key={`${budget.month}-${budget.categoryId}`} label={getCategoryName(dataset.categories, budget.categoryId)} budget={budget} suggestion={suggestionByCategory.get(budget.categoryId)} />)}
                  </div>
                </details>
              ))
            ) : (
              <p className="text-xs text-[var(--color-text-muted)]">Nog geen budgetten voor deze maand.</p>
            )}
          </div>
        </section>
        </>
      ) : null}

      {selectedView === "instellingen" ? (
        <>
      <section className="mb-3 rounded-[var(--radius-lg)] border border-border bg-white p-3 shadow-[var(--shadow-sm)]">
        <form action="/budgetten" className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end xl:max-w-xl">
          <input type="hidden" name="month" value={selectedMonth} />
          <input type="hidden" name="view" value="instellingen" />
          <input type="hidden" name="suggestionMonths" value={suggestionMonths} />
          <div>
            <FieldLabel htmlFor="copySource">Budgetplan kopiëren van</FieldLabel>
            <Select id="copySource" name="copySource" defaultValue={copySource ?? previousMonth(selectedMonth, months)} disabled={months.length < 2}>
              {months.length > 1 ? (
                months.filter((month) => month !== selectedMonth).map((month) => (
                  <option key={month} value={month}>{formatMonthLabel(month)}</option>
                ))
              ) : (
                <option value="">Geen bronmaand</option>
              )}
            </Select>
          </div>
          <Button type="submit" size="sm" disabled={months.length < 2}>
            <Copy aria-hidden="true" size={14} /> Voorbeeld bekijken
          </Button>
        </form>
        {copyPreview ? (
          <div className="mt-4 rounded-md border border-border bg-[var(--color-surface)] p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-brand">Controle vóór kopiëren</h3>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  {copyPreview.newCount} nieuw · {copyPreview.conflictCount} overschrijven · {copyPreview.sameCount} ongewijzigd · {copyPreview.invalidCount} overgeslagen
                </p>
              </div>
              <form action={copyBudget}>
                <input type="hidden" name="sourceMonth" value={copySource} />
                <input type="hidden" name="targetMonth" value={selectedMonth} />
                <input type="hidden" name="suggestionMonths" value={suggestionMonths} />
                <input type="hidden" name="confirmCopy" value="yes" />
                <SubmitButton size="sm" pendingLabel="Kopiëren..." disabled={copyPreview.copyCount === 0}>
                  Bevestig {copyPreview.copyCount} wijzigingen
                </SubmitButton>
              </form>
            </div>
            {copyPreview.conflictCount || copyPreview.invalidCount ? (
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {copyPreview.rows.filter((row) => row.status === "conflict" || row.status === "invalid").map((row) => (
                  <div key={row.categoryId} className="rounded-md border border-border bg-white p-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <strong className="text-brand">{getCategoryName(dataset.categories, row.categoryId)}</strong>
                      <StatusBadge tone={row.status === "conflict" ? "warning" : "neutral"}>{row.status === "conflict" ? "Wordt overschreven" : "Overgeslagen"}</StatusBadge>
                    </div>
                    <p className="mt-1 text-[var(--color-text-muted)]">Bron {formatCurrency(row.sourceAmount)}{row.targetAmount != null ? ` · Huidig ${formatCurrency(row.targetAmount)}` : ""}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="mb-3">
        <form action={saveBudget} className="rounded-[var(--radius-lg)] border border-border bg-white p-3 shadow-[var(--shadow-sm)]">
          <input type="hidden" name="month" value={selectedMonth} />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-brand">Nieuw budget voor {formatMonthLabel(selectedMonth)}</h2>
            <span className="text-xs font-semibold text-[var(--color-text-muted)]">{newBudgetCategories.length} categorieen beschikbaar</span>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_10rem_auto_auto] md:items-end">
            <div>
              <FieldLabel htmlFor="categoryId">Categorie</FieldLabel>
              <Select id="categoryId" name="categoryId" disabled={newBudgetCategories.length === 0}>
                {newBudgetCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
                {newBudgetCategories.length === 0 ? <option value="">Alles heeft al een budget</option> : null}
              </Select>
            </div>
            <div>
              <FieldLabel htmlFor="planned">Budget</FieldLabel>
              <Input id="planned" name="planned" inputMode="decimal" placeholder="700,00" />
            </div>
            <label className="flex min-h-8 items-center gap-2 text-xs font-semibold text-[var(--color-text-muted)]">
              <input name="rollover" type="checkbox" /> Meenemen
            </label>
            <SubmitButton type="submit" variant="primary" pendingLabel="Aanmaken..." disabled={newBudgetCategories.length === 0}>
              Aanmaken
            </SubmitButton>
          </div>
        </form>
      </section>

      <section className="rounded-[var(--radius-lg)] border border-border bg-white shadow-[var(--shadow-sm)]">
        <div className="border-b border-border px-3 py-2">
          <h2 className="text-xs font-semibold text-brand">Handmatige budgetten {selectedMonth}</h2>
        </div>
        <div className="divide-y divide-border">
          {budgets.length ? (
            budgets.map((budget) => {
              const remaining = budget.planned - budget.actual;
              const usage = budget.planned > 0 ? budget.actual / budget.planned : budget.actual > 0 ? 1 : 0;
              return (
                <article key={`${budget.month}-${budget.categoryId}`} className="grid gap-3 p-3 xl:grid-cols-[minmax(0,1fr)_minmax(25rem,0.9fr)] xl:items-center">
                  <div>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-semibold text-brand">{getCategoryName(dataset.categories, budget.categoryId)}</h3>
                        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                          {formatCurrency(remaining)} resterend
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {budget.planned > 0 ? <StatusBadge tone={remaining < 0 ? "warning" : "success"}>{remaining < 0 ? "Overschreden" : "Binnen budget"}</StatusBadge> : <StatusBadge tone="warning">Ongepland</StatusBadge>}
                        <StatusBadge tone={budget.rollover ? "info" : "neutral"}>{budget.rollover ? "Meenemen" : "Vervalt"}</StatusBadge>
                        {budget.exceptionAccepted ? <StatusBadge tone="info">Bewuste uitzondering</StatusBadge> : null}
                        <form action={deleteBudget}>
                          <input type="hidden" name="month" value={budget.month} />
                          <input type="hidden" name="categoryId" value={budget.categoryId} />
                          <Button type="submit" variant="ghost" size="sm" aria-label={`${getCategoryName(dataset.categories, budget.categoryId)} verwijderen`} title="Verwijderen">
                            <Trash2 aria-hidden="true" size={14} />
                          </Button>
                        </form>
                      </div>
                    </div>
                    <div className="mt-3">
                      <ProgressBar value={usage} tone={remaining < 0 ? "warning" : "brand"} />
                    </div>
                    <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
                      <Metric label="Budget" value={formatCurrency(budget.planned)} />
                      <Metric label="Besteed" value={formatCurrency(budget.actual)} />
                      <Metric label="Verschil" value={formatCurrency(remaining)} />
                    </dl>
                    {suggestionByCategory.get(budget.categoryId) ? (
                      <BudgetSuggestionNote suggestion={suggestionByCategory.get(budget.categoryId)!} />
                    ) : null}
                    {(budget.carriedAmount ?? 0) > 0 ? <p className="mt-2 text-xs font-semibold text-[var(--color-success)]">Inclusief {formatCurrency(budget.carriedAmount ?? 0)} meegenomen uit vorige maand.</p> : null}
                    {budget.note ? <p className="mt-2 rounded-md bg-[var(--color-surface)] p-2 text-xs leading-5 text-[var(--color-text-muted)]"><strong className="text-brand">Notitie:</strong> {budget.note}</p> : null}
                  </div>
                  <div className="grid gap-2">
                    <form action={saveBudget} className="grid gap-2 sm:grid-cols-[9rem_minmax(12rem,1fr)_auto] sm:items-end">
                      <input type="hidden" name="month" value={budget.month} />
                      <input type="hidden" name="categoryId" value={budget.categoryId} />
                      <div>
                        <FieldLabel htmlFor={`planned-${budget.categoryId}`}>Budget</FieldLabel>
                        <Input id={`planned-${budget.categoryId}`} name="planned" inputMode="decimal" defaultValue={(budget.basePlanned ?? budget.planned) ? String(budget.basePlanned ?? budget.planned).replace(".", ",") : ""} placeholder="0,00" />
                      </div>
                      <div><FieldLabel htmlFor={`note-${budget.categoryId}`}>Notitie of reden</FieldLabel><Input id={`note-${budget.categoryId}`} name="note" defaultValue={budget.note ?? ""} maxLength={500} placeholder="Bijvoorbeeld: eenmalige vakantie-uitgave" /></div>
                      <SubmitButton type="submit" size="sm" pendingLabel="Bewaren...">
                        Wijzigen
                      </SubmitButton>
                      <div className="flex flex-wrap gap-4 sm:col-span-3">
                        <label className="flex min-h-8 items-center gap-2 text-xs font-semibold text-[var(--color-text-muted)]"><input name="rollover" type="checkbox" defaultChecked={budget.rollover} /> Meenemen naar volgende maand</label>
                        <label className="flex min-h-8 items-center gap-2 text-xs font-semibold text-[var(--color-text-muted)]"><input name="exceptionAccepted" type="checkbox" defaultChecked={budget.exceptionAccepted} /> Bewuste uitzondering; geen overschrijdingssignaal</label>
                      </div>
                    </form>
                    {suggestionByCategory.get(budget.categoryId) ? (
                      <form action={saveBudget} className="flex justify-end">
                        <input type="hidden" name="month" value={budget.month} />
                        <input type="hidden" name="categoryId" value={budget.categoryId} />
                        <input type="hidden" name="planned" value={String(suggestionByCategory.get(budget.categoryId)?.amount ?? 0).replace(".", ",")} />
                        <input type="hidden" name="note" value={budget.note ?? ""} />
                        {budget.rollover ? <input type="hidden" name="rollover" value="on" /> : null}
                        {budget.exceptionAccepted ? <input type="hidden" name="exceptionAccepted" value="on" /> : null}
                        <SubmitButton type="submit" size="sm" variant="secondary" pendingLabel="Toepassen...">
                          Gebruik voorstel
                        </SubmitButton>
                      </form>
                    ) : null}
                  </div>
                </article>
              );
            })
          ) : (
            <p className="p-3 text-xs text-[var(--color-text-muted)]">Nog geen budgetten voor deze maand. Maak hierboven handmatig je eerste budget aan.</p>
          )}
        </div>
      </section>
        </>
      ) : null}
      </>}
    </>
  );
}

function AnnualBudgetsSection({ year, budgets, categories, availableCategories, canMutate }: { year: number; budgets: AnnualBudget[]; categories: Category[]; availableCategories: Category[]; canMutate: boolean }) {
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const totalPlanned = budgets.reduce((sum, budget) => sum + budget.planned, 0);
  const totalActual = budgets.reduce((sum, budget) => sum + budget.actual, 0);
  const remaining = totalPlanned - totalActual;
  return (
    <div className="grid gap-3">
      <section className="grid gap-3 sm:grid-cols-3">
        <SummaryCard label="Jaarbudget" value={formatCurrency(totalPlanned)} />
        <SummaryCard label="Besteed dit jaar" value={formatCurrency(totalActual)} />
        <SummaryCard label="Nog beschikbaar" value={formatCurrency(remaining)} />
      </section>
      {canMutate ? <section className="rounded-[var(--radius-lg)] border border-border bg-white p-3 shadow-[var(--shadow-sm)]">
        <form action={saveAnnualBudget} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_10rem_auto] md:items-end">
          <input type="hidden" name="year" value={year} />
          <div><FieldLabel htmlFor="annual-category">Categorie</FieldLabel><Select id="annual-category" name="categoryId" disabled={!availableCategories.length}>{availableCategories.map((category) => <option key={category.id} value={category.id}>{category.name}{category.kind === "reservering" ? " · reservering" : ""}</option>)}{!availableCategories.length ? <option value="">Alle categorieën hebben een jaarbudget</option> : null}</Select></div>
          <div><FieldLabel htmlFor="annual-planned">Bedrag voor {year}</FieldLabel><Input id="annual-planned" name="planned" inputMode="decimal" placeholder="1.200,00" /></div>
          <SubmitButton disabled={!availableCategories.length} pendingLabel="Aanmaken...">Jaarbudget toevoegen</SubmitButton>
        </form>
      </section> : null}
      <section className="rounded-[var(--radius-lg)] border border-border bg-white shadow-[var(--shadow-sm)]">
        <div className="border-b border-border px-3 py-2"><h2 className="text-sm font-semibold text-brand">Jaarbudgetten {year}</h2><p className="mt-1 text-xs text-[var(--color-text-muted)]">Reserveringscategorieën blijven apart herkenbaar; werkelijk besteed komt rechtstreeks uit transacties.</p></div>
        <div className="grid gap-3 p-3 md:grid-cols-2 xl:grid-cols-3">
          {budgets.map((budget) => {
            const category = categoryById.get(budget.categoryId);
            const budgetRemaining = budget.planned - budget.actual;
            return <article key={budget.id} className="rounded-md border border-border bg-[var(--color-surface)] p-3">
              <div className="flex items-start justify-between gap-2"><div><h3 className="text-sm font-semibold text-brand">{category?.name ?? budget.categoryId}</h3>{category?.kind === "reservering" ? <StatusBadge tone="info">Reservering</StatusBadge> : null}</div><StatusBadge tone={budgetRemaining < 0 ? "warning" : "success"}>{budgetRemaining < 0 ? "Overschreden" : "Op koers"}</StatusBadge></div>
              <div className="mt-3"><ProgressBar value={budget.planned > 0 ? budget.actual / budget.planned : 0} tone={budgetRemaining < 0 ? "warning" : "brand"} /></div>
              <dl className="mt-3 grid grid-cols-3 gap-2 text-xs"><Metric label="Budget" value={formatCurrency(budget.planned)} /><Metric label="Besteed" value={formatCurrency(budget.actual)} /><Metric label="Over" value={formatCurrency(budgetRemaining)} /></dl>
              {canMutate ? <div className="mt-3 flex items-end gap-2"><form action={saveAnnualBudget} className="contents"><input type="hidden" name="year" value={year} /><input type="hidden" name="categoryId" value={budget.categoryId} /><div className="flex-1"><FieldLabel htmlFor={`annual-${budget.categoryId}`}>Jaarbedrag</FieldLabel><Input id={`annual-${budget.categoryId}`} name="planned" inputMode="decimal" defaultValue={String(budget.planned).replace(".", ",")} /></div><SubmitButton size="sm" variant="secondary" pendingLabel="Bewaren...">Wijzigen</SubmitButton></form><form action={deleteAnnualBudget}><input type="hidden" name="year" value={year} /><input type="hidden" name="categoryId" value={budget.categoryId} /><Button type="submit" size="sm" variant="ghost" aria-label={`${category?.name ?? budget.categoryId} jaarbudget verwijderen`}><Trash2 aria-hidden="true" size={14} /></Button></form></div> : null}
            </article>;
          })}
          {!budgets.length ? <p className="text-sm text-[var(--color-text-muted)]">Nog geen jaarbudgetten voor {year}.</p> : null}
        </div>
      </section>
    </div>
  );
}

function ViewLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={active ? "rounded px-3 py-1.5 text-white bg-brand" : "rounded px-3 py-1.5 text-brand hover:bg-[var(--color-brand-subtle)]"}
    >
      {children}
    </Link>
  );
}

type BudgetSuggestionItem = ReturnType<typeof getBudgetSuggestions>[number];

function BudgetOverviewCard({ label, budget, suggestion }: { label: string; budget: { planned: number; actual: number; rollover: boolean; carriedAmount?: number; note?: string; exceptionAccepted?: boolean }; suggestion?: BudgetSuggestionItem }) {
  const remaining = budget.planned - budget.actual;
  const usage = budget.planned > 0 ? budget.actual / budget.planned : budget.actual > 0 ? 1 : 0;
  return (
    <article className="rounded-md border border-border bg-white p-3">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-brand">{label}</h3>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">{formatCurrency(remaining)} resterend</p>
        </div>
        <StatusBadge tone={remaining < 0 ? "warning" : "success"}>{remaining < 0 ? "Overschreden" : "Binnen budget"}</StatusBadge>
      </div>
      <ProgressBar value={usage} tone={remaining < 0 ? "warning" : "brand"} />
      <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <Metric label="Budget" value={formatCurrency(budget.planned)} />
        <Metric label="Besteed" value={formatCurrency(budget.actual)} />
        <Metric label="Over" value={formatCurrency(remaining)} />
      </dl>
      <div className="mt-3 flex flex-wrap gap-2">
        <StatusBadge tone={budget.rollover ? "info" : "neutral"}>{budget.rollover ? "Meenemen" : "Vervalt"}</StatusBadge>
        {(budget.carriedAmount ?? 0) > 0 ? <StatusBadge tone="success">+{formatCurrency(budget.carriedAmount ?? 0)} meegenomen</StatusBadge> : null}
        {budget.exceptionAccepted ? <StatusBadge tone="info">Bewuste uitzondering</StatusBadge> : null}
        {suggestion ? <StatusBadge tone={suggestion.confidence === "hoog" ? "success" : "info"}>Voorstel {formatCurrency(suggestion.amount)}</StatusBadge> : null}
      </div>
      {budget.note ? <p className="mt-2 text-xs leading-5 text-[var(--color-text-muted)]">{budget.note}</p> : null}
    </article>
  );
}

function BudgetSuggestionNote({ suggestion }: { suggestion: BudgetSuggestionItem }) {
  return (
    <div className="mt-3 rounded-md border border-border bg-[var(--color-surface)] p-2 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span>
          <span className="font-semibold text-brand">Slim voorstel: </span>
          {formatCurrency(suggestion.amount)}
        </span>
        <StatusBadge tone={suggestion.confidence === "hoog" ? "success" : suggestion.confidence === "middel" ? "info" : "neutral"}>
          {suggestion.confidence}
        </StatusBadge>
      </div>
      <p className="mt-1 text-[var(--color-text-muted)]">{suggestion.reason}.</p>
      <dl className="mt-2 grid gap-2 sm:grid-cols-3">
        <Metric label="Mediaan" value={formatCurrency(suggestion.medianAmount)} />
        <Metric label="Gemiddelde" value={formatCurrency(suggestion.averageAmount)} />
        <Metric label="Bandbreedte" value={`${formatCurrency(suggestion.minAmount)} - ${formatCurrency(suggestion.maxAmount)}`} />
      </dl>
      {suggestion.drivers.length ? (
        <div className="mt-2 rounded-md bg-white p-2">
          <p className="text-[0.68rem] font-bold uppercase tracking-wide text-[var(--color-text-subtle)]">Verklaard door</p>
          <div className="mt-1 grid gap-1">
            {suggestion.drivers.map((driver) => (
              <div key={driver.label} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                <span className="truncate text-[var(--color-text-muted)]">{driver.label}</span>
                <strong className="tabular-nums text-brand">{formatCurrency(driver.amount)}</strong>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-[var(--color-surface)] p-2">
      <dt className="text-[var(--color-text-subtle)]">{label}</dt>
      <dd className="mt-1 font-semibold">{value}</dd>
    </div>
  );
}

function previousMonth(selectedMonth: string, months: string[]) {
  return months.find((month) => month < selectedMonth) ?? months.find((month) => month !== selectedMonth) ?? "";
}

function budgetMonthHref(month: string, view: BudgetView, suggestionMonths: 3 | 6) {
  return `/budgetten?month=${month}&view=${view}&suggestionMonths=${suggestionMonths}`;
}
