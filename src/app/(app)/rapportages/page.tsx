import Link from "next/link";
import { Activity, CalendarDays, CheckCheck, Download, EyeOff, ListChecks, PieChart, RotateCcw } from "lucide-react";
import { Button, ButtonLink, FieldLabel, Input, PageHeader, PeriodPager, Select, StatusBadge, SubmitButton } from "@/components/ui";
import { ReadonlyNotice } from "@/components/finance/readonly-notice";
import { ReportNavigation } from "@/components/finance/report-navigation";
import { formatCurrency } from "@/lib/format";
import { getBudgets, getFinanceDataset, getReportSignalStatuses } from "@/modules/finance/data-source";
import { requireUser } from "@/modules/auth/service";
import { setReportSignalStatus } from "@/modules/finance/actions";
import { moneyFlowLabels, resultLabel, resultStatus } from "@/modules/finance/ux-labels";
import {
  getAvailableReportPeriods,
  getActionSignals,
  getCashflowByPeriod,
  getCurrentReportPeriod,
  getPrivateExpenseReport,
  getReportExplanations,
  getReportNarrative,
  getReportPeriodDemonstrative,
  getReportPeriodLabel,
  getReportPeriodTypeLabel,
  getReportPeriodTypePlural,
  isReportPeriodType,
  parseReportReferenceWindow,
  type ReportPeriodType,
} from "@/modules/finance/reporting";
import { mergeActionSignalStatuses, type ActionSignalWithStatus } from "@/modules/finance/report-signal-status";

interface ReportsPageProps {
  searchParams?: Promise<{ period?: string; periodType?: string; referencePeriods?: string; view?: string }>;
}

type ReportView = "begroting" | "maanden" | "acties";

const labelClass = "text-[0.62rem] uppercase tracking-[0.22em] text-[var(--color-text-muted)]";
const chipClass = "border border-border px-2 py-1 text-[var(--color-text-muted)]";

const reportViews: Array<{ id: ReportView; label: string; title: string }> = [
  {
    id: "begroting",
    label: "Categorieën",
    title: "Uitgaven",
  },
  {
    id: "maanden",
    label: "Vergelijken",
    title: "Maandoverzicht",
  },
  {
    id: "acties",
    label: "Acties",
    title: "Acties",
  },
];

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const params = (await searchParams) ?? {};
  const [user, dataset] = await Promise.all([requireUser(), getFinanceDataset()]);
  const canMutate = user.role !== "readonly";
  const periodType = isReportPeriodType(params.periodType) ? params.periodType : "month";
  const periods = getAvailableReportPeriods(dataset.transactions, periodType);
  const selectedPeriod = params.period && periods.includes(params.period) ? params.period : periods[0] ?? getCurrentReportPeriod(periodType);
  const periodLabel = getReportPeriodLabel(selectedPeriod, periodType);
  const selectedView = reportViews.some((view) => view.id === params.view) ? (params.view as ReportView) : "begroting";
  const referenceWindow = parseReportReferenceWindow(params.referencePeriods);
  const selectedPeriodIndex = periods.indexOf(selectedPeriod);
  const previousPeriod = selectedPeriodIndex >= 0 ? periods[selectedPeriodIndex + 1] : undefined;
  const nextPeriod = selectedPeriodIndex > 0 ? periods[selectedPeriodIndex - 1] : undefined;
  const [budgets, signalStatuses] = await Promise.all([
    getBudgets(periodType === "month" ? selectedPeriod : undefined),
    selectedView === "acties" ? getReportSignalStatuses(selectedPeriod, periodType) : Promise.resolve([]),
  ]);
  const currentView = reportViews.find((view) => view.id === selectedView) ?? reportViews[0];
  const cashflow = getCashflowByPeriod(dataset.transactions, periodType);
  const budgetPeriodRows = cashflow.map((row) => ({
    period: row.period,
    label: getReportPeriodLabel(row.period, periodType),
    totals: {
      income: row.income,
      incomingAdjustments: 0,
      spendableExpenses: row.spendableExpenses,
      savings: row.savings,
      investments: row.investments,
      withdrawals: row.withdrawals,
      spendableNet: row.spendableNet,
    },
  }));
  const privateExpenseReport = getPrivateExpenseReport(dataset.transactions, dataset.categories, selectedPeriod, referenceWindow, periodType);
  const explanations = getReportExplanations(dataset.transactions, dataset.categories, budgets, selectedPeriod, periodType, referenceWindow);
  const narrative = getReportNarrative(dataset.transactions, dataset.categories, budgets, selectedPeriod, periodType, referenceWindow);
  const referenceLabel = privateExpenseReport.referenceMonths.length
    ? `Gem. ${privateExpenseReport.referenceMonths.length} ${privateExpenseReport.referenceMonths.length === 1 ? "periode" : "periodes"}`
    : "Geen historie";
  const availableIncome = privateExpenseReport.totals.income + privateExpenseReport.totals.incomingAdjustments;
  const spendableOutgoing = privateExpenseReport.totals.spendableExpenses;
  const savingsNet = privateExpenseReport.totals.savings - privateExpenseReport.totals.withdrawals;
  const investments = privateExpenseReport.totals.investments;
  const spendableMonthEnded = privateExpenseReport.totals.spendableNet;
  const savingsSection = privateExpenseReport.sections.find((section) => section.id === "savings");
  const withdrawalsSection = privateExpenseReport.sections.find((section) => section.id === "withdrawals");
  const savingsMutationRows = buildSavingsMutationRows(savingsSection?.rows ?? [], withdrawalsSection?.rows ?? []);
  const actionSignals = mergeActionSignalStatuses(
    selectedView === "acties" ? getActionSignals(dataset.transactions, dataset.categories, budgets, selectedPeriod, periodType) : [],
    signalStatuses,
  );
  const periodTypeLabel = getReportPeriodTypeLabel(periodType);
  const periodTypeLabelLower = periodTypeLabel.toLowerCase();
  const periodTypePlural = getReportPeriodTypePlural(periodType);
  const periodDemonstrative = getReportPeriodDemonstrative(periodType);
  const comparisonPeriodLabel = periodType === "month" ? periodLabel : periodLabel.replace(`${periodTypeLabel} `, "");
  const pageHeading = selectedView === "maanden" ? `${periodTypeLabel}overzicht ${comparisonPeriodLabel}` : `${currentView.title} ${periodLabel}`;

  return (
    <>
      <PageHeader
        eyebrow="Rapporten"
        title={pageHeading}
        description={selectedView === "maanden" ? `Vergelijk wat er per ${periodTypeLabelLower} binnenkwam en uitging.` : selectedView === "acties" ? "Werk controlepunten af zonder de analyse uit het oog te verliezen." : "Zie wat er binnenkwam, uitging en overbleef."}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={spendableMonthEnded >= 0 ? "success" : "warning"}>{resultStatus(spendableMonthEnded)}</StatusBadge>
            <PeriodPager
              label={periodLabel}
              previousHref={previousPeriod ? reportPeriodHref(previousPeriod, periodType, selectedView, referenceWindow) : undefined}
              nextHref={nextPeriod ? reportPeriodHref(nextPeriod, periodType, selectedView, referenceWindow) : undefined}
              previousLabel={previousPeriod ? getReportPeriodLabel(previousPeriod, periodType) : "Geen eerdere periode"}
              nextLabel={nextPeriod ? getReportPeriodLabel(nextPeriod, periodType) : "Geen latere periode"}
            />
          </div>
        }
        stats={[
          { label: resultLabel(spendableMonthEnded), value: `${spendableMonthEnded >= 0 ? "+" : "−"}${formatCurrency(Math.abs(spendableMonthEnded))}`, detail: "Na uitgaven, sparen en beleggen", lead: true, tone: spendableMonthEnded < 0 ? "risk" : undefined },
          { label: "Binnengekomen", value: formatCurrency(availableIncome), detail: `Plus ${formatCurrency(privateExpenseReport.totals.withdrawals)} uit sparen` },
          { label: "Uitgegeven", value: formatCurrency(spendableOutgoing), detail: "Gewone uitgaven" },
          { label: "Netto naar sparen", value: formatCurrency(savingsNet), detail: `${formatCurrency(privateExpenseReport.totals.savings)} erin · ${formatCurrency(privateExpenseReport.totals.withdrawals)} eruit` },
          { label: "Belegd", value: formatCurrency(investments), detail: periodLabel },
        ]}
      />

      <ReportNavigation active="month" />

      <section className="mb-8 border border-border bg-[var(--color-panel-strong)] p-5 md:p-6">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <nav className="flex flex-wrap gap-2" aria-label="Rapporttype">
            {reportViews.map((view) => (
              <Link
                key={view.id}
                href={reportPeriodHref(selectedPeriod, periodType, view.id, referenceWindow)}
                aria-current={view.id === selectedView ? "page" : undefined}
                className={view.id === selectedView ? "inline-flex min-h-9 items-center gap-1.5 border border-[var(--color-text)] bg-[var(--color-surface)] px-3 text-[0.66rem] uppercase tracking-[0.18em] text-[var(--color-text)]" : "inline-flex min-h-9 items-center gap-1.5 border border-border px-3 text-[0.66rem] uppercase tracking-[0.18em] text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-text)] hover:text-[var(--color-text)]"}
              >
                {view.id === "maanden" ? <Activity aria-hidden="true" size={13} /> : view.id === "acties" ? <ListChecks aria-hidden="true" size={13} /> : <PieChart aria-hidden="true" size={13} />}
                {view.label}
              </Link>
            ))}
          </nav>
          {selectedView !== "acties" ? <ButtonLink href={`/api/export/report?periodType=${periodType}&period=${selectedPeriod}&referencePeriods=${referenceWindow}`} size="sm">
            <Download aria-hidden="true" size={14} /> Download CSV
          </ButtonLink> : null}
        </div>
        <form action="/rapportages" className={`mt-5 grid gap-3 border-t border-border pt-5 sm:items-end ${selectedView === "acties" ? "sm:grid-cols-[8.5rem_11rem_auto]" : "sm:grid-cols-[8.5rem_11rem_11rem_auto]"} sm:justify-start`}>
          <input type="hidden" name="view" value={selectedView} />
          <div>
            <FieldLabel htmlFor="report-period-type">Periode</FieldLabel>
            <Select id="report-period-type" name="periodType" defaultValue={periodType}>
              <option value="month">Maand</option>
              <option value="quarter">Kwartaal</option>
              <option value="year">Jaar</option>
            </Select>
          </div>
          <div>
            <FieldLabel htmlFor="report-period">Kies periode</FieldLabel>
            {periodType === "month" ? (
              <Input id="report-period" name="period" type="month" defaultValue={selectedPeriod} />
            ) : (
              <Select id="report-period" name="period" defaultValue={selectedPeriod}>
                {periods.map((period) => (
                  <option key={period} value={period}>{getReportPeriodLabel(period, periodType)}</option>
                ))}
              </Select>
            )}
          </div>
          {selectedView !== "acties" ? <div>
            <FieldLabel htmlFor="report-reference-periods">Vergelijk met</FieldLabel>
            <Select id="report-reference-periods" name="referencePeriods" defaultValue={String(referenceWindow)}>
              <option value="3">Vorige 3 periodes</option>
              <option value="6">Vorige 6 periodes</option>
              <option value="12">Vorige 12 periodes</option>
            </Select>
          </div> : <input type="hidden" name="referencePeriods" value={referenceWindow} />}
          <Button type="submit" variant="primary">
            <CalendarDays aria-hidden="true" size={14} /> Tonen
          </Button>
        </form>
      </section>

      {selectedView !== "acties" ? (
        <>
          <CashflowStory
            income={availableIncome}
            expenses={spendableOutgoing}
            savings={privateExpenseReport.totals.savings}
            investments={investments}
          />
          <div className="mb-8 grid gap-4 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <ReportNarrativePanel narrative={narrative} referenceWindow={referenceWindow} periodTypePlural={periodTypePlural} />
            <ReportExplanationPanel explanations={explanations} />
          </div>
        </>
      ) : (
        <ReportActionPanel signals={actionSignals} canMutate={canMutate} period={selectedPeriod} periodType={periodType} referenceWindow={referenceWindow} />
      )}

      {selectedView === "maanden" ? (
        <>
          <section className={`mb-8 border border-border border-l-2 bg-[var(--color-panel-strong)] p-5 md:p-6 ${spendableMonthEnded >= 0 ? "border-l-[var(--color-success)]" : "border-l-[var(--color-warning)]"}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className={labelClass}>{resultStatus(spendableMonthEnded)}</p>
                <h2 className="mt-1.5 text-base font-normal text-[var(--color-text)]">
                  {spendableMonthEnded >= 0 ? `${periodDemonstrative} kon betaald worden` : `${periodDemonstrative} vroeg om spaargeld`}
                </h2>
                <p className="mt-1 max-w-3xl font-[family-name:var(--font-serif-house)] text-sm leading-6 text-[var(--color-text-muted)]">
                  Beschikbaar is wat binnenkwam plus wat je van de spaarrekening haalde. Daarna gaan uitgaven, sparen en beleggen eraf.
                </p>
              </div>
              <span className={`money-value text-3xl font-extralight ${spendableMonthEnded >= 0 ? "text-[var(--color-success)]" : "text-[var(--color-warning)]"}`}>
                {formatCurrency(spendableMonthEnded)}
              </span>
            </div>
          </section>
          <PeriodCategoryBreakdown report={privateExpenseReport} savingsMutationRows={savingsMutationRows} periodTypeLabel={periodTypeLabelLower} />
        </>
      ) : null}

      {selectedView === "begroting" ? (
      <section className="mb-8 border border-border bg-[var(--color-panel-strong)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <p className={labelClass}>Spaarrekening</p>
            <h2 className="mt-1 text-base font-normal text-[var(--color-text)]">Sparen</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[0.68rem]">
            <span className={chipClass}>{moneyFlowLabels.savingsIn} {formatCurrency(privateExpenseReport.totals.savings)}</span>
            <span className={chipClass}>{moneyFlowLabels.savingsOut} <span className="text-[var(--color-success)]">{formatCurrency(privateExpenseReport.totals.withdrawals)}</span></span>
            <span className={chipClass}>Netto naar sparen {formatCurrency(savingsNet)}</span>
          </div>
        </div>
        <SavingsMutationSection rows={savingsMutationRows} />
      </section>
      ) : null}

      {selectedView === "begroting" ? (
      <section className="mb-8 border border-border bg-[var(--color-panel-strong)]">
        <div className="border-b border-border px-5 py-4">
          <p className={labelClass}>Per categorie</p>
          <h2 className="mt-1 text-base font-normal text-[var(--color-text)]">Alle uitgaven</h2>
        </div>
        <div className="divide-y divide-border">
          {privateExpenseReport.sections.filter((section) => !["savings", "withdrawals", "investments"].includes(section.id)).map((section) => (
            <ReportSection key={section.id} section={section} referenceLabel={referenceLabel} periodTypeLabel={periodTypeLabel} />
          ))}
        </div>
      </section>
      ) : null}

      {selectedView === "maanden" ? (
      <section className="mb-8 border border-border bg-[var(--color-panel-strong)]">
        <div className="border-b border-border px-5 py-4">
          <p className={labelClass}>Vergelijken</p>
          <h2 className="mt-1 text-base font-normal text-[var(--color-text)]">Vergelijk {periodTypePlural}</h2>
        </div>
        <div className="grid gap-2 p-4 md:hidden">
          {budgetPeriodRows.map((row) => {
            const rowIncome = row.totals.income + row.totals.incomingAdjustments;
            const rowOutgoing = row.totals.spendableExpenses;
            const rowWithdrawals = row.totals.withdrawals;
            const rowSpendableNet = row.totals.spendableNet;
            return (
              <Link
                key={row.period}
                href={reportPeriodHref(row.period, periodType, "maanden", referenceWindow)}
                className={row.period === selectedPeriod ? "border border-[var(--color-text)] bg-[var(--color-surface)] p-3" : "border border-border bg-[var(--color-panel-strong)] p-3"}
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="text-sm text-[var(--color-text)]">{row.label}</span>
                  <StatusBadge tone={rowSpendableNet >= 0 ? "success" : "warning"}>{resultStatus(rowSpendableNet)}</StatusBadge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <MobileAmount label={moneyFlowLabels.income} value={rowIncome} tone="positive" />
                  <MobileAmount label={moneyFlowLabels.savingsOut} value={rowWithdrawals} tone="positive" />
                  <MobileAmount label={moneyFlowLabels.expenses} value={rowOutgoing} />
                  <MobileAmount label={moneyFlowLabels.savingsIn} value={row.totals.savings} />
                  <MobileAmount label={moneyFlowLabels.investmentsIn} value={row.totals.investments} />
                  <MobileAmount label={resultLabel(rowSpendableNet)} value={rowSpendableNet} tone={rowSpendableNet >= 0 ? "positive" : "negative"} strong />
                </div>
              </Link>
            );
          })}
        </div>
        <div className="table-responsive hidden md:block">
          <table className="data-table-modern w-full min-w-[58rem] border-collapse text-left text-xs">
            <thead className="border-b border-border text-[var(--color-text-muted)]">
              <tr>
                <th className="px-5 py-2.5">{periodTypeLabel}</th>
                <th className="px-3 py-2.5 text-right">{moneyFlowLabels.income}</th>
                <th className="px-3 py-2.5 text-right">{moneyFlowLabels.savingsOut}</th>
                <th className="px-3 py-2.5 text-right">{moneyFlowLabels.expenses}</th>
                <th className="px-3 py-2.5 text-right">{moneyFlowLabels.savingsIn}</th>
                <th className="px-3 py-2.5 text-right">{moneyFlowLabels.investmentsIn}</th>
                <th className="px-3 py-2.5 text-right">{moneyFlowLabels.result}</th>
                <th className="px-5 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {budgetPeriodRows.map((row) => {
                const rowIncome = row.totals.income + row.totals.incomingAdjustments;
                const rowOutgoing = row.totals.spendableExpenses;
                const rowWithdrawals = row.totals.withdrawals;
                const rowSpendableNet = row.totals.spendableNet;
                return (
                  <tr key={row.period} className={row.period === selectedPeriod ? "bg-[var(--color-surface)]" : undefined}>
                    <td className="px-5 py-2.5 text-[var(--color-text)]">
                      <Link href={reportPeriodHref(row.period, periodType, "maanden", referenceWindow)} className="hover:underline">{row.label}</Link>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-[var(--color-success)]">{formatCurrency(rowIncome)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-[var(--color-success)]">{formatCurrency(rowWithdrawals)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{formatCurrency(rowOutgoing)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{formatCurrency(row.totals.savings)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{formatCurrency(row.totals.investments)}</td>
                    <td className={rowSpendableNet >= 0 ? "px-3 py-2.5 text-right tabular-nums text-[var(--color-success)]" : "px-3 py-2.5 text-right tabular-nums text-[var(--color-warning)]"}>
                      {formatCurrency(rowSpendableNet)}
                    </td>
                    <td className="px-5 py-2.5">
                      <StatusBadge tone={rowSpendableNet >= 0 ? "success" : "warning"}>{resultStatus(rowSpendableNet)}</StatusBadge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      ) : null}
    </>
  );
}

type ReportDetailRow = { label: string; amount: number; referenceAmount: number; delta: number; count: number };
type GroupedReportRow = {
  label: string;
  amount: number;
  referenceAmount: number;
  delta: number;
  rows: ReportDetailRow[];
};
type SavingsMutationRow = {
  label: string;
  savings: number;
  withdrawals: number;
  net: number;
  referenceNet: number;
  count: number;
};
type MonthCategoryBreakdownProps = {
  report: ReturnType<typeof getPrivateExpenseReport>;
  savingsMutationRows: SavingsMutationRow[];
};

function ReportActionPanel({ signals, canMutate, period, periodType, referenceWindow }: { signals: ActionSignalWithStatus[]; canMutate: boolean; period: string; periodType: ReportPeriodType; referenceWindow: number }) {
  const openSignals = signals.filter((signal) => signal.status === "open");
  const handledSignals = signals.filter((signal) => signal.status !== "open");
  return (
    <section className="mb-8" aria-labelledby="report-actions-title">
      <div className="section-head">
        <h2 id="report-actions-title">Wat verdient aandacht?</h2>
        <p>Signalen komen alleen uit transacties, budgetten en bekende patronen. Een status verandert geen financiële data.</p>
      </div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className={labelClass}>Deterministische controle</p>
        <StatusBadge tone={openSignals.length ? "warning" : "success"}>{openSignals.length ? `${openSignals.length} open` : "Alles bekeken"}</StatusBadge>
      </div>
      {!canMutate ? <div className="mb-4"><ReadonlyNotice /></div> : null}
      <div className="grid gap-4 lg:grid-cols-2">
        {openSignals.map((signal) => <ReportSignalCard key={signal.id} signal={signal} canMutate={canMutate} period={period} periodType={periodType} referenceWindow={referenceWindow} />)}
      </div>
      {!openSignals.length ? <p className="border border-border border-l-2 border-l-[var(--color-success)] bg-[var(--color-panel-strong)] p-5 text-sm text-[var(--color-text)]">Er staan geen open controlepunten voor deze periode.</p> : null}
      {handledSignals.length ? (
        <details className="mt-4 border border-border bg-[var(--color-panel-strong)]">
          <summary className="cursor-pointer px-5 py-3 text-[0.66rem] uppercase tracking-[0.18em] text-[var(--color-text)]">Afgehandeld of genegeerd ({handledSignals.length})</summary>
          <div className="grid gap-4 border-t border-border p-5 lg:grid-cols-2">{handledSignals.map((signal) => <ReportSignalCard key={signal.id} signal={signal} canMutate={canMutate} period={period} periodType={periodType} referenceWindow={referenceWindow} />)}</div>
        </details>
      ) : null}
    </section>
  );
}

function ReportSignalCard({ signal, canMutate, period, periodType, referenceWindow }: { signal: ActionSignalWithStatus; canMutate: boolean; period: string; periodType: ReportPeriodType; referenceWindow: number }) {
  const statusLabel = signal.status === "resolved" ? "Afgehandeld" : signal.status === "dismissed" ? "Genegeerd" : "Open";
  return (
    <article className={`border border-border bg-[var(--color-panel-strong)] p-5 ${signal.status === "open" && signal.tone === "warning" ? "border-l-2 border-l-[var(--color-warning)]" : ""}`}>
      <div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-normal text-[var(--color-text)]">{signal.title}</h3><StatusBadge tone={signal.status === "resolved" ? "success" : signal.status === "dismissed" ? "neutral" : signal.tone}>{statusLabel}</StatusBadge></div><p className="mt-1 text-xs leading-5 text-[var(--color-text-muted)]">{signal.detail}</p></div><span className="shrink-0 text-sm tabular-nums text-[var(--color-text)]">{formatCurrency(signal.amount)}</span></div>
      <p className="mt-2 text-[0.68rem] text-[var(--color-text-subtle)]">{signal.count} {signal.count === 1 ? "boeking" : "boekingen"}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <ButtonLink href={signal.href} size="sm" variant="secondary">{signal.actionLabel}</ButtonLink>
        {canMutate && signal.status === "open" ? <SignalStatusForm signal={signal} period={period} periodType={periodType} referenceWindow={referenceWindow} status="resolved"><CheckCheck aria-hidden="true" size={14} /> Afhandelen</SignalStatusForm> : null}
        {canMutate && signal.status === "open" ? <SignalStatusForm signal={signal} period={period} periodType={periodType} referenceWindow={referenceWindow} status="dismissed" variant="ghost"><EyeOff aria-hidden="true" size={14} /> Negeren</SignalStatusForm> : null}
        {canMutate && signal.status !== "open" ? <SignalStatusForm signal={signal} period={period} periodType={periodType} referenceWindow={referenceWindow} status="open" variant="ghost"><RotateCcw aria-hidden="true" size={14} /> Heropenen</SignalStatusForm> : null}
      </div>
    </article>
  );
}

function SignalStatusForm({ signal, period, periodType, referenceWindow, status, variant = "secondary", children }: { signal: ActionSignalWithStatus; period: string; periodType: ReportPeriodType; referenceWindow: number; status: "open" | "resolved" | "dismissed"; variant?: "secondary" | "ghost"; children: React.ReactNode }) {
  return <form action={setReportSignalStatus}><input type="hidden" name="signalId" value={signal.id} /><input type="hidden" name="period" value={period} /><input type="hidden" name="periodType" value={periodType} /><input type="hidden" name="referencePeriods" value={referenceWindow} /><input type="hidden" name="status" value={status} /><SubmitButton size="sm" variant={variant} pendingLabel="Opslaan...">{children}</SubmitButton></form>;
}

function CashflowStory({ income, expenses, savings, investments }: { income: number; expenses: number; savings: number; investments: number }) {
  const rows = [
    { label: "Binnengekomen", value: income, color: "var(--chart-2)" },
    { label: "Uitgegeven", value: expenses, color: "var(--chart-3)" },
    { label: "Gespaard", value: savings, color: "var(--chart-4)" },
    { label: "Belegd", value: investments, color: "var(--chart-4)" },
  ];
  const maximum = Math.max(...rows.map((row) => row.value), 1);

  return (
    <section className="mb-8" aria-labelledby="report-story-title">
      <div className="section-head">
        <h2 id="report-story-title">In één beeld</h2>
        <p>Wat kwam binnen en wat ging eruit, naast elkaar.</p>
      </div>
      <div className="grid grid-cols-2 gap-4 border border-border bg-[var(--color-panel-strong)] p-5 sm:grid-cols-4 md:gap-8 md:p-6">
        {rows.map((row) => (
          <div key={row.label} className="grid min-w-0 grid-rows-[10rem_auto_auto] gap-1.5">
            <div className="flex items-end border-b border-border">
              <span className="block w-full max-w-[4.5rem]" style={{ height: `${Math.max((row.value / maximum) * 100, row.value ? 3 : 0.5)}%`, backgroundColor: row.color }} />
            </div>
            <span className="money-value mt-2 truncate text-lg font-extralight text-[var(--color-text)]">{formatCurrency(row.value)}</span>
            <span className={labelClass}>{row.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

type ReportExplanationItem = ReturnType<typeof getReportExplanations>[number];
type ReportNarrativeItem = ReturnType<typeof getReportNarrative>;

function ReportNarrativePanel({ narrative, referenceWindow, periodTypePlural }: { narrative: ReportNarrativeItem; referenceWindow: number; periodTypePlural: string }) {
  return (
    <section className="border border-border bg-[var(--color-panel-strong)] p-5 md:p-6" aria-labelledby="report-narrative-title">
      <p className={labelClass}>Regelgebaseerde uitleg</p>
      <h2 id="report-narrative-title" className="mt-1.5 text-base font-normal text-[var(--color-text)]">{narrative.title}</h2>
      <p className="mt-3 max-w-4xl font-[family-name:var(--font-serif-house)] text-sm leading-6 text-[var(--color-text)]">{narrative.summary}</p>
      <p className="mt-3 text-[0.68rem] text-[var(--color-text-muted)]">Berekend uit transacties, budgetten en de vorige {referenceWindow} {periodTypePlural}; er wordt geen externe AI gebruikt.</p>
    </section>
  );
}

function ReportExplanationPanel({ explanations }: { explanations: ReportExplanationItem[] }) {
  const visibleExplanations = explanations.slice(0, 3);
  return (
    <section className="report-differences border border-border bg-[var(--color-panel-strong)] p-5 md:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className={labelClass}>Verschillen</p>
          <h2 className="mt-1.5 text-base font-normal text-[var(--color-text)]">Wat valt op?</h2>
        </div>
        <StatusBadge tone={explanations.length ? "info" : "success"}>{explanations.length ? `${visibleExplanations.length} belangrijk${visibleExplanations.length === 1 ? " punt" : "ste"}` : "Geen grote verschillen"}</StatusBadge>
      </div>
      {explanations.length ? (
        <div className="grid gap-3 md:grid-cols-3">
          {visibleExplanations.map((explanation) => (
            <article key={explanation.id} className={`border border-border border-l-2 p-4 ${explanation.tone === "warning" ? "border-l-[var(--color-warning)]" : explanation.tone === "success" ? "border-l-[var(--color-success)]" : "border-l-[var(--color-border-strong)]"}`}>
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-sm font-normal text-[var(--color-text)]">{explanation.title}</h3>
                <span className={explanation.amount >= 0 ? "shrink-0 text-sm tabular-nums text-[var(--color-warning)]" : "shrink-0 text-sm tabular-nums text-[var(--color-success)]"}>{formatCurrency(explanation.amount)}</span>
              </div>
              {explanation.referenceAmount != null ? (
                <p className="mt-2 text-xs text-[var(--color-text-muted)]">Gemiddeld: {formatCurrency(explanation.referenceAmount)}</p>
              ) : (
                <p className="mt-2 text-xs leading-5 text-[var(--color-text-muted)]">{explanation.detail}</p>
              )}
            </article>
          ))}
        </div>
      ) : (
        <p className="text-sm text-[var(--color-text-muted)]">Deze periode lijkt op de vorige periodes.</p>
      )}
    </section>
  );
}

function buildSavingsMutationRows(savingsRows: ReportDetailRow[], withdrawalRows: ReportDetailRow[]): SavingsMutationRow[] {
  const savings = savingsRows.reduce((sum, row) => sum + row.amount, 0);
  const withdrawals = withdrawalRows.reduce((sum, row) => sum + row.amount, 0);
  const referenceNet = savingsRows.reduce((sum, row) => sum + row.referenceAmount, 0) - withdrawalRows.reduce((sum, row) => sum + row.referenceAmount, 0);
  const count = savingsRows.reduce((sum, row) => sum + row.count, 0) + withdrawalRows.reduce((sum, row) => sum + row.count, 0);

  if (savings === 0 && withdrawals === 0) return [];
  return [{
    label: "Spaarrekening",
    savings,
    withdrawals,
    net: savings - withdrawals,
    referenceNet,
    count,
  }];
}

function SavingsMutationSection({ rows }: { rows: SavingsMutationRow[] }) {
  if (!rows.length) {
    return <p className="px-5 py-4 text-xs text-[var(--color-text-muted)]">Geen bewegingen van of naar sparen in deze periode.</p>;
  }

  return (
    <div className="px-5 py-4">
      <div className="grid gap-2 md:hidden">
        {rows.map((row) => (
          <article key={row.label} className="border border-border bg-[var(--color-panel-strong)] p-3">
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="min-w-0 truncate text-sm text-[var(--color-text)]">{row.label}</span>
              <span className={row.net >= 0 ? "shrink-0 text-sm tabular-nums text-[var(--color-text)]" : "shrink-0 text-sm tabular-nums text-[var(--color-success)]"}>{formatCurrency(row.net)}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <MobileAmount label={moneyFlowLabels.savingsIn} value={row.savings} />
              <MobileAmount label={moneyFlowLabels.savingsOut} value={row.withdrawals} tone="positive" />
              <MobileAmount label="Gem. netto" value={row.referenceNet} />
            </div>
          </article>
        ))}
      </div>
      <div className="table-responsive hidden md:block">
      <table className="w-full min-w-[46rem] table-fixed border-collapse text-xs">
        <colgroup>
          <col className="w-[34%]" />
          <col className="w-[17%]" />
          <col className="w-[17%]" />
          <col className="w-[17%]" />
          <col className="w-[15%]" />
        </colgroup>
        <thead className="text-[0.6rem] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
          <tr className="border-b border-border">
            <th className="py-1.5 pr-2 text-left font-normal">Spaarrekening</th>
	            <th className="px-3 py-1.5 text-right font-normal tabular-nums">{moneyFlowLabels.savingsIn}</th>
	            <th className="px-3 py-1.5 text-right font-normal tabular-nums">{moneyFlowLabels.savingsOut}</th>
	            <th className="px-3 py-1.5 text-right font-normal tabular-nums">Netto spaarrekening</th>
            <th className="py-1.5 pl-3 text-right font-normal tabular-nums">Gem. netto</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => (
            <tr key={row.label}>
              <td className="py-1.5 pr-2 text-[var(--color-text)]">
                <span className="block truncate">{row.label}</span>
              </td>
              <td className="px-3 py-1.5 text-right tabular-nums">{formatCurrency(row.savings)}</td>
              <td className="px-3 py-1.5 text-right text-[var(--color-success)] tabular-nums">{formatCurrency(row.withdrawals)}</td>
              <td className={row.net >= 0 ? "px-3 py-1.5 text-right text-[var(--color-text)] tabular-nums" : "px-3 py-1.5 text-right text-[var(--color-success)] tabular-nums"}>
                {formatCurrency(row.net)}
              </td>
              <td className="py-1.5 pl-3 text-right text-[var(--color-text-muted)] tabular-nums">{formatCurrency(row.referenceNet)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}

function MobileAmount({ label, value, tone = "neutral", strong = false }: { label: string; value: number; tone?: "neutral" | "positive" | "negative"; strong?: boolean }) {
  const valueClass = tone === "positive" ? "text-[var(--color-success)]" : tone === "negative" ? "text-[var(--color-warning)]" : "text-[var(--color-text)]";
  return (
    <div className={strong ? "col-span-2 border border-border px-2.5 py-2" : "bg-[var(--color-surface)] px-2.5 py-2"}>
      <span className="block text-[0.58rem] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">{label}</span>
      <span className={`mt-0.5 block tabular-nums ${valueClass}`}>{formatCurrency(value)}</span>
    </div>
  );
}

function PeriodCategoryBreakdown({ report, savingsMutationRows, periodTypeLabel }: MonthCategoryBreakdownProps & { periodTypeLabel: string }) {
  const incomeSections = report.sections.filter((section) => ["income", "incomingAdjustments"].includes(section.id));
  const expenseSections = report.sections.filter((section) => ["fixed", "reservations", "household"].includes(section.id));
  const investmentSections = report.sections.filter((section) => section.id === "investments");
  const totalIncome = report.totals.income + report.totals.incomingAdjustments;
  const totalExpenses = report.totals.spendableExpenses;

  return (
    <section className="mb-8 border border-border bg-[var(--color-panel-strong)]">
      <div className="border-b border-border px-5 py-4">
        <p className={labelClass}>Opbouw</p>
        <h2 className="mt-1 text-base font-normal text-[var(--color-text)]">Uitleg gekozen {periodTypeLabel}</h2>
      </div>
      <div className="grid gap-4 p-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        <div className="grid content-start gap-3">
          <CategoryFlowBlock
            title="Binnengekomen"
            total={totalIncome}
            sections={incomeSections}
            amountTone="positive"
          />
          <SavingsFlowBlock rows={savingsMutationRows} />
          <CategoryFlowBlock
            title={moneyFlowLabels.investmentsIn}
            total={report.totals.investments}
            sections={investmentSections}
            amountTone="neutral"
          />
        </div>
        <CategoryFlowBlock
          title="Uitgegeven per categorie"
          total={totalExpenses}
          sections={expenseSections}
          amountTone="neutral"
        />
      </div>
    </section>
  );
}

function CategoryFlowBlock({
  title,
  total,
  sections,
  amountTone,
}: {
  title: string;
  total: number;
  sections: MonthCategoryBreakdownProps["report"]["sections"];
  amountTone: "neutral" | "positive";
}) {
  const groups = sections.flatMap((section) =>
    groupReportRows(section.rows).map((group) => ({
      ...group,
      sectionTitle: section.title,
    })),
  );

  return (
    <section className="border border-border">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-[var(--color-surface)] px-3 py-2">
        <h3 className="text-[0.62rem] font-normal uppercase tracking-[0.22em] text-[var(--color-text-muted)]">{title}</h3>
        <strong className={amountTone === "positive" ? "shrink-0 text-sm font-normal tabular-nums text-[var(--color-success)]" : "shrink-0 text-sm font-normal tabular-nums text-[var(--color-text)]"}>
          {formatCurrency(total)}
        </strong>
      </div>
      {groups.length ? (
        <div className="divide-y divide-border">
          {groups.map((group) => (
            <div key={`${group.sectionTitle}-${group.label}`} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 px-3 py-2 text-xs">
              <div className="min-w-0">
                <span className="block truncate text-[var(--color-text)]">{group.label}</span>
                <span className="text-[var(--color-text-muted)]">{group.sectionTitle}</span>
              </div>
              <span className={amountTone === "positive" ? "tabular-nums text-[var(--color-success)]" : "tabular-nums text-[var(--color-text)]"}>{formatCurrency(group.amount)}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="px-3 py-2 text-xs text-[var(--color-text-muted)]">Geen bedragen in deze periode.</p>
      )}
    </section>
  );
}

function SavingsFlowBlock({ rows }: { rows: SavingsMutationRow[] }) {
  const savings = rows.reduce((sum, row) => sum + row.savings, 0);
  const withdrawals = rows.reduce((sum, row) => sum + row.withdrawals, 0);
  const net = savings - withdrawals;

  return (
    <section className="border border-border">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-[var(--color-surface)] px-3 py-2">
        <h3 className="text-[0.62rem] font-normal uppercase tracking-[0.22em] text-[var(--color-text-muted)]">Spaarrekening</h3>
        <span className={net >= 0 ? "shrink-0 text-sm tabular-nums text-[var(--color-text)]" : "shrink-0 text-sm tabular-nums text-[var(--color-success)]"}>{formatCurrency(net)}</span>
      </div>
      {rows.length ? (
        <div className="grid gap-2 p-3 text-xs sm:grid-cols-3">
          <MobileAmount label={moneyFlowLabels.savingsIn} value={savings} />
          <MobileAmount label={moneyFlowLabels.savingsOut} value={withdrawals} tone="positive" />
          <MobileAmount label="Netto spaarrekening" value={net} tone={net >= 0 ? "neutral" : "positive"} strong />
        </div>
      ) : (
        <p className="px-3 py-2 text-xs text-[var(--color-text-muted)]">Geen bewegingen van of naar sparen.</p>
      )}
    </section>
  );
}

function ReportSection({
  section,
  referenceLabel,
  periodTypeLabel,
}: {
  section: {
    id: string;
    title: string;
    total: number;
    referenceTotal: number;
    rows: Array<{ label: string; amount: number; referenceAmount: number; delta: number; count: number }>;
  };
  referenceLabel: string;
  periodTypeLabel: string;
}) {
  const groupedRows = groupReportRows(section.rows);
  const showGroupedRows = groupedRows.some((group) => group.rows.length > 1 || group.rows[0]?.label !== group.label);

  return (
    <section className="px-5 py-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-normal text-[var(--color-text)]">{section.title}</h3>
        <div className="flex flex-wrap items-center gap-2 text-[0.68rem]">
          <span className={chipClass}>{periodTypeLabel} {formatCurrency(section.total)}</span>
          <span className={chipClass}>{referenceLabel} {formatCurrency(section.referenceTotal)}</span>
          <span className={`${chipClass} ${section.total - section.referenceTotal > 0 ? "text-[var(--color-warning)]" : "text-[var(--color-success)]"}`}>
            Verschil {formatCurrency(section.total - section.referenceTotal)}
          </span>
        </div>
      </div>
      <div className="table-responsive">
        <table className="w-full min-w-[44rem] table-fixed border-collapse text-xs">
          <colgroup>
            <col className="w-[46%]" />
            <col className="w-[18%]" />
            <col className="w-[18%]" />
            <col className="w-[18%]" />
          </colgroup>
          <thead className="text-[0.6rem] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
            <tr className="border-b border-border">
              <th className="py-1.5 pr-2 text-left font-normal">Post</th>
              <th className="px-3 py-1.5 text-right font-normal tabular-nums">{periodTypeLabel}</th>
              <th className="px-3 py-1.5 text-right font-normal tabular-nums">{referenceLabel}</th>
              <th className="py-1.5 pl-3 text-right font-normal tabular-nums">Verschil</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {showGroupedRows
              ? groupedRows.map((group) => (
                  <ReportGroupRows key={group.label} group={group} />
                ))
              : section.rows.map((row) => (
                  <ReportDetailTableRow key={row.label} row={row} />
                ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ReportGroupRows({ group }: { group: GroupedReportRow }) {
  return (
    <>
      <tr className="bg-[var(--color-surface)]">
        <td className="py-1.5 pr-2 text-[var(--color-text)]">
          <span className="block truncate">{group.label}</span>
        </td>
        <td className="px-3 py-1.5 text-right tabular-nums">{formatCurrency(group.amount)}</td>
        <td className="px-3 py-1.5 text-right text-[var(--color-text-muted)] tabular-nums">{formatCurrency(group.referenceAmount)}</td>
        <td className={group.delta > 0 ? "py-1.5 pl-3 text-right text-[var(--color-warning)] tabular-nums" : "py-1.5 pl-3 text-right text-[var(--color-success)] tabular-nums"}>
          {formatCurrency(group.delta)}
        </td>
      </tr>
      {group.rows.map((row) => (
        <ReportDetailTableRow key={row.label} row={row} compactLabel={stripReportCategory(row.label, group.label)} />
      ))}
    </>
  );
}

function ReportDetailTableRow({ row, compactLabel }: { row: ReportDetailRow; compactLabel?: string }) {
  return (
    <tr>
      <td className="py-1.5 pr-2 text-[var(--color-text)]">
        <span className={compactLabel ? "block truncate pl-3 text-[var(--color-text-muted)]" : "block truncate"}>{compactLabel ?? row.label}</span>
      </td>
      <td className="px-3 py-1.5 text-right tabular-nums">{formatCurrency(row.amount)}</td>
      <td className="px-3 py-1.5 text-right text-[var(--color-text-muted)] tabular-nums">{formatCurrency(row.referenceAmount)}</td>
      <td className={row.delta > 0 ? "py-1.5 pl-3 text-right text-[var(--color-warning)] tabular-nums" : "py-1.5 pl-3 text-right text-[var(--color-success)] tabular-nums"}>
        {formatCurrency(row.delta)}
      </td>
    </tr>
  );
}

function groupReportRows(rows: ReportDetailRow[]) {
  const groups = new Map<string, GroupedReportRow>();

  for (const row of rows) {
    const groupLabel = getReportCategoryLabel(row.label);
    const group = groups.get(groupLabel) ?? { label: groupLabel, amount: 0, referenceAmount: 0, delta: 0, rows: [] };
    group.amount += row.amount;
    group.referenceAmount += row.referenceAmount;
    group.delta += row.delta;
    group.rows.push(row);
    groups.set(groupLabel, group);
  }

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      amount: roundMoney(group.amount),
      referenceAmount: roundMoney(group.referenceAmount),
      delta: roundMoney(group.delta),
      rows: group.rows.sort((a, b) => b.amount - a.amount || a.label.localeCompare(b.label)),
    }))
    .sort((a, b) => b.amount - a.amount || a.label.localeCompare(b.label));
}

function getReportCategoryLabel(label: string) {
  const separator = label.indexOf(" - ");
  return separator > 0 ? label.slice(0, separator) : label;
}

function stripReportCategory(label: string, categoryLabel: string) {
  const prefix = `${categoryLabel} - `;
  return label.startsWith(prefix) ? label.slice(prefix.length) : label;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function reportPeriodHref(period: string, periodType: ReportPeriodType, view: ReportView, referenceWindow: number) {
  return `/rapportages?periodType=${periodType}&period=${period}&view=${view}&referencePeriods=${referenceWindow}`;
}
