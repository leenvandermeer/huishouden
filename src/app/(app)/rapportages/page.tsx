import Link from "next/link";
import type { CSSProperties } from "react";
import { Activity, CalendarDays, CheckCheck, Download, EyeOff, Lightbulb, ListChecks, PieChart, RotateCcw } from "lucide-react";
import { Button, ButtonLink, FieldLabel, Input, PeriodPager, Select, StatusBadge, SubmitButton } from "@/components/ui";
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
    <div className="cockpit-canvas grid gap-3">
      <ReportNavigation active="month" />

      <section className="command-panel view-card rounded-[var(--radius-lg)] p-4 md:p-5">
        <div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex rounded-md bg-[var(--color-accent-subtle)] px-2 py-0.5 text-[0.58rem] font-bold uppercase tracking-[0.14em] text-accent">Rapporten</span>
              <StatusBadge tone={spendableMonthEnded >= 0 ? "success" : "warning"}>{resultStatus(spendableMonthEnded)}</StatusBadge>
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <div>
                <h1 className="max-w-4xl text-3xl font-semibold leading-tight text-[var(--color-brand-strong)] sm:text-4xl">{pageHeading}</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-text-muted)]">
                  {selectedView === "maanden" ? `Vergelijk wat er per ${periodTypeLabelLower} binnenkwam en uitging.` : selectedView === "acties" ? "Werk controlepunten af zonder de analyse uit het oog te verliezen." : "Zie wat er binnenkwam, uitging en overbleef."}
                </p>
              </div>
              <div className="grid justify-start gap-2 lg:justify-end">
                <PeriodPager
                  label={periodLabel}
                  previousHref={previousPeriod ? reportPeriodHref(previousPeriod, periodType, selectedView, referenceWindow) : undefined}
                  nextHref={nextPeriod ? reportPeriodHref(nextPeriod, periodType, selectedView, referenceWindow) : undefined}
                  previousLabel={previousPeriod ? getReportPeriodLabel(previousPeriod, periodType) : "Geen eerdere periode"}
                  nextLabel={nextPeriod ? getReportPeriodLabel(nextPeriod, periodType) : "Geen latere periode"}
                  className="justify-start lg:justify-end"
                />
                <div className="text-left lg:text-right">
                  <span className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[var(--color-text-subtle)]">{resultLabel(spendableMonthEnded)}</span>
                  <strong className={spendableMonthEnded >= 0 ? "mt-1 block text-4xl font-semibold tabular-nums text-emerald-700" : "mt-1 block text-4xl font-semibold tabular-nums text-amber-800"}>{formatCurrency(spendableMonthEnded)}</strong>
                </div>
              </div>
            </div>
            <nav className="mt-5 flex flex-wrap gap-2" aria-label="Rapporttype">
              {reportViews.map((view) => (
                <Link
                  key={view.id}
                  href={reportPeriodHref(selectedPeriod, periodType, view.id, referenceWindow)}
                  className={view.id === selectedView ? "inline-flex min-h-8 items-center gap-1.5 rounded-md border border-brand bg-brand px-2.5 text-xs font-semibold text-white shadow-[var(--shadow-sm)]" : "inline-flex min-h-8 items-center gap-1.5 rounded-md border border-border bg-white/86 px-2.5 text-xs font-semibold text-brand shadow-[var(--shadow-sm)] transition hover:border-brand hover:bg-white"}
                >
                  {view.id === "maanden" ? <Activity aria-hidden="true" size={14} /> : view.id === "acties" ? <ListChecks aria-hidden="true" size={14} /> : <PieChart aria-hidden="true" size={14} />}
                  {view.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </section>

      <section className="surface-panel rounded-[var(--radius-lg)] p-2.5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <form action="/rapportages" className={`grid flex-1 gap-2 sm:items-end lg:flex-none ${selectedView === "acties" ? "sm:grid-cols-[8.5rem_11rem_auto]" : "sm:grid-cols-[8.5rem_11rem_11rem_auto]"}`}>
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
          {selectedView !== "acties" ? <ButtonLink href={`/api/export/report?periodType=${periodType}&period=${selectedPeriod}&referencePeriods=${referenceWindow}`}>
            <Download aria-hidden="true" size={14} /> Download CSV
          </ButtonLink> : null}
        </div>
      </section>

      {selectedView !== "acties" ? (
        <>
          <CashflowStory
            income={availableIncome}
            expenses={spendableOutgoing}
            savings={privateExpenseReport.totals.savings}
            investments={investments}
            result={spendableMonthEnded}
          />
          <ReportNarrativePanel narrative={narrative} referenceWindow={referenceWindow} periodTypePlural={periodTypePlural} />
          <ReportExplanationPanel explanations={explanations} />
        </>
      ) : (
        <ReportActionPanel signals={actionSignals} canMutate={canMutate} period={selectedPeriod} periodType={periodType} referenceWindow={referenceWindow} />
      )}

      {selectedView === "maanden" ? (
        <>
          <section className={spendableMonthEnded >= 0 ? "mb-3 rounded-[var(--radius-lg)] border border-emerald-200 bg-[var(--color-success-subtle)] p-3" : "mb-3 rounded-[var(--radius-lg)] border border-amber-200 bg-[var(--color-warning-subtle)] p-3"}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className={spendableMonthEnded >= 0 ? "text-base font-semibold text-emerald-800" : "text-base font-semibold text-amber-900"}>
                  {spendableMonthEnded >= 0 ? `${periodDemonstrative} kon betaald worden` : `${periodDemonstrative} vroeg om spaargeld`}
                </h2>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  Beschikbaar is wat binnenkwam plus wat je van de spaarrekening haalde. Daarna gaan uitgaven, sparen en beleggen eraf.
                </p>
              </div>
              <strong className={spendableMonthEnded >= 0 ? "text-xl tabular-nums text-emerald-800" : "text-xl tabular-nums text-amber-900"}>
                {formatCurrency(spendableMonthEnded)}
              </strong>
            </div>
          </section>
          <section className="grid gap-2 md:grid-cols-3 2xl:grid-cols-6">
            <SummaryMetric label={moneyFlowLabels.income} value={formatCurrency(availableIncome)} tone="positive" />
            <SummaryMetric label={moneyFlowLabels.savingsOut} value={formatCurrency(privateExpenseReport.totals.withdrawals)} tone="positive" />
            <SummaryMetric label={moneyFlowLabels.expenses} value={formatCurrency(spendableOutgoing)} />
            <SummaryMetric label={moneyFlowLabels.savingsIn} value={formatCurrency(privateExpenseReport.totals.savings)} />
            <SummaryMetric label={moneyFlowLabels.investmentsIn} value={formatCurrency(investments)} />
            <SummaryMetric label={resultLabel(spendableMonthEnded)} value={formatCurrency(spendableMonthEnded)} tone={spendableMonthEnded >= 0 ? "positive" : "negative"} strong />
          </section>
          <PeriodCategoryBreakdown report={privateExpenseReport} savingsMutationRows={savingsMutationRows} periodTypeLabel={periodTypeLabelLower} />
        </>
      ) : null}

      {selectedView === "begroting" ? (
      <section className="mt-3 rounded-[var(--radius-lg)] border border-border bg-white shadow-[var(--shadow-sm)]">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-3 py-2">
          <div>
            <h2 className="text-sm font-semibold text-brand">Sparen</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[0.68rem]">
            <span className="rounded-md bg-[var(--color-brand-subtle)] px-2 py-1 font-semibold text-brand">{moneyFlowLabels.savingsIn} {formatCurrency(privateExpenseReport.totals.savings)}</span>
            <span className="rounded-md bg-[var(--color-success-subtle)] px-2 py-1 font-semibold text-emerald-800">{moneyFlowLabels.savingsOut} {formatCurrency(privateExpenseReport.totals.withdrawals)}</span>
            <span className="rounded-md bg-[var(--color-surface)] px-2 py-1 font-semibold text-brand">Netto naar sparen {formatCurrency(savingsNet)}</span>
          </div>
        </div>
        <SavingsMutationSection rows={savingsMutationRows} />
      </section>
      ) : null}

      {selectedView === "begroting" ? (
      <section className="mt-3 rounded-[var(--radius-lg)] border border-border bg-white shadow-[var(--shadow-sm)]">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-3 py-2">
          <div>
            <h2 className="text-sm font-semibold text-brand">Alle uitgaven</h2>
          </div>
        </div>
        <div className="divide-y divide-border">
          {privateExpenseReport.sections.filter((section) => !["savings", "withdrawals", "investments"].includes(section.id)).map((section) => (
            <ReportSection key={section.id} section={section} referenceLabel={referenceLabel} periodTypeLabel={periodTypeLabel} />
          ))}
        </div>
      </section>
      ) : null}

      {selectedView === "maanden" ? (
      <section className="mt-3">
        <section className="rounded-[var(--radius-lg)] border border-border bg-white shadow-[var(--shadow-sm)]">
          <div className="border-b border-border px-3 py-2">
            <h2 className="text-sm font-semibold text-brand">Vergelijk {periodTypePlural}</h2>
          </div>
          <div className="grid gap-2 p-3 md:hidden">
            {budgetPeriodRows.map((row) => {
              const rowIncome = row.totals.income + row.totals.incomingAdjustments;
              const rowOutgoing = row.totals.spendableExpenses;
              const rowWithdrawals = row.totals.withdrawals;
              const rowSpendableNet = row.totals.spendableNet;
              return (
                <Link
                  key={row.period}
                  href={reportPeriodHref(row.period, periodType, "maanden", referenceWindow)}
                  className={row.period === selectedPeriod ? "rounded-md border border-brand bg-[var(--color-brand-subtle)] p-3" : "rounded-md border border-border bg-white p-3"}
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <strong className="text-sm text-brand">{row.label}</strong>
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
	            <table className="w-full min-w-[58rem] border-collapse text-left text-xs">
              <thead className="border-b border-border bg-[var(--color-surface)] text-[var(--color-text-subtle)]">
                <tr>
                  <th className="px-3 py-2">{periodTypeLabel}</th>
                  <th className="px-3 py-2 text-right">{moneyFlowLabels.income}</th>
                  <th className="px-3 py-2 text-right">{moneyFlowLabels.savingsOut}</th>
                  <th className="px-3 py-2 text-right">{moneyFlowLabels.expenses}</th>
                  <th className="px-3 py-2 text-right">{moneyFlowLabels.savingsIn}</th>
                  <th className="px-3 py-2 text-right">{moneyFlowLabels.investmentsIn}</th>
                  <th className="px-3 py-2 text-right">{moneyFlowLabels.result}</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {budgetPeriodRows.map((row) => {
                    const rowIncome = row.totals.income + row.totals.incomingAdjustments;
                    const rowOutgoing = row.totals.spendableExpenses;
                    const rowWithdrawals = row.totals.withdrawals;
                    const rowSpendableNet = row.totals.spendableNet;
                    return (
                      <tr key={row.period} className={row.period === selectedPeriod ? "bg-[var(--color-brand-subtle)]" : "hover:bg-[var(--color-surface)]"}>
                        <td className="px-3 py-2 font-semibold">
                          <Link href={reportPeriodHref(row.period, periodType, "maanden", referenceWindow)}>{row.label}</Link>
                        </td>
                        <td className="px-3 py-2 text-right text-emerald-700">{formatCurrency(rowIncome)}</td>
                        <td className="px-3 py-2 text-right text-emerald-700">{formatCurrency(rowWithdrawals)}</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(rowOutgoing)}</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(row.totals.savings)}</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(row.totals.investments)}</td>
                        <td className={rowSpendableNet >= 0 ? "px-3 py-2 text-right font-semibold text-emerald-700" : "px-3 py-2 text-right font-semibold text-amber-800"}>
                          {formatCurrency(rowSpendableNet)}
                        </td>
                        <td className="px-3 py-2">
                          <StatusBadge tone={rowSpendableNet >= 0 ? "success" : "warning"}>{resultStatus(rowSpendableNet)}</StatusBadge>
                        </td>
                      </tr>
                    );
                  })}
	              </tbody>
	            </table>
          </div>
        </section>
      </section>
      ) : null}

    </div>
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
    <section className="rounded-[var(--radius-lg)] border border-border bg-white p-4 shadow-[var(--shadow-sm)]" aria-labelledby="report-actions-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">Deterministische controle</p><h2 id="report-actions-title" className="mt-1 text-xl font-semibold text-brand">Wat verdient aandacht?</h2><p className="mt-1 text-xs text-[var(--color-text-muted)]">Signalen komen alleen uit transacties, budgetten en bekende patronen. Een status verandert geen financiële data.</p></div>
        <StatusBadge tone={openSignals.length ? "warning" : "success"}>{openSignals.length ? `${openSignals.length} open` : "Alles bekeken"}</StatusBadge>
      </div>
      {!canMutate ? <div className="mt-3"><ReadonlyNotice /></div> : null}
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {openSignals.map((signal) => <ReportSignalCard key={signal.id} signal={signal} canMutate={canMutate} period={period} periodType={periodType} referenceWindow={referenceWindow} />)}
      </div>
      {!openSignals.length ? <p className="mt-4 rounded-md bg-[var(--color-success-subtle)] p-4 text-sm text-emerald-800">Er staan geen open controlepunten voor deze periode.</p> : null}
      {handledSignals.length ? (
        <details className="mt-4 rounded-md border border-border">
          <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-brand">Afgehandeld of genegeerd ({handledSignals.length})</summary>
          <div className="grid gap-3 border-t border-border p-3 lg:grid-cols-2">{handledSignals.map((signal) => <ReportSignalCard key={signal.id} signal={signal} canMutate={canMutate} period={period} periodType={periodType} referenceWindow={referenceWindow} />)}</div>
        </details>
      ) : null}
    </section>
  );
}

function ReportSignalCard({ signal, canMutate, period, periodType, referenceWindow }: { signal: ActionSignalWithStatus; canMutate: boolean; period: string; periodType: ReportPeriodType; referenceWindow: number }) {
  const statusLabel = signal.status === "resolved" ? "Afgehandeld" : signal.status === "dismissed" ? "Genegeerd" : "Open";
  return (
    <article className={`rounded-md border p-3 ${signal.status === "open" && signal.tone === "warning" ? "border-amber-200 bg-[var(--color-warning-subtle)]" : "border-border bg-[var(--color-surface)]"}`}>
      <div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold text-brand">{signal.title}</h3><StatusBadge tone={signal.status === "resolved" ? "success" : signal.status === "dismissed" ? "neutral" : signal.tone}>{statusLabel}</StatusBadge></div><p className="mt-1 text-xs leading-5 text-[var(--color-text-muted)]">{signal.detail}</p></div><strong className="shrink-0 text-sm tabular-nums text-brand">{formatCurrency(signal.amount)}</strong></div>
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

function CashflowStory({ income, expenses, savings, investments, result }: { income: number; expenses: number; savings: number; investments: number; result: number }) {
  const rows = [
    { label: "Binnengekomen", value: income, tone: "income" },
    { label: "Uitgegeven", value: expenses, tone: "expense" },
    { label: "Gespaard", value: savings, tone: "saving" },
    { label: "Belegd", value: investments, tone: "invest" },
  ];
  const maximum = Math.max(...rows.map((row) => row.value), 1);

  return (
    <section className="report-story" aria-labelledby="report-story-title">
      <div className="report-story__title">
        <p>In één beeld</p>
        <h2 id="report-story-title">Wat kwam binnen en ging eruit?</h2>
        <strong className={result >= 0 ? "money-value text-emerald-700" : "money-value text-amber-800"}>{result >= 0 ? "+" : "−"}{formatCurrency(Math.abs(result))}</strong>
      </div>
      <div className="report-story__bars">
        {rows.map((row) => (
          <div key={row.label} className={`report-story__bar report-story__bar--${row.tone}`}>
            <span style={{ "--bar-size": `${Math.max((row.value / maximum) * 100, row.value ? 7 : 1)}%` } as CSSProperties} />
            <strong className="money-value">{formatCurrency(row.value)}</strong>
            <small>{row.label}</small>
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
    <section className="rounded-[var(--radius-lg)] border border-border bg-[var(--color-brand-subtle)] p-4 shadow-[var(--shadow-sm)]" aria-labelledby="report-narrative-title">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-brand"><Lightbulb aria-hidden="true" size={17} /></span>
        <div>
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-accent">Regelgebaseerde uitleg</p>
          <h2 id="report-narrative-title" className="mt-1 text-base font-semibold text-brand">{narrative.title}</h2>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-[var(--color-text)]">{narrative.summary}</p>
          <p className="mt-2 text-[0.68rem] text-[var(--color-text-muted)]">Berekend uit transacties, budgetten en de vorige {referenceWindow} {periodTypePlural}; er wordt geen externe AI gebruikt.</p>
        </div>
      </div>
    </section>
  );
}

function ReportExplanationPanel({ explanations }: { explanations: ReportExplanationItem[] }) {
  const visibleExplanations = explanations.slice(0, 3);
  return (
    <section className="report-differences rounded-[var(--radius-lg)] border border-border bg-white p-3 shadow-[var(--shadow-sm)]">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-base font-semibold text-[var(--color-text)]">
          <Lightbulb aria-hidden="true" size={15} />
          Wat valt op?
        </h2>
        <StatusBadge tone={explanations.length ? "info" : "success"}>{explanations.length ? `${visibleExplanations.length} belangrijk${visibleExplanations.length === 1 ? " punt" : "ste"}` : "Geen grote verschillen"}</StatusBadge>
      </div>
      {explanations.length ? (
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {visibleExplanations.map((explanation) => (
            <article key={explanation.id} className={`report-explanation report-explanation--${explanation.tone}`}>
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-sm font-semibold text-brand">{explanation.title}</h3>
                <strong className={explanation.amount >= 0 ? "shrink-0 text-sm tabular-nums text-amber-800" : "shrink-0 text-sm tabular-nums text-emerald-700"}>{formatCurrency(explanation.amount)}</strong>
              </div>
              {explanation.referenceAmount != null ? (
                <p className="mt-2 text-xs font-medium text-[var(--color-text-muted)]">Gemiddeld: {formatCurrency(explanation.referenceAmount)}</p>
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
    return <p className="p-3 text-xs text-[var(--color-text-muted)]">Geen bewegingen van of naar sparen in deze periode.</p>;
  }

  return (
    <div className="p-3">
      <div className="grid gap-2 md:hidden">
        {rows.map((row) => (
          <article key={row.label} className="rounded-md border border-border bg-white p-3">
            <div className="mb-3 flex items-center justify-between gap-2">
              <strong className="min-w-0 truncate text-sm text-brand">{row.label}</strong>
              <strong className={row.net >= 0 ? "shrink-0 text-sm tabular-nums text-brand" : "shrink-0 text-sm tabular-nums text-emerald-700"}>{formatCurrency(row.net)}</strong>
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
        <thead className="text-[var(--color-text-subtle)]">
          <tr className="border-b border-border">
            <th className="py-1.5 pr-2 text-left font-semibold">Spaarrekening</th>
	            <th className="px-3 py-1.5 text-right font-semibold tabular-nums">{moneyFlowLabels.savingsIn}</th>
	            <th className="px-3 py-1.5 text-right font-semibold tabular-nums">{moneyFlowLabels.savingsOut}</th>
	            <th className="px-3 py-1.5 text-right font-semibold tabular-nums">Netto spaarrekening</th>
            <th className="py-1.5 pl-3 text-right font-semibold tabular-nums">Gem. netto</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => (
            <tr key={row.label}>
              <td className="py-1.5 pr-2 text-[var(--color-text)]">
                <span className="block truncate">{row.label}</span>
              </td>
              <td className="px-3 py-1.5 text-right font-medium tabular-nums">{formatCurrency(row.savings)}</td>
              <td className="px-3 py-1.5 text-right font-medium text-emerald-700 tabular-nums">{formatCurrency(row.withdrawals)}</td>
              <td className={row.net >= 0 ? "px-3 py-1.5 text-right font-semibold text-brand tabular-nums" : "px-3 py-1.5 text-right font-semibold text-emerald-700 tabular-nums"}>
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

function SummaryMetric({ label, value, tone = "neutral", strong = false }: { label: string; value: string; tone?: "neutral" | "positive" | "negative"; strong?: boolean }) {
  const valueClass = tone === "positive" ? "text-emerald-700" : tone === "negative" ? "text-amber-800" : "text-brand";
  return (
    <div className="rounded-md bg-[var(--color-surface)] px-3 py-2">
      <p className="text-[0.62rem] font-bold uppercase tracking-wide text-[var(--color-text-subtle)]">{label}</p>
      <p className={`mt-1 truncate tabular-nums ${strong ? "text-lg" : "text-base"} font-semibold ${valueClass}`}>{value}</p>
    </div>
  );
}

function MobileAmount({ label, value, tone = "neutral", strong = false }: { label: string; value: number; tone?: "neutral" | "positive" | "negative"; strong?: boolean }) {
  const valueClass = tone === "positive" ? "text-emerald-700" : tone === "negative" ? "text-amber-800" : "text-brand";
  return (
    <div className={strong ? "col-span-2 rounded-md bg-white px-2.5 py-2" : "rounded-md bg-[var(--color-surface)] px-2.5 py-2"}>
      <span className="block text-[0.62rem] font-bold uppercase text-[var(--color-text-subtle)]">{label}</span>
      <strong className={`mt-0.5 block tabular-nums ${valueClass}`}>{formatCurrency(value)}</strong>
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
    <section className="mt-3 rounded-[var(--radius-lg)] border border-border bg-white shadow-[var(--shadow-sm)]">
      <div className="border-b border-border px-3 py-2">
        <h2 className="text-sm font-semibold text-brand">Uitleg gekozen {periodTypeLabel}</h2>
      </div>
      <div className="grid gap-3 p-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
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
    <section className="rounded-md border border-border">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-[var(--color-surface)] px-3 py-2">
        <h3 className="text-xs font-semibold text-brand">{title}</h3>
        <strong className={amountTone === "positive" ? "shrink-0 text-sm tabular-nums text-emerald-700" : "shrink-0 text-sm tabular-nums text-brand"}>
          {formatCurrency(total)}
        </strong>
      </div>
      {groups.length ? (
        <div className="divide-y divide-border">
          {groups.map((group) => (
            <div key={`${group.sectionTitle}-${group.label}`} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 px-3 py-2 text-xs">
              <div className="min-w-0">
                <strong className="block truncate text-[var(--color-text)]">{group.label}</strong>
                <span className="text-[var(--color-text-muted)]">{group.sectionTitle}</span>
              </div>
              <strong className={amountTone === "positive" ? "tabular-nums text-emerald-700" : "tabular-nums text-brand"}>{formatCurrency(group.amount)}</strong>
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
    <section className="rounded-md border border-border">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-[var(--color-surface)] px-3 py-2">
        <h3 className="text-xs font-semibold text-brand">Spaarrekening</h3>
        <strong className={net >= 0 ? "shrink-0 text-sm tabular-nums text-brand" : "shrink-0 text-sm tabular-nums text-emerald-700"}>{formatCurrency(net)}</strong>
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
    <section className="p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-brand">{section.title}</h3>
        <div className="flex flex-wrap items-center gap-2 text-[0.68rem]">
          <span className="rounded-md bg-[var(--color-brand-subtle)] px-2 py-1 font-semibold text-brand">{periodTypeLabel} {formatCurrency(section.total)}</span>
          <span className="rounded-md bg-[var(--color-surface)] px-2 py-1 font-semibold text-[var(--color-text-muted)]">{referenceLabel} {formatCurrency(section.referenceTotal)}</span>
          <span className={section.total - section.referenceTotal > 0 ? "rounded-md bg-[var(--color-warning-subtle)] px-2 py-1 font-semibold text-amber-800" : "rounded-md bg-[var(--color-success-subtle)] px-2 py-1 font-semibold text-emerald-800"}>
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
          <thead className="text-[var(--color-text-subtle)]">
            <tr className="border-b border-border">
              <th className="py-1.5 pr-2 text-left font-semibold">Post</th>
              <th className="px-3 py-1.5 text-right font-semibold tabular-nums">{periodTypeLabel}</th>
              <th className="px-3 py-1.5 text-right font-semibold tabular-nums">{referenceLabel}</th>
              <th className="py-1.5 pl-3 text-right font-semibold tabular-nums">Verschil</th>
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
        <td className="py-1.5 pr-2 font-semibold text-brand">
          <span className="block truncate">{group.label}</span>
        </td>
        <td className="px-3 py-1.5 text-right font-semibold tabular-nums">{formatCurrency(group.amount)}</td>
        <td className="px-3 py-1.5 text-right font-semibold text-[var(--color-text-muted)] tabular-nums">{formatCurrency(group.referenceAmount)}</td>
        <td className={group.delta > 0 ? "py-1.5 pl-3 text-right font-semibold text-amber-700 tabular-nums" : "py-1.5 pl-3 text-right font-semibold text-emerald-700 tabular-nums"}>
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
      <td className="px-3 py-1.5 text-right font-medium tabular-nums">{formatCurrency(row.amount)}</td>
      <td className="px-3 py-1.5 text-right text-[var(--color-text-muted)] tabular-nums">{formatCurrency(row.referenceAmount)}</td>
      <td className={row.delta > 0 ? "py-1.5 pl-3 text-right font-semibold text-amber-700 tabular-nums" : "py-1.5 pl-3 text-right font-semibold text-emerald-700 tabular-nums"}>
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
