import Link from "next/link";
import { AlertTriangle, Ban, CircleAlert, Download } from "lucide-react";
import { Button, ButtonLink, FieldLabel, Input, PageHeader, Select, StatusBadge, SubmitButton } from "@/components/ui";
import { ReadonlyNotice } from "@/components/finance/readonly-notice";
import { FixedExpenseDateFields } from "@/components/finance/fixed-expense-date-fields";
import { formatCurrency, formatDate, formatMonthLabel } from "@/lib/format";
import { deleteFixedExpense, deleteRecurringIncome, rejectFixedExpenseCandidate, rejectRecurringIncomeCandidate, saveFixedExpense, saveRecurringIncome } from "@/modules/finance/actions";
import { getFinanceDataset, getFixedExpenses, getRecurringIncomes } from "@/modules/finance/data-source";
import { getFixedExpenseCandidatesFromDatabase, getInferredRecurringIncomeCandidatesFromDatabase, type IncomeForecastSource } from "@/modules/finance/repository";
import { requireUser } from "@/modules/auth/service";
import { getAvailableMonths, getCategoryName, getFixedExpenseHealthSignals, monthlyAmount } from "@/modules/finance/reporting";
import { dueDateConfidenceLabel } from "@/modules/finance/fixed-expense-date";
import { FORECAST_STATUS_LABELS } from "@/modules/finance/forecast-evidence";
import { rollDateForward } from "@/modules/finance/recurrence";
import type { Category, FixedExpense, FixedExpenseCandidate, Frequency, RecurringIncome } from "@/modules/finance/types";

export default async function FixedExpensesPage() {
  const [user, dataset, fixedExpenses, recurringIncomes, candidates, incomeCandidates] = await Promise.all([
    requireUser(),
    getFinanceDataset(),
    getFixedExpenses(),
    getRecurringIncomes(),
    getFixedExpenseCandidatesFromDatabase(),
    getInferredRecurringIncomeCandidatesFromDatabase(),
  ]);
  const canMutate = user.role !== "readonly";
  const { categories } = dataset;
  const fixedCategories = categories.filter((category) => !category.validTo && category.kind === "vaste_last");
  const totalMonthly = fixedExpenses.reduce((sum, expense) => sum + monthlyAmount(expense), 0);
  const openCandidates = candidates.filter((candidate) => !candidate.alreadyManaged);
  const latestMonth = getAvailableMonths(dataset.transactions)[0];
  const healthSignals = getFixedExpenseHealthSignals(dataset.transactions, fixedExpenses, latestMonth);
  // Stored dates may lie in the past; the overview shows each income's next occurrence from today.
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Amsterdam", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const upcomingIncomes = recurringIncomes.map((income) => ({ ...income, nextExpectedOn: rollDateForward(income.nextExpectedOn, income.frequency, today) }));
  const nextIncome = [...upcomingIncomes].sort((a, b) => a.nextExpectedOn.localeCompare(b.nextExpectedOn))[0];

  return (
    <>
      <PageHeader
        eyebrow="Planning"
        title="Inkomen en vaste lasten"
        description={canMutate ? "Plan wanneer salaris, huur en andere vaste bedragen komen." : "Bekijk je vaste inkomsten en betalingen."}
        stats={[
          { label: "Vaste lasten per maand", value: formatCurrency(totalMonthly), detail: `${fixedExpenses.length} actief, omgerekend naar maandbasis`, lead: true },
          { label: "Volgend inkomen", value: nextIncome ? `+${formatCurrency(nextIncome.amount)}` : "—", detail: nextIncome ? `${nextIncome.label} · ${formatDate(nextIncome.nextExpectedOn)}` : incomeCandidates.length ? `${incomeCandidates.length} geschat uit transacties` : "Nog niet ingesteld", tone: nextIncome ? undefined : "risk" },
          { label: "Kandidaten", value: String(openCandidates.length), detail: openCandidates.length ? "Terugkerende betalingen te beoordelen" : "Niets te beoordelen" },
          { label: "Signalen", value: String(healthSignals.length), detail: latestMonth ? formatMonthLabel(latestMonth) : "Geen maand bekend", tone: healthSignals.length ? "risk" : undefined },
        ]}
        actions={canMutate ? <ButtonLink href="/api/export/forward" variant="secondary"><Download aria-hidden="true" size={14} /> Exporteer CSV</ButtonLink> : undefined}
      />
      {!canMutate ? <div className="mb-6"><ReadonlyNotice /></div> : null}

      <PayCycleTimeline incomes={upcomingIncomes} incomeCandidates={incomeCandidates} expenses={fixedExpenses} />

      <IncomePlanningSection canMutate={canMutate} incomes={recurringIncomes} candidates={incomeCandidates} />

      <section className="mb-8">
        {canMutate ? (
        <details className="planning-editor border border-border bg-[var(--color-panel-strong)]">
          <summary>Nieuwe vaste last toevoegen</summary>
          <form action={saveFixedExpense} className="p-5 pt-1 md:p-6 md:pt-1">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_8rem_9rem_10rem_auto] xl:items-end">
            <div>
              <FieldLabel htmlFor="supplier">Leverancier</FieldLabel>
              <Input id="supplier" name="supplier" placeholder="KPN" />
            </div>
            <div>
              <FieldLabel htmlFor="categoryId">Categorie</FieldLabel>
              <CategorySelect id="categoryId" name="categoryId" categories={fixedCategories} />
            </div>
            <div>
              <FieldLabel htmlFor="amount">Bedrag</FieldLabel>
              <Input id="amount" name="amount" inputMode="decimal" placeholder="100,00" />
            </div>
            <div>
              <FieldLabel htmlFor="frequency">Frequentie</FieldLabel>
              <FrequencySelect id="frequency" name="frequency" />
            </div>
            <FixedExpenseDateFields idPrefix="new-fixed-expense" />
            <SubmitButton variant="primary" pendingLabel="Opslaan...">
              Opslaan
            </SubmitButton>
          </div>
          <label className="mt-4 flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
            <input name="updateTransactions" type="checkbox" className="h-3.5 w-3.5" />
            Bestaande transacties van deze leverancier koppelen aan de gekozen categorie
          </label>
          </form>
        </details>
        ) : null}
      </section>

      <FixedExpenseSignals signals={healthSignals} month={latestMonth} />

      <section className="mb-8">
        <div className="section-head">
          <div className="grid gap-2">
            <h2>Actieve vaste lasten</h2>
            <p>Bedragen, frequentie en de volgende afschrijving per leverancier.</p>
          </div>
          <StatusBadge tone="info">{fixedExpenses.length} actief</StatusBadge>
        </div>
        <div className="border border-border bg-[var(--color-panel-strong)]">
        <div className="hidden md:block">
          <div className="table-responsive">
          <table className="w-full min-w-[58rem] border-collapse text-left text-xs">
            <thead className="border-b border-border text-[0.62rem] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
              <tr>
                <th className="px-4 py-3 font-normal">Leverancier</th>
                <th className="px-4 py-3 font-normal">Categorie</th>
                <th className="px-4 py-3 font-normal">Frequentie</th>
                <th className="px-4 py-3 font-normal">Volgende afschrijving</th>
                <th className="px-4 py-3 font-normal text-right">Bedrag</th>
                <th className="px-4 py-3 font-normal text-right">Maandbasis</th>
                <th className="px-4 py-3 font-normal">Status</th>
                <th className="px-4 py-3 font-normal text-right">Actie</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {fixedExpenses.map((expense) => (
                <FixedExpenseRow key={expense.id} canMutate={canMutate} expense={expense} categories={categories} fixedCategories={fixedCategories} />
              ))}
              {fixedExpenses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-xs text-[var(--color-text-muted)]">
                    Nog geen vaste lasten beheerd. Accepteer hieronder kandidaten uit je transacties.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
          </div>
        </div>
        <div className="divide-y divide-border md:hidden">
          {fixedExpenses.slice(0, 6).map((expense) => (
            <FixedExpenseMobileCard key={expense.id} canMutate={canMutate} expense={expense} categories={categories} fixedCategories={fixedCategories} />
          ))}
          {fixedExpenses.length > 6 ? (
            <details className="group">
              <summary className="cursor-pointer list-none px-4 py-4 text-center text-xs text-brand marker:content-none">Toon nog {fixedExpenses.length - 6} vaste lasten</summary>
              <div className="divide-y divide-border border-t border-border">
                {fixedExpenses.slice(6).map((expense) => (
                  <FixedExpenseMobileCard key={expense.id} canMutate={canMutate} expense={expense} categories={categories} fixedCategories={fixedCategories} />
                ))}
              </div>
            </details>
          ) : null}
          {!fixedExpenses.length ? <p className="p-5 text-center text-xs text-[var(--color-text-muted)]">Nog geen vaste lasten beheerd.</p> : null}
        </div>
        </div>
      </section>

      <details className="group mb-8 border border-border bg-[var(--color-panel-strong)]">
        <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 p-5 marker:content-none">
          <span>
            <span className="block text-sm font-medium text-[var(--color-text)]">Kandidaten uit transacties</span>
            <span className="mt-0.5 block text-xs text-[var(--color-text-muted)]">Open alleen wanneer je nieuwe vaste lasten wilt beoordelen</span>
          </span>
          <StatusBadge tone={openCandidates.length ? "warning" : "success"}>{openCandidates.length} open</StatusBadge>
        </summary>
        <div className="divide-y divide-border border-t border-border">
          {candidates.map((candidate) => (
            <CandidateRow key={candidate.id} canMutate={canMutate} candidate={candidate} categories={fixedCategories} />
          ))}
          {candidates.length === 0 ? (
            <p className="p-5 text-xs text-[var(--color-text-muted)]">Nog geen terugkerende betalingen gevonden.</p>
          ) : null}
        </div>
      </details>
    </>
  );
}

function IncomePlanningSection({ canMutate, incomes, candidates }: { canMutate: boolean; incomes: RecurringIncome[]; candidates: IncomeForecastSource[] }) {
  return (
    <section id="income-planning" className="mb-8">
      <div className="section-head">
        <div className="grid gap-2">
          <h2>Verwachte inkomsten</h2>
          <p>De betaaldatum bepaalt de echte ruimte tot je volgende inkomen.</p>
        </div>
        <StatusBadge tone={incomes.length ? "success" : candidates.length ? "info" : "warning"}>
          {incomes.length ? `${incomes.length} gepland` : candidates.length ? `${candidates.length} schatting${candidates.length === 1 ? "" : "en"}` : "Nog niet ingesteld"}
        </StatusBadge>
      </div>

      <div className="border border-border bg-[var(--color-panel-strong)]">
      {canMutate ? (
        <details className="planning-editor border-b border-border">
          <summary>Nieuw inkomen plannen</summary>
          <form action={saveRecurringIncome} className="grid gap-4 p-5 pt-2 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_9rem_10rem_10rem_auto] xl:items-end">
          <div>
            <FieldLabel htmlFor="income-label">Naam</FieldLabel>
            <Input id="income-label" name="label" placeholder="Salaris" required />
          </div>
          <div>
            <FieldLabel htmlFor="income-amount">Bedrag</FieldLabel>
            <Input id="income-amount" name="amount" inputMode="decimal" placeholder="3.250,00" required />
          </div>
          <div>
            <FieldLabel htmlFor="income-frequency">Frequentie</FieldLabel>
            <FrequencySelect id="income-frequency" name="frequency" />
          </div>
          <div>
            <FieldLabel htmlFor="income-date">Eerstvolgende betaling</FieldLabel>
            <Input id="income-date" name="nextExpectedOn" type="date" required />
          </div>
            <SubmitButton variant="primary" pendingLabel="Plannen...">Inkomen plannen</SubmitButton>
          </form>
        </details>
      ) : null}

      <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
        {incomes.map((income) => (
          <article key={income.id} className="border border-border bg-[var(--color-surface)] p-5">
            <div>
              <h3 className="text-sm font-medium text-[var(--color-text)]">{income.label}</h3>
              <p className="money-value mt-2 text-2xl font-light text-[var(--color-success)]">+{formatCurrency(income.amount)}</p>
            </div>
            <p className="mt-3 text-xs text-[var(--color-text-muted)]">{formatDate(income.nextExpectedOn)} · {frequencyLabel(income.frequency)}</p>
            {canMutate ? (
              <details className="income-editor mt-3 border-t border-border">
                <summary>Wijzigen</summary>
                <div className="pb-1">
                <form action={saveRecurringIncome} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-2">
                  <input type="hidden" name="recurringIncomeId" value={income.id} />
                  <input type="hidden" name="label" value={income.label} />
                  <Input name="amount" inputMode="decimal" defaultValue={String(income.amount).replace(".", ",")} aria-label={`Bedrag ${income.label}`} />
                  <Input name="nextExpectedOn" type="date" defaultValue={income.nextExpectedOn} aria-label={`Eerstvolgende betaling ${income.label}`} />
                  <FrequencySelect id={`income-frequency-${income.id}`} name="frequency" defaultValue={income.frequency} />
                  <Button type="submit" size="sm" variant="secondary" className="w-full">Bijwerken</Button>
                </form>
                <form action={deleteRecurringIncome} className="mt-2">
                  <input type="hidden" name="recurringIncomeId" value={income.id} />
                  <Button type="submit" size="sm" variant="ghost" className="w-full text-error">Archiveren</Button>
                </form>
                </div>
              </details>
            ) : null}
          </article>
        ))}
        {!incomes.length ? <p className="p-2 text-xs leading-5 text-[var(--color-text-muted)]">Zonder bevestigde planning gebruikt Vandaag tijdelijk {candidates.length ? "de herkende inkomsten hieronder" : "een herkenbaar terugkerend inkomen"} en markeert die als schatting.</p> : null}
      </div>
      {candidates.length ? (
        <div className="border-t border-border p-5">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div><h3 className="text-sm font-medium text-[var(--color-text)]">Herkend uit transacties</h3><p className="mt-1 text-xs text-[var(--color-text-muted)]">Bevestig een bron om bedrag en datum zelf te beheren, of sluit hem uit.</p></div>
            <StatusBadge tone="info">{candidates.length} voorstel{candidates.length === 1 ? "" : "len"}</StatusBadge>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {candidates.map((candidate) => (
              <article key={candidate.candidateId} className="border border-border bg-[var(--color-surface)] p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div><h4 className="text-sm font-medium text-[var(--color-text)]">{candidate.label}</h4><p className="money-value mt-2 text-xl font-light text-[var(--color-success)]">ongeveer +{formatCurrency(candidate.amount)}</p></div>
                  <StatusBadge tone={candidate.status === "strong_estimate" ? "success" : candidate.status === "deviation" ? "warning" : "info"}>{candidate.status === "strong_estimate" ? "Sterke schatting" : candidate.status === "deviation" ? "Afwijking" : "Voorlopige schatting"}</StatusBadge>
                </div>
                <p className="mt-2 text-xs leading-5 text-[var(--color-text-muted)]">{frequencyLabel(candidate.frequency)} · verwacht {formatDate(candidate.date)} · {candidate.evidenceCount} perioden · bereik {formatCurrency(candidate.minimumAmount)}–{formatCurrency(candidate.maximumAmount)}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {canMutate ? <form action={saveRecurringIncome}>
                    <input type="hidden" name="label" value={candidate.label} />
                    <input type="hidden" name="amount" value={String(candidate.amount)} />
                    <input type="hidden" name="frequency" value={candidate.frequency} />
                    <input type="hidden" name="nextExpectedOn" value={candidate.date} />
                    <SubmitButton size="sm" variant="primary" pendingLabel="Bevestigen...">Bevestigen</SubmitButton>
                  </form> : null}
                  <ButtonLinkToTransactions label={candidate.label} />
                  {canMutate ? <form action={rejectRecurringIncomeCandidate}>
                    <input type="hidden" name="candidateId" value={candidate.candidateId} />
                    <input type="hidden" name="label" value={candidate.label} />
                    <Button type="submit" size="sm" variant="ghost">Niet gebruiken</Button>
                  </form> : null}
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : null}
      </div>
    </section>
  );
}

function ButtonLinkToTransactions({ label }: { label: string }) {
  return <Link href={`/transacties?q=${encodeURIComponent(label)}&kind=inkomen`} className="inline-flex min-h-9 items-center px-3 text-xs text-brand underline-offset-4 hover:underline">Brontransacties</Link>;
}

function PayCycleTimeline({ incomes, incomeCandidates, expenses }: { incomes: RecurringIncome[]; incomeCandidates: IncomeForecastSource[]; expenses: FixedExpense[] }) {
  const moments = [
    ...incomes.map((income) => ({ id: `income-${income.id}`, label: income.label, amount: income.amount, date: income.nextExpectedOn, type: "income" as const, detail: "Zelf ingevuld" })),
    ...incomeCandidates.map((income) => ({ id: `income-${income.candidateId}`, label: income.label, amount: income.amount, date: income.date, type: "income" as const, detail: FORECAST_STATUS_LABELS[income.status] })),
    ...expenses.flatMap((expense) => {
      if (expense.manualDueDateExpired) return [];
      const date = fixedExpenseDueDate(expense);
      return date ? [{ id: `expense-${expense.id}`, label: expense.supplier, amount: expense.amount, date, type: "expense" as const, detail: !expense.nextDueOn ? `Schatting, ${dueDateConfidenceLabel(expense.dueDateConfidence)} zekerheid` : "Zelf ingevuld" }] : [];
    }),
  ].sort((a, b) => a.date.localeCompare(b.date) || (a.type === "expense" ? -1 : 1));
  const hasIncome = incomes.length + incomeCandidates.length > 0;

  return (
    <section className="pay-cycle mb-8" aria-labelledby="pay-cycle-title">
      <div className="section-head">
        <div className="grid gap-2">
          <h2 id="pay-cycle-title">Betaalcyclus</h2>
          <p>Van vandaag naar het volgende inkomen.</p>
        </div>
        <StatusBadge tone={incomes.length ? "success" : hasIncome ? "info" : "warning"}>{incomes.length ? "Datums actief" : hasIncome ? "Deels geschat" : "Inkomen ontbreekt"}</StatusBadge>
      </div>
      <div className="pay-cycle__rail">
        <article className="pay-cycle__moment pay-cycle__moment--today">
          <time>Nu</time>
          <span />
          <strong>Vandaag</strong>
          <small>Start van je vooruitblik</small>
        </article>
        {moments.slice(0, 10).map((moment) => (
          <article key={moment.id} className={moment.type === "income" ? "pay-cycle__moment pay-cycle__moment--income" : "pay-cycle__moment"}>
            <time dateTime={moment.date}>{formatDate(moment.date)}</time>
            <span />
            <strong>{moment.label}</strong>
            <small>{moment.type === "income" ? "+" : "−"}{formatCurrency(moment.amount)} · {moment.detail}</small>
          </article>
        ))}
      </div>
      {!moments.length ? <p className="pay-cycle__empty">Voeg hieronder je inkomen en vaste lasten toe; daarna ontstaat de tijdlijn automatisch.</p> : null}
    </section>
  );
}

type FixedExpenseSignal = ReturnType<typeof getFixedExpenseHealthSignals>[number];

function FixedExpenseSignals({ signals, month }: { signals: FixedExpenseSignal[]; month?: string }) {
  return (
    <details className="group mb-8 border border-border bg-[var(--color-panel-strong)]">
      <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 p-5 marker:content-none">
        <span>
          <span className="flex items-center gap-1.5 text-sm font-medium text-[var(--color-text)]"><CircleAlert aria-hidden="true" size={15} className="text-[var(--color-text-muted)]" /> Signalen vaste lasten{month ? ` ${formatMonthLabel(month)}` : ""}</span>
          <span className="mt-1 block text-xs text-[var(--color-text-muted)]">Afwijkingen, ontbrekende betalingen en mogelijke dubbelen</span>
        </span>
        <StatusBadge tone={signals.length ? "warning" : "success"}>{signals.length ? `${signals.length} te bekijken` : "Geen bijzonderheden"}</StatusBadge>
      </summary>
      <div className="border-t border-border p-5">
      {signals.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {signals.map((signal) => {
            const delta = signal.expectedAmount != null ? signal.amount - signal.expectedAmount : signal.amount;
            return (
              <article key={signal.id} className={signal.tone === "warning" ? "border border-border border-l-2 border-l-[var(--color-warning)] bg-[var(--color-surface)] p-5" : "border border-border bg-[var(--color-surface)] p-5"}>
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-sm font-medium text-[var(--color-text)]">{signal.title}</h3>
                  <StatusBadge tone={signal.type === "duplicate" ? "info" : "warning"}>{signal.type === "duplicate" ? "Dubbeling" : signal.type === "missing" ? "Mist" : "Afwijking"}</StatusBadge>
                </div>
                <p className="mt-2 text-xs leading-5 text-[var(--color-text-muted)]">{signal.detail}</p>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <Metric label="Gevonden" value={formatCurrency(signal.amount)} />
                  <Metric label="Verwacht" value={formatCurrency(signal.expectedAmount ?? 0)} />
                  {signal.expectedAmount != null ? <Metric label="Verschil" value={formatCurrency(delta)} /> : null}
                </dl>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-[var(--color-text-muted)]">Alle beheerde vaste lasten passen bij de laatst bekende maand en er zijn geen duidelijke dubbelen gevonden.</p>
      )}
      </div>
    </details>
  );
}

function FixedExpenseRow({ canMutate, expense, categories, fixedCategories }: { canMutate: boolean; expense: FixedExpense; categories: Category[]; fixedCategories: Category[] }) {
  const changed = expense.previousAmount != null && expense.previousAmount !== expense.amount;
  const formId = `fixed-${expense.id}`;
  const dueDate = fixedExpenseDueDate(expense);

  return (
    <tr className="align-top hover:bg-[var(--color-surface)]">
      <td className="px-4 py-3">
        {canMutate ? (
        <>
        <form id={formId} action={saveFixedExpense} />
        <input form={formId} type="hidden" name="fixedExpenseId" value={expense.id} />
        <Input form={formId} name="supplier" defaultValue={expense.supplier} aria-label="Leverancier" />
        </>
        ) : <span className="font-medium text-[var(--color-text)]">{expense.supplier}</span>}
      </td>
      <td className="px-4 py-3">
        {canMutate ? <CategorySelect id={`category-${expense.id}`} name="categoryId" categories={fixedCategories} defaultValue={expense.categoryId} form={formId} /> : null}
        <span className="sr-only">{getCategoryName(categories, expense.categoryId)}</span>
        {!canMutate ? <span>{getCategoryName(categories, expense.categoryId)}</span> : null}
      </td>
      <td className="px-4 py-3">{canMutate ? <FrequencySelect id={`frequency-${expense.id}`} name="frequency" defaultValue={expense.frequency} form={formId} /> : frequencyLabel(expense.frequency)}</td>
      <td className="px-4 py-3">
        {canMutate ? (
          <FixedExpenseDateFields
            idPrefix={`fixed-${expense.id}`}
            form={formId}
            manualDate={expense.nextDueOn}
            estimatedDate={expense.estimatedNextDueOn}
            confidence={expense.dueDateConfidence}
            evidenceCount={expense.dueDateEvidenceCount}
            expired={expense.manualDueDateExpired}
            compact
          />
        ) : <DueDateSummary expense={expense} />}
      </td>
      <td className="px-4 py-3 text-right">
        {canMutate ? <Input form={formId} name="amount" inputMode="decimal" defaultValue={String(expense.amount).replace(".", ",")} aria-label="Bedrag" className="text-right" /> : formatCurrency(expense.amount)}
      </td>
      <td className="px-4 py-3 text-right">{formatCurrency(monthlyAmount(expense))}</td>
      <td className="px-4 py-3">{changed ? <StatusBadge tone="warning">Was {formatCurrency(expense.previousAmount ?? expense.amount)}</StatusBadge> : <StatusBadge>Actief</StatusBadge>}</td>
      <td className="px-4 py-3">
        <div className="flex justify-end gap-2">
          {canMutate ? <Button form={formId} type="submit" size="sm" variant="secondary">Bewaren</Button> : <StatusBadge tone="neutral">Alleen lezen</StatusBadge>}
          {canMutate ? (
          <form action={deleteFixedExpense}>
            <input type="hidden" name="fixedExpenseId" value={expense.id} />
            <Button type="submit" size="sm" variant="danger">
              Archiveren
            </Button>
          </form>
          ) : null}
        </div>
      </td>
    </tr>
  );
}

function FixedExpenseMobileCard({ canMutate, expense, categories, fixedCategories }: { canMutate: boolean; expense: FixedExpense; categories: Category[]; fixedCategories: Category[] }) {
  const dueDate = fixedExpenseDueDate(expense);

  return (
    <details className="group">
      <summary className="grid cursor-pointer list-none grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-4 marker:content-none">
        <span className="min-w-0">
          <strong className="block truncate text-sm font-medium text-[var(--color-text)]">{expense.supplier}</strong>
          <span className="mt-1 block text-xs leading-4 text-[var(--color-text-muted)]">{getCategoryName(categories, expense.categoryId)} · {dueDate ? formatDate(dueDate) : "datum onbekend"} · {expense.nextDueOn ? "Zelf ingevuld" : dueDate ? `Schatting (${confidenceShortLabel(expense.dueDateConfidence)})` : "Niet te schatten"}</span>
          {expense.manualDueDateExpired ? <span className="mt-1 block text-[0.68rem] text-[var(--color-warning)]">Handmatige datum verlopen</span> : null}
        </span>
        <span className="text-right">
          <strong className="money-value block text-sm font-medium text-[var(--color-text)]">{formatCurrency(expense.amount)}</strong>
          <span className="mt-1 block text-[0.68rem] text-[var(--color-text-subtle)]">{frequencyLabel(expense.frequency)}</span>
        </span>
      </summary>
      {canMutate ? (
        <div className="border-t border-border bg-[var(--color-surface)] p-4">
          <form action={saveFixedExpense} className="grid grid-cols-2 gap-3">
            <input type="hidden" name="fixedExpenseId" value={expense.id} />
            <div className="col-span-2"><FieldLabel htmlFor={`mobile-supplier-${expense.id}`}>Leverancier</FieldLabel><Input id={`mobile-supplier-${expense.id}`} name="supplier" defaultValue={expense.supplier} /></div>
            <div className="col-span-2"><FieldLabel htmlFor={`mobile-category-${expense.id}`}>Categorie</FieldLabel><CategorySelect id={`mobile-category-${expense.id}`} name="categoryId" categories={fixedCategories} defaultValue={expense.categoryId} /></div>
            <div><FieldLabel htmlFor={`mobile-amount-${expense.id}`}>Bedrag</FieldLabel><Input id={`mobile-amount-${expense.id}`} name="amount" inputMode="decimal" defaultValue={String(expense.amount).replace(".", ",")} /></div>
            <div><FieldLabel htmlFor={`mobile-frequency-${expense.id}`}>Frequentie</FieldLabel><FrequencySelect id={`mobile-frequency-${expense.id}`} name="frequency" defaultValue={expense.frequency} /></div>
            <div className="col-span-2">
              <FixedExpenseDateFields
                idPrefix={`mobile-fixed-${expense.id}`}
                manualDate={expense.nextDueOn}
                estimatedDate={expense.estimatedNextDueOn}
                confidence={expense.dueDateConfidence}
                evidenceCount={expense.dueDateEvidenceCount}
                expired={expense.manualDueDateExpired}
              />
            </div>
            <Button type="submit" size="sm" variant="primary" className="col-span-2">Wijzigingen bewaren</Button>
          </form>
          <form action={deleteFixedExpense} className="mt-2">
            <input type="hidden" name="fixedExpenseId" value={expense.id} />
            <Button type="submit" size="sm" variant="ghost" className="w-full text-error">Archiveren</Button>
          </form>
        </div>
      ) : null}
    </details>
  );
}

function fixedExpenseDueDate(expense: FixedExpense) {
  return expense.nextDueOn ?? expense.estimatedNextDueOn;
}

function DueDateSummary({ expense }: { expense: FixedExpense }) {
  const dueDate = fixedExpenseDueDate(expense);
  return (
    <div>
      {dueDate ? <span className="font-medium text-[var(--color-text)]">{formatDate(dueDate)}</span> : <span className="text-[var(--color-text-subtle)]">Nog niet te schatten</span>}
      <span className="mt-1 block text-[0.68rem] text-[var(--color-text-subtle)]">
        {expense.nextDueOn ? "Zelf ingevuld" : dueDate ? expense.dueDateReason ?? `Schatting · ${dueDateConfidenceLabel(expense.dueDateConfidence)} zekerheid · ${expense.dueDateEvidenceCount ?? 0} afschrijvingen` : "Geen eerdere afschrijving gevonden"}
      </span>
      {expense.manualDueDateExpired ? <span className="mt-1 block text-[0.68rem] text-[var(--color-warning)]">Datum verlopen — bijwerken of automatisch laten schatten</span> : null}
    </div>
  );
}

function confidenceShortLabel(confidence: FixedExpense["dueDateConfidence"]) {
  if (confidence === "high") return "hoog";
  if (confidence === "medium") return "gemiddeld";
  return "laag";
}

function CandidateRow({ canMutate, candidate, categories }: { canMutate: boolean; candidate: FixedExpenseCandidate; categories: Array<{ id: string; name: string }> }) {
  const defaultCategoryId = categories.some((category) => category.id === candidate.categoryId) ? candidate.categoryId : categories[0]?.id;
  const hasDuplicateSignal = Boolean(candidate.duplicateOf?.length);

  return (
    <article className="grid gap-5 p-5 md:p-6 xl:grid-cols-[minmax(0,1fr)_minmax(26rem,0.85fr)] xl:items-center xl:gap-8">
      <div>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-medium text-[var(--color-text)]">{candidate.supplier}</h3>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              {candidate.transactionCount} transacties in {candidate.monthsSeen} maanden, {formatDate(candidate.firstSeen)} t/m {formatDate(candidate.lastSeen)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge tone={candidate.alreadyManaged ? "success" : candidate.confidence >= 80 ? "warning" : "neutral"}>
              {candidate.alreadyManaged ? "Beheerd" : `${candidate.confidence}%`}
            </StatusBadge>
            <StatusBadge tone="neutral">{candidate.categoryName}</StatusBadge>
            {hasDuplicateSignal ? (
              <StatusBadge tone="warning">
                <AlertTriangle aria-hidden="true" size={12} /> Mogelijke dubbeling
              </StatusBadge>
            ) : null}
          </div>
        </div>
        {candidate.duplicateOf?.length ? (
          <div className="mt-3 border-l-2 border-[var(--color-warning)] pl-3 text-xs text-[var(--color-text)]">
            <strong className="block font-medium text-[var(--color-warning)]">Lijkt op bestaand voorstel</strong>
            <span className="mt-1 block text-[var(--color-text-muted)]">
              {candidate.duplicateOf.map((duplicate) => `${duplicate.supplier} (${formatCurrency(duplicate.amount)})`).join(", ")}
            </span>
          </div>
        ) : null}
        <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-4">
          <Metric label="Gemiddeld" value={formatCurrency(candidate.amount)} />
          <Metric label="Frequentie" value={frequencyLabel(candidate.frequency)} />
          <Metric label="Maandbasis" value={formatCurrency(monthlyAmount(candidate))} />
          <Metric label="Reden" value={candidate.reason} />
        </dl>
      </div>
      <div className="grid gap-2">
        {canMutate ? (
        <form action={saveFixedExpense} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_8rem_9rem_auto] sm:items-end">
          <div>
            <FieldLabel htmlFor={`supplier-${candidate.id}`}>Leverancier</FieldLabel>
            <Input id={`supplier-${candidate.id}`} name="supplier" defaultValue={candidate.supplier} disabled={candidate.alreadyManaged} />
          </div>
          <div>
            <FieldLabel htmlFor={`category-${candidate.id}`}>Categorie</FieldLabel>
            <CategorySelect id={`category-${candidate.id}`} name="categoryId" categories={categories} defaultValue={defaultCategoryId} disabled={candidate.alreadyManaged} />
          </div>
          <div>
            <FieldLabel htmlFor={`amount-${candidate.id}`}>Bedrag</FieldLabel>
            <Input id={`amount-${candidate.id}`} name="amount" inputMode="decimal" defaultValue={String(candidate.amount).replace(".", ",")} disabled={candidate.alreadyManaged} />
          </div>
          <div>
            <FieldLabel htmlFor={`frequency-${candidate.id}`}>Frequentie</FieldLabel>
            <FrequencySelect id={`frequency-${candidate.id}`} name="frequency" defaultValue={candidate.frequency} disabled={candidate.alreadyManaged} />
          </div>
          <SubmitButton size="sm" variant="primary" disabled={candidate.alreadyManaged} pendingLabel="Accepteren...">
            Accepteren
          </SubmitButton>
          <input type="hidden" name="updateTransactions" value="on" />
          <input type="hidden" name="dueDateMode" value="automatic" />
        </form>
        ) : <ReadonlyNotice>Je kunt dit voorstel bekijken; accepteren of weigeren is alleen voor eigenaar of beheerder.</ReadonlyNotice>}
        {canMutate && !candidate.alreadyManaged ? (
          <form action={rejectFixedExpenseCandidate} className="flex flex-wrap items-center justify-end gap-2">
            <input type="hidden" name="candidateId" value={candidate.id} />
            <input type="hidden" name="supplier" value={candidate.supplier} />
            <input type="hidden" name="reason" value="Geen vaste last" />
            <Button type="submit" size="sm" variant="ghost">
              <Ban aria-hidden="true" size={13} /> Weigeren
            </Button>
          </form>
        ) : null}
      </div>
    </article>
  );
}

function CategorySelect({ id, name, categories, defaultValue, disabled = false, form }: { id: string; name: string; categories: Array<{ id: string; name: string }>; defaultValue?: string; disabled?: boolean; form?: string }) {
  return (
    <Select id={id} name={name} defaultValue={defaultValue} disabled={disabled} form={form}>
      {categories.map((category) => (
        <option key={category.id} value={category.id}>
          {category.name}
        </option>
      ))}
    </Select>
  );
}

function FrequencySelect({ id, name, defaultValue = "maandelijks", disabled = false, form }: { id: string; name: string; defaultValue?: Frequency; disabled?: boolean; form?: string }) {
  return (
    <Select id={id} name={name} defaultValue={defaultValue} disabled={disabled} form={form}>
      <option value="maandelijks">Maandelijks</option>
      <option value="vierwekelijks">Elke 4 weken</option>
      <option value="kwartaal">Kwartaal</option>
      <option value="jaarlijks">Jaarlijks</option>
    </Select>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-t border-border pt-2">
      <dt className="text-[0.62rem] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">{label}</dt>
      <dd className="mt-1 line-clamp-2 font-medium text-[var(--color-text)]">{value}</dd>
    </div>
  );
}

function frequencyLabel(frequency: Frequency) {
  if (frequency === "vierwekelijks") return "Elke 4 weken";
  if (frequency === "jaarlijks") return "Jaarlijks";
  if (frequency === "kwartaal") return "Kwartaal";
  return "Maandelijks";
}
