import type { Account, Budget, Category, FixedExpense, SavingsPot, Transaction, TransactionKind } from "./types";
import { formatMonthLabel } from "@/lib/format";
import { isInvestmentCategory, isSavingsTransferCategory, isStructuralIncomeCategory } from "./financial-contract";

export type ReportPeriodType = "month" | "quarter" | "year";
export const REPORT_REFERENCE_WINDOWS = [3, 6, 12] as const;
export type ReportReferenceWindow = (typeof REPORT_REFERENCE_WINDOWS)[number];
export type BudgetSuggestionWindow = 3 | 6;

export function parseBudgetSuggestionWindow(value: unknown): BudgetSuggestionWindow {
  return value === 3 || value === "3" ? 3 : 6;
}

export function isReportPeriodType(value: unknown): value is ReportPeriodType {
  return value === "month" || value === "quarter" || value === "year";
}

export function isValidReportPeriod(value: string, periodType: ReportPeriodType) {
  if (periodType === "month") return /^\d{4}-(?:0[1-9]|1[0-2])$/.test(value);
  if (periodType === "quarter") return /^\d{4}-Q[1-4]$/.test(value);
  return /^\d{4}$/.test(value);
}

export function getCurrentReportPeriod(periodType: ReportPeriodType, date = new Date()) {
  const month = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Amsterdam",
    year: "numeric",
    month: "2-digit",
  }).format(date);
  return getReportPeriodKey(`${month}-01`, periodType);
}

export function getReportPeriodTypeLabel(periodType: ReportPeriodType) {
  if (periodType === "quarter") return "Kwartaal";
  if (periodType === "year") return "Jaar";
  return "Maand";
}

export function getReportPeriodTypePlural(periodType: ReportPeriodType) {
  if (periodType === "quarter") return "kwartalen";
  if (periodType === "year") return "jaren";
  return "maanden";
}

export function getReportPeriodDemonstrative(periodType: ReportPeriodType) {
  return periodType === "month" ? "Deze maand" : periodType === "quarter" ? "Dit kwartaal" : "Dit jaar";
}

export function parseReportReferenceWindow(value: unknown): ReportReferenceWindow {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  return REPORT_REFERENCE_WINDOWS.includes(parsed as ReportReferenceWindow) ? parsed as ReportReferenceWindow : 3;
}

export interface CashflowPeriodRow {
  period: string;
  month: string;
  income: number;
  expenses: number;
  spendableExpenses: number;
  fixedExpenses: number;
  variableExpenses: number;
  reservations: number;
  savings: number;
  investments: number;
  withdrawals: number;
  internal: number;
  net: number;
  spendableNet: number;
}

export interface ActionSignal {
  id: string;
  type: "new_counterparty" | "unplanned_category" | "uncategorized" | "fixed_expense_changed" | "budget_overspent" | "large_correction";
  title: string;
  detail: string;
  amount: number;
  count: number;
  tone: "info" | "warning" | "success";
  href: string;
  actionLabel: string;
}

export interface ReportExplanation {
  id: string;
  title: string;
  detail: string;
  amount: number;
  referenceAmount?: number;
  tone: "info" | "warning" | "success";
}

export interface ReportNarrative {
  title: string;
  summary: string;
  bullets: string[];
}

export interface BudgetSuggestion {
  categoryId: string;
  amount: number;
  averageAmount: number;
  medianAmount: number;
  minAmount: number;
  maxAmount: number;
  sampleSize: number;
  ignoredOutliers: number;
  confidence: "hoog" | "middel" | "laag";
  method: "mediaan" | "gemiddelde" | "vaste-last";
  reason: string;
  referenceMonths: string[];
  drivers: Array<{ label: string; amount: number; count: number }>;
}

export interface FixedExpenseHealthSignal {
  id: string;
  type: "missing" | "changed" | "duplicate";
  title: string;
  detail: string;
  supplier: string;
  amount: number;
  expectedAmount?: number;
  tone: "info" | "warning" | "success";
}

export function getCategoryName(categories: Category[], categoryId?: string) {
  if (!categoryId || categoryId === "geen") return "Nog kiezen";
  return categories.find((category) => category.id === categoryId)?.name ?? "Onbekend";
}

export function getAccountName(accounts: Account[], accountId: string) {
  return accounts.find((account) => account.id === accountId)?.name ?? "Onbekende rekening";
}

export function monthlyAmount(expense: FixedExpense) {
  if (expense.frequency === "vierwekelijks") return expense.amount * 13 / 12;
  if (expense.frequency === "jaarlijks") return expense.amount / 12;
  if (expense.frequency === "kwartaal") return expense.amount / 3;
  return expense.amount;
}

export function sumKind(transactions: Transaction[], kind: TransactionKind) {
  return transactions.filter((transaction) => transaction.kind === kind).reduce((sum, transaction) => sum + transaction.amount, 0);
}

export function spendingByCategory(transactions: Transaction[], categories: Category[]) {
  const rows = new Map<string, number>();
  for (const transaction of transactions) {
    if (transaction.amount >= 0 || transaction.kind === "interne_overboeking") continue;
    if (transaction.categoryId === "potje-opname" || transaction.categoryId === "ontsparen") continue;
    if (isSavingsTransfer(transaction) || isInvestmentTransfer(transaction)) continue;
    if (!transaction.categoryId) continue;
    rows.set(transaction.categoryId, (rows.get(transaction.categoryId) ?? 0) + Math.abs(transaction.amount));
  }
  return Array.from(rows.entries())
    .map(([categoryId, amount]) => ({ categoryId, label: getCategoryName(categories, categoryId), amount }))
    .sort((a, b) => b.amount - a.amount);
}

export function getAvailableMonths(transactions: Transaction[]) {
  return Array.from(new Set(transactions.map((transaction) => transaction.date.slice(0, 7)))).sort().reverse();
}

export function getAvailableReportPeriods(transactions: Transaction[], periodType: ReportPeriodType) {
  return Array.from(new Set(transactions.map((transaction) => getReportPeriodKey(transaction.date, periodType)))).sort(comparePeriodsDesc);
}

export function getReportPeriodKey(date: string, periodType: ReportPeriodType) {
  const year = date.slice(0, 4);
  if (periodType === "year") return year;
  const month = Number(date.slice(5, 7));
  if (periodType === "quarter") return `${year}-Q${Math.ceil(month / 3)}`;
  return date.slice(0, 7);
}

export function getReportPeriodLabel(period: string, periodType: ReportPeriodType) {
  if (periodType === "year") return `Jaar ${period}`;
  if (periodType === "quarter") return `Kwartaal ${period.replace("-Q", " Q")}`;
  return formatMonthLabel(period);
}

export function getCashflowByMonth(transactions: Transaction[]) {
  return getCashflowByPeriod(transactions, "month");
}

export function getCashflowByPeriod(transactions: Transaction[], periodType: ReportPeriodType = "month") {
  const rows = new Map<string, CashflowPeriodRow>();

  for (const transaction of transactions) {
    const period = getReportPeriodKey(transaction.date, periodType);
    const row = rows.get(period) ?? {
      period,
      month: period,
      income: 0,
      expenses: 0,
      spendableExpenses: 0,
      fixedExpenses: 0,
      variableExpenses: 0,
      reservations: 0,
      savings: 0,
      investments: 0,
      withdrawals: 0,
      internal: 0,
      net: 0,
      spendableNet: 0,
    };

    if (isSavingsTransfer(transaction)) {
      const amount = Math.abs(transaction.amount);
      if (transaction.amount > 0) {
        row.withdrawals += transaction.amount;
      } else if (transaction.amount < 0) {
        row.savings += amount;
        row.expenses += amount;
        row.reservations += amount;
      }
    } else if (isInvestmentTransfer(transaction)) {
      const amount = Math.abs(transaction.amount);
      if (transaction.amount < 0) {
        row.investments += amount;
        row.expenses += amount;
        row.reservations += amount;
      }
    } else if (transaction.kind === "interne_overboeking") {
      row.internal += Math.abs(transaction.amount);
    } else if (transaction.amount > 0) {
      row.income += transaction.amount;
    } else {
      const amount = Math.abs(transaction.amount);
      row.expenses += amount;
      row.spendableExpenses += amount;
      if (transaction.kind === "vaste_last") row.fixedExpenses += amount;
      if (transaction.kind === "variabele_uitgave") row.variableExpenses += amount;
      if (transaction.kind === "reservering") row.reservations += amount;
    }

    row.net = row.income - row.expenses;
    row.spendableNet = row.income + row.withdrawals - row.spendableExpenses - row.savings - row.investments;
    rows.set(period, row);
  }

  return Array.from(rows.values())
    .map((row) => ({
      ...row,
      income: roundMoney(row.income),
      expenses: roundMoney(row.expenses),
      spendableExpenses: roundMoney(row.spendableExpenses),
      fixedExpenses: roundMoney(row.fixedExpenses),
      variableExpenses: roundMoney(row.variableExpenses),
      reservations: roundMoney(row.reservations),
      savings: roundMoney(row.savings),
      investments: roundMoney(row.investments),
      withdrawals: roundMoney(row.withdrawals),
      internal: roundMoney(row.internal),
      net: roundMoney(row.net),
      spendableNet: roundMoney(row.spendableNet),
    }))
    .sort((a, b) => comparePeriodsDesc(a.period, b.period));
}

export function getReferenceForecast(transactions: Transaction[], selectedPeriod: string, windowSize = 3, periodType: ReportPeriodType = "month") {
  const cashflow = getCashflowByPeriod(transactions, periodType);
  const referenceRows = cashflow.filter((row) => comparePeriodsAsc(row.period, selectedPeriod) < 0).slice(0, windowSize);
  const selected = cashflow.find((row) => row.period === selectedPeriod) ?? {
    period: selectedPeriod,
    month: selectedPeriod,
    income: 0,
    expenses: 0,
    spendableExpenses: 0,
    fixedExpenses: 0,
    variableExpenses: 0,
    reservations: 0,
    savings: 0,
    investments: 0,
    withdrawals: 0,
    internal: 0,
    net: 0,
    spendableNet: 0,
  };

  const reference = {
    income: average(referenceRows.map((row) => row.income)),
    expenses: average(referenceRows.map((row) => row.expenses)),
    fixedExpenses: average(referenceRows.map((row) => row.fixedExpenses)),
    variableExpenses: average(referenceRows.map((row) => row.variableExpenses)),
    reservations: average(referenceRows.map((row) => row.reservations)),
    savings: average(referenceRows.map((row) => row.savings)),
    investments: average(referenceRows.map((row) => row.investments)),
    withdrawals: average(referenceRows.map((row) => row.withdrawals)),
    net: average(referenceRows.map((row) => row.net)),
    months: referenceRows.map((row) => row.period),
  };

  return {
    selected,
    reference,
    forecast: {
      income: reference.income || selected.income,
      expenses: reference.expenses || selected.expenses,
      fixedExpenses: reference.fixedExpenses || selected.fixedExpenses,
      variableExpenses: reference.variableExpenses || selected.variableExpenses,
      reservations: reference.reservations || selected.reservations,
      investments: reference.investments || selected.investments,
      net: (reference.income || selected.income) - (reference.expenses || selected.expenses),
    },
  };
}

export function getPreviousPeriodComparison(transactions: Transaction[], selectedPeriod: string, periodType: ReportPeriodType = "month") {
  const cashflow = getCashflowByPeriod(transactions, periodType);
  const selected = cashflow.find((row) => row.period === selectedPeriod) ?? {
    period: selectedPeriod,
    month: selectedPeriod,
    income: 0,
    expenses: 0,
    spendableExpenses: 0,
    fixedExpenses: 0,
    variableExpenses: 0,
    reservations: 0,
    savings: 0,
    investments: 0,
    withdrawals: 0,
    internal: 0,
    net: 0,
    spendableNet: 0,
  };
  const previous = cashflow
    .filter((row) => comparePeriodsAsc(row.period, selectedPeriod) < 0)
    .sort((a, b) => comparePeriodsDesc(a.period, b.period))[0];

  return {
    selected,
    previous,
    delta: previous
      ? {
          income: roundMoney(selected.income - previous.income),
          expenses: roundMoney(selected.expenses - previous.expenses),
          fixedExpenses: roundMoney(selected.fixedExpenses - previous.fixedExpenses),
          variableExpenses: roundMoney(selected.variableExpenses - previous.variableExpenses),
          reservations: roundMoney(selected.reservations - previous.reservations),
          savings: roundMoney(selected.savings - previous.savings),
          investments: roundMoney(selected.investments - previous.investments),
          withdrawals: roundMoney(selected.withdrawals - previous.withdrawals),
          internal: roundMoney(selected.internal - previous.internal),
          net: roundMoney(selected.net - previous.net),
        }
      : undefined,
  };
}

export function getCategoryComparison(transactions: Transaction[], categories: Category[], selectedPeriod: string, windowSize = 3, periodType: ReportPeriodType = "month") {
  const referencePeriods = getCashflowByPeriod(transactions, periodType)
    .filter((row) => comparePeriodsAsc(row.period, selectedPeriod) < 0)
    .slice(0, windowSize)
    .map((row) => row.period);
  const rows = new Map<string, { categoryId: string; label: string; current: number; reference: number }>();

  for (const transaction of transactions) {
    if (transaction.amount >= 0 || transaction.kind === "interne_overboeking") continue;
    if (transaction.categoryId === "potje-opname" || transaction.categoryId === "ontsparen") continue;
    if (isSavingsTransfer(transaction) || isInvestmentTransfer(transaction)) continue;
    if (!transaction.categoryId) continue;
    const period = getReportPeriodKey(transaction.date, periodType);
    const existing = rows.get(transaction.categoryId) ?? { categoryId: transaction.categoryId, label: getCategoryName(categories, transaction.categoryId), current: 0, reference: 0 };
    if (period === selectedPeriod) existing.current += Math.abs(transaction.amount);
    if (referencePeriods.includes(period)) existing.reference += Math.abs(transaction.amount) / Math.max(referencePeriods.length, 1);
    rows.set(transaction.categoryId, existing);
  }

  return Array.from(rows.values())
    .map((row) => ({ ...row, delta: row.current - row.reference }))
    .filter((row) => row.current > 0 || row.reference > 0)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}

export function getPrivateExpenseReport(transactions: Transaction[], categories: Category[], selectedPeriod: string, windowSize = 3, periodType: ReportPeriodType = "month") {
  const referencePeriods = getCashflowByPeriod(transactions, periodType)
    .filter((row) => comparePeriodsAsc(row.period, selectedPeriod) < 0)
    .slice(0, windowSize)
    .map((row) => row.period);
  const categoryById = new Map(categories.map((category) => [category.id, category]));

  const sections = [
    buildReportSection({
      id: "income",
      title: "Inkomen",
      transactions,
      categories,
      selectedPeriod,
      referencePeriods,
      periodType,
      include: (transaction) => isStructuralIncome(transaction),
      amount: (transaction) => transaction.amount,
      group: (transaction) => normalizeReportLabel(transaction.counterparty) || getCategoryName(categories, transaction.categoryId),
    }),
    buildReportSection({
      id: "incomingAdjustments",
      title: "Andere bijschrijvingen",
      transactions,
      categories,
      selectedPeriod,
      referencePeriods,
      periodType,
      include: (transaction) => transaction.amount > 0 && transaction.kind !== "interne_overboeking" && !isStructuralIncome(transaction) && !isSavingsTransfer(transaction) && !isInvestmentTransfer(transaction),
      amount: (transaction) => transaction.amount,
      group: (transaction) => normalizeReportLabel(transaction.counterparty) || getCategoryName(categories, transaction.categoryId),
    }),
    buildReportSection({
      id: "savings",
      title: "Naar spaarrekening",
      transactions,
      categories,
      selectedPeriod,
      referencePeriods,
      periodType,
      include: (transaction) => transaction.amount < 0 && transaction.categoryId === "sparen",
      amount: (transaction) => Math.abs(transaction.amount),
      group: getSavingsTransferLabel,
    }),
    buildReportSection({
      id: "investments",
      title: "Naar beleggingen",
      transactions,
      categories,
      selectedPeriod,
      referencePeriods,
      periodType,
      include: (transaction) => transaction.amount < 0 && isInvestmentTransfer(transaction),
      amount: (transaction) => Math.abs(transaction.amount),
      group: (transaction) => normalizeReportLabel(transaction.counterparty) || getCategoryName(categories, transaction.categoryId),
    }),
    buildReportSection({
      id: "withdrawals",
      title: "Uit spaarrekening",
      transactions,
      categories,
      selectedPeriod,
      referencePeriods,
      periodType,
      includeInternal: true,
      include: (transaction) => transaction.amount > 0 && isSavingsTransfer(transaction),
      amount: (transaction) => transaction.amount,
      group: getSavingsTransferLabel,
    }),
    buildReportSection({
      id: "fixed",
      title: "Vaste kosten",
      transactions,
      categories,
      selectedPeriod,
      referencePeriods,
      periodType,
      include: (transaction) => transaction.amount < 0 && transaction.kind === "vaste_last",
      amount: (transaction) => Math.abs(transaction.amount),
      group: (transaction) => groupByCategoryAndSupplier(transaction, categoryById),
    }),
    buildReportSection({
      id: "reservations",
      title: "Reserveringsuitgaven",
      transactions,
      categories,
      selectedPeriod,
      referencePeriods,
      periodType,
      include: (transaction) => transaction.amount < 0 && transaction.kind === "reservering" && !isSavingsTransfer(transaction) && !isInvestmentTransfer(transaction),
      amount: (transaction) => Math.abs(transaction.amount),
      group: (transaction) => groupByCategoryAndSupplier(transaction, categoryById),
    }),
    buildReportSection({
      id: "household",
      title: "Huishoudelijke uitgaven",
      transactions,
      categories,
      selectedPeriod,
      referencePeriods,
      periodType,
      include: (transaction) => transaction.amount < 0 && transaction.kind === "variabele_uitgave",
      amount: (transaction) => Math.abs(transaction.amount),
      group: (transaction) => getCategoryName(categories, transaction.categoryId),
    }),
  ];

  const income = sections.find((section) => section.id === "income")?.total ?? 0;
  const incomingAdjustments = sections.find((section) => section.id === "incomingAdjustments")?.total ?? 0;
  const savings = sections.find((section) => section.id === "savings")?.total ?? 0;
  const investments = sections.find((section) => section.id === "investments")?.total ?? 0;
  const withdrawals = sections.find((section) => section.id === "withdrawals")?.total ?? 0;
  const nonBudgetSections = new Set(["income", "incomingAdjustments", "withdrawals", "investments"]);
  const expenses = sections.filter((section) => !nonBudgetSections.has(section.id)).reduce((sum, section) => sum + section.total, 0);
  const spendableExpenses = expenses - savings;
  const referenceIncome = sections.find((section) => section.id === "income")?.referenceTotal ?? 0;
  const referenceIncomingAdjustments = sections.find((section) => section.id === "incomingAdjustments")?.referenceTotal ?? 0;
  const referenceSavings = sections.find((section) => section.id === "savings")?.referenceTotal ?? 0;
  const referenceInvestments = sections.find((section) => section.id === "investments")?.referenceTotal ?? 0;
  const referenceWithdrawals = sections.find((section) => section.id === "withdrawals")?.referenceTotal ?? 0;
  const referenceExpenses = sections.filter((section) => !nonBudgetSections.has(section.id)).reduce((sum, section) => sum + section.referenceTotal, 0);

  return {
    month: selectedPeriod,
    referenceMonths: referencePeriods,
    sections,
    totals: {
      income,
      incomingAdjustments,
      savings,
      investments,
      withdrawals,
      expenses,
      spendableExpenses,
      net: income - expenses,
      cashNet: income + incomingAdjustments - expenses,
      spendableNet: income + incomingAdjustments + withdrawals - spendableExpenses - savings - investments,
      referenceIncome,
      referenceIncomingAdjustments,
      referenceSavings,
      referenceInvestments,
      referenceWithdrawals,
      referenceExpenses,
      referenceNet: referenceIncome - referenceExpenses,
      referenceCashNet: referenceIncome + referenceIncomingAdjustments - referenceExpenses,
    },
  };
}

export function getReportExplanations(
  transactions: Transaction[],
  categories: Category[],
  budgets: Budget[],
  selectedPeriod: string,
  periodType: ReportPeriodType = "month",
  windowSize: ReportReferenceWindow = 3,
) {
  const explanations: ReportExplanation[] = [];
  const forecast = getReferenceForecast(transactions, selectedPeriod, windowSize, periodType);
  const privateReport = getPrivateExpenseReport(transactions, categories, selectedPeriod, windowSize, periodType);
  const categoryComparison = getCategoryComparison(transactions, categories, selectedPeriod, windowSize, periodType);
  const referenceSpendableNet = privateReport.totals.referenceCashNet + privateReport.totals.referenceWithdrawals - privateReport.totals.referenceInvestments;
  const spendableDelta = roundMoney(privateReport.totals.spendableNet - referenceSpendableNet);

  if (Math.abs(spendableDelta) >= 100) {
    explanations.push({
      id: "spendable-net",
      title: spendableDelta >= 0 ? "Meer ruimte dan normaal" : "Minder ruimte dan normaal",
      detail: `Vergeleken met het gemiddelde van de vorige ${forecast.reference.months.length} ${periodType === "month" ? "maanden" : "periodes"}.`,
      amount: spendableDelta,
      referenceAmount: roundMoney(referenceSpendableNet),
      tone: spendableDelta >= 0 ? "success" : "warning",
    });
  }

  for (const row of categoryComparison.filter((row) => Math.abs(row.delta) >= 75).slice(0, 4)) {
    explanations.push({
      id: `category:${row.categoryId}`,
      title: row.delta >= 0 ? `${row.label} hoger` : `${row.label} lager`,
      detail: `Vergeleken met het gemiddelde van de vorige ${forecast.reference.months.length} periodes.`,
      amount: roundMoney(row.delta),
      referenceAmount: roundMoney(row.reference),
      tone: row.delta >= 0 ? "warning" : "success",
    });
  }

  if (periodType === "month" && budgets.length) {
    for (const budget of budgets) {
      const delta = roundMoney(budget.actual - budget.planned);
      if (budget.planned <= 0 || delta < 25 || budget.exceptionAccepted) continue;
      explanations.push({
        id: `budget:${budget.categoryId}`,
        title: `Budget overschreden: ${getCategoryName(categories, budget.categoryId)}`,
        detail: "Je gaf meer uit dan je voor deze maand had gepland.",
        amount: delta,
        referenceAmount: budget.planned,
        tone: "warning",
      });
    }
  }

  return explanations
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
    .slice(0, 6);
}

export function getReportNarrative(
  transactions: Transaction[],
  categories: Category[],
  budgets: Budget[],
  selectedPeriod: string,
  periodType: ReportPeriodType = "month",
  windowSize: ReportReferenceWindow = 3,
): ReportNarrative {
  const report = getPrivateExpenseReport(transactions, categories, selectedPeriod, windowSize, periodType);
  const explanations = getReportExplanations(transactions, categories, budgets, selectedPeriod, periodType, windowSize);
  const topExplanations = explanations.slice(0, 3);
  const periodLabel = getReportPeriodLabel(selectedPeriod, periodType);
  const resultText = report.totals.spendableNet >= 0
    ? `${periodLabel} hield ${formatNarrativeAmount(report.totals.spendableNet)} over na inkomsten, gewone uitgaven, sparen en beleggen.`
    : `${periodLabel} vroeg ${formatNarrativeAmount(Math.abs(report.totals.spendableNet))} extra ruimte na inkomsten, gewone uitgaven, sparen en beleggen.`;
  const reasonText = topExplanations.length
    ? ` Belangrijkste verklaring: ${topExplanations.map((item) => `${item.title.toLowerCase()} (${formatNarrativeSignedAmount(item.amount)})`).join(", ")}.`
    : " Er zijn geen grote afwijkingen boven de signaleringsgrens.";

  return {
    title: `Uitleg in gewone taal`,
    summary: `${resultText}${reasonText}`,
    bullets: topExplanations.map((item) => `${item.title}: ${item.detail}`),
  };
}

function isStructuralIncome(transaction: Transaction) {
  if (transaction.amount <= 0 || transaction.kind !== "inkomen") return false;
  if (isSavingsTransfer(transaction)) return false;
  return isStructuralIncomeCategory(transaction.categoryId);
}

export function isSavingsTransfer(transaction: Pick<Transaction, "categoryId">) {
  return isSavingsTransferCategory(transaction.categoryId);
}

export function isInvestmentTransfer(transaction: Pick<Transaction, "categoryId">) {
  return isInvestmentCategory(transaction.categoryId);
}

function buildReportSection(input: {
  id: string;
  title: string;
  transactions: Transaction[];
  categories: Category[];
  selectedPeriod: string;
  referencePeriods: string[];
  periodType: ReportPeriodType;
  includeInternal?: boolean;
  include: (transaction: Transaction) => boolean;
  amount: (transaction: Transaction) => number;
  group: (transaction: Transaction) => string;
}) {
  const rows = new Map<string, { label: string; amount: number; referenceAmount: number; count: number }>();

  for (const transaction of input.transactions) {
    if (!input.includeInternal && transaction.kind === "interne_overboeking") continue;
    if (!input.include(transaction)) continue;
    const period = getReportPeriodKey(transaction.date, input.periodType);
    const label = input.group(transaction);
    const row = rows.get(label) ?? { label, amount: 0, referenceAmount: 0, count: 0 };
    if (period === input.selectedPeriod) {
      row.amount += input.amount(transaction);
      row.count += 1;
    }
    if (input.referencePeriods.includes(period)) {
      row.referenceAmount += input.amount(transaction) / Math.max(input.referencePeriods.length, 1);
    }
    rows.set(label, row);
  }

  const sectionRows = Array.from(rows.values())
    .filter((row) => row.amount > 0)
    .map((row) => ({
      ...row,
      amount: roundMoney(row.amount),
      referenceAmount: roundMoney(row.referenceAmount),
      delta: roundMoney(row.amount - row.referenceAmount),
    }))
    .sort((a, b) => b.amount - a.amount || b.referenceAmount - a.referenceAmount || a.label.localeCompare(b.label));

  return {
    id: input.id,
    title: input.title,
    rows: sectionRows,
    total: roundMoney(sectionRows.reduce((sum, row) => sum + row.amount, 0)),
    referenceTotal: roundMoney(sectionRows.reduce((sum, row) => sum + row.referenceAmount, 0)),
  };
}

function groupByCategoryAndSupplier(transaction: Transaction, categoryById: Map<string, Category>) {
  const category = transaction.categoryId ? categoryById.get(transaction.categoryId) : undefined;
  const supplier = normalizeReportLabel(transaction.counterparty);
  if (!supplier) return category?.name ?? "Onbekend";
  const categoryName = category?.name ?? "Onbekend";
  if (supplier.toLowerCase().includes(categoryName.toLowerCase())) return supplier;
  return `${categoryName} - ${supplier}`;
}

function getSavingsTransferLabel(transaction: Transaction) {
  const counterparty = normalizeReportLabel(transaction.counterparty);
  if (counterparty) return counterparty;
  const description = normalizeReportLabel(transaction.description.replace(/\b(?:naar|van):\s*/i, ""));
  return description || getCategoryName([], transaction.categoryId);
}

function normalizeReportLabel(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export function getPriceIncreaseSignals(transactions: Transaction[], selectedMonth: string) {
  const monthlyRows = new Map<string, { supplier: string; categoryId: string; month: string; amount: number; latestDate: string }>();

  for (const transaction of transactions) {
    if (transaction.amount >= 0 || transaction.kind === "interne_overboeking") continue;
    if (transaction.categoryId === "potje-opname" || transaction.categoryId === "ontsparen") continue;
    if (!transaction.categoryId) continue;
    const supplier = transaction.counterparty.trim() || "Onbekend";
    const month = transaction.date.slice(0, 7);
    const key = `${supplier}|${transaction.categoryId}|${month}`;
    const existing = monthlyRows.get(key) ?? { supplier, categoryId: transaction.categoryId, month, amount: 0, latestDate: transaction.date };
    existing.amount += Math.abs(transaction.amount);
    if (transaction.date > existing.latestDate) existing.latestDate = transaction.date;
    monthlyRows.set(key, existing);
  }

  const rows = new Map<string, { supplier: string; categoryId: string; current: number; previousMonthlyAmounts: number[]; latestDate: string }>();
  for (const row of monthlyRows.values()) {
    const key = `${row.supplier}|${row.categoryId}`;
    const existing = rows.get(key) ?? { supplier: row.supplier, categoryId: row.categoryId, current: 0, previousMonthlyAmounts: [], latestDate: row.latestDate };
    if (row.month === selectedMonth) {
      existing.current = row.amount;
      existing.latestDate = row.latestDate;
    } else if (row.month < selectedMonth) {
      existing.previousMonthlyAmounts.push(row.amount);
    }
    rows.set(key, existing);
  }

  return Array.from(rows.values())
    .map((row) => {
      const previous = average(row.previousMonthlyAmounts.slice(0, 6));
      const delta = row.current - previous;
      const percent = previous > 0 ? delta / previous : 0;
      return { ...row, previous, delta, percent };
    })
    .filter((row) => row.current > 0 && row.previous > 0 && row.delta >= 5 && row.percent >= 0.1)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 12);
}

export function getActionSignals(transactions: Transaction[], categories: Category[], budgets: Budget[], selectedPeriod: string, periodType: ReportPeriodType = "month") {
  const signals: ActionSignal[] = [];
  const categoryNames = new Map(categories.map((category) => [category.id, category.name]));
  const categoryKinds = new Map(categories.map((category) => [category.id, category.kind]));
  const plannedBudgetCategoryIds = new Set(budgets.filter((budget) => budget.planned > 0).map((budget) => budget.categoryId));
  const currentTransactions = transactions.filter((transaction) => getReportPeriodKey(transaction.date, periodType) === selectedPeriod && transaction.kind !== "interne_overboeking");
  const previousTransactions = transactions.filter((transaction) => comparePeriodsAsc(getReportPeriodKey(transaction.date, periodType), selectedPeriod) < 0 && transaction.kind !== "interne_overboeking");
  const knownCounterparties = new Set(previousTransactions.map((transaction) => normalizeReportLabel(transaction.counterparty).toLowerCase()).filter(Boolean));

  for (const signal of buildNewCounterpartySignals(currentTransactions, knownCounterparties)) signals.push(signal);
  for (const signal of buildUnplannedCategorySignals(currentTransactions, categoryNames, plannedBudgetCategoryIds, periodType)) signals.push(signal);
  for (const signal of buildUncategorizedSignals(currentTransactions)) signals.push(signal);
  for (const signal of buildFixedExpenseChangeSignals(transactions, selectedPeriod, periodType, categoryKinds)) signals.push(signal);
  for (const signal of buildBudgetOverspendSignals(budgets, categoryNames, periodType)) signals.push(signal);
  for (const signal of buildLargeCorrectionSignals(currentTransactions, categoryNames)) signals.push(signal);

  return signals
    .sort((a, b) => signalPriority(a.type) - signalPriority(b.type) || b.amount - a.amount)
    .slice(0, 16)
    .map((signal) => ({ ...signal, ...signalDestination(signal.type, selectedPeriod, periodType) }));
}

function buildNewCounterpartySignals(transactions: Transaction[], knownCounterparties: Set<string>) {
  const rows = new Map<string, { label: string; amount: number; count: number }>();
  for (const transaction of transactions) {
    if (transaction.categoryId === "potje-opname" || transaction.categoryId === "ontsparen") continue;
    const label = normalizeReportLabel(transaction.counterparty);
    if (!label || knownCounterparties.has(label.toLowerCase())) continue;
    const existing = rows.get(label) ?? { label, amount: 0, count: 0 };
    existing.amount += Math.abs(transaction.amount);
    existing.count += 1;
    rows.set(label, existing);
  }

  return Array.from(rows.values())
    .filter((row) => row.amount >= 25)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)
    .map((row): ActionSignal => ({
      id: `new-counterparty:${row.label}`,
      type: "new_counterparty",
      title: "Nieuwe tegenpartij",
      detail: `${row.label} kwam niet voor in eerdere periodes.`,
      amount: roundMoney(row.amount),
      count: row.count,
      tone: "info",
      href: "",
      actionLabel: "",
    }));
}

function buildUnplannedCategorySignals(transactions: Transaction[], categoryNames: Map<string, string>, plannedBudgetCategoryIds: Set<string>, periodType: ReportPeriodType) {
  if (periodType !== "month") return [];
  const rows = new Map<string, { categoryId: string; amount: number; count: number }>();
  for (const transaction of transactions) {
    if (transaction.amount >= 0 || !transaction.categoryId || plannedBudgetCategoryIds.has(transaction.categoryId)) continue;
    if (transaction.categoryId === "potje-opname" || transaction.categoryId === "ontsparen") continue;
    if (["overig", "overig-inkomen"].includes(transaction.categoryId)) continue;
    if (!["vaste_last", "variabele_uitgave", "reservering"].includes(transaction.kind)) continue;
    const existing = rows.get(transaction.categoryId) ?? { categoryId: transaction.categoryId, amount: 0, count: 0 };
    existing.amount += Math.abs(transaction.amount);
    existing.count += 1;
    rows.set(transaction.categoryId, existing);
  }

  return Array.from(rows.values())
    .filter((row) => row.amount >= 50)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)
    .map((row): ActionSignal => ({
      id: `unplanned:${row.categoryId}`,
      type: "unplanned_category",
      title: "Geen budget gepland",
      detail: `${categoryNames.get(row.categoryId) ?? row.categoryId} heeft uitgaven, maar geen maandbudget.`,
      amount: roundMoney(row.amount),
      count: row.count,
      tone: "warning",
      href: "",
      actionLabel: "",
    }));
}

function buildUncategorizedSignals(transactions: Transaction[]) {
  const rows = new Map<string, { categoryId: string; amount: number; count: number }>();
  for (const transaction of transactions) {
    const categoryId = transaction.categoryId ?? "geen";
    if (!["geen", "overig", "overig-inkomen"].includes(categoryId)) continue;
    const existing = rows.get(categoryId) ?? { categoryId, amount: 0, count: 0 };
    existing.amount += Math.abs(transaction.amount);
    existing.count += 1;
    rows.set(categoryId, existing);
  }

  return Array.from(rows.values()).map((row): ActionSignal => ({
    id: `uncategorized:${row.categoryId}`,
    type: "uncategorized",
    title: row.categoryId === "geen" ? "Categorie nog kiezen" : row.categoryId === "overig-inkomen" ? "Inkomsten nog algemeen" : "Uitgaven nog algemeen",
    detail: row.categoryId === "geen" ? `${row.count} transacties hebben nog geen categorie.` : `${row.count} transacties staan nog op ${row.categoryId}.`,
    amount: roundMoney(row.amount),
    count: row.count,
    tone: "warning",
    href: "",
    actionLabel: "",
  }));
}

function buildFixedExpenseChangeSignals(transactions: Transaction[], selectedPeriod: string, periodType: ReportPeriodType, categoryKinds: Map<string, TransactionKind>) {
  if (periodType !== "month") return [];
  return getPriceIncreaseSignals(transactions, selectedPeriod)
    .filter((signal) => categoryKinds.get(signal.categoryId) === "vaste_last")
    .slice(0, 3)
    .map((signal): ActionSignal => ({
      id: `fixed-changed:${signal.supplier}:${signal.categoryId}`,
      type: "fixed_expense_changed",
      title: "Vaste last hoger",
      detail: `${signal.supplier} is hoger dan het recente gemiddelde.`,
      amount: roundMoney(signal.delta),
      count: 1,
      tone: "warning",
      href: "",
      actionLabel: "",
    }));
}

function buildBudgetOverspendSignals(budgets: Budget[], categoryNames: Map<string, string>, periodType: ReportPeriodType) {
  if (periodType !== "month") return [];
  return budgets
    .map((budget) => ({ ...budget, delta: roundMoney(budget.actual - budget.planned) }))
    .filter((budget) => budget.planned > 0 && budget.delta >= 25 && !budget.exceptionAccepted)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 5)
    .map((budget): ActionSignal => ({
      id: `budget-overspent:${budget.categoryId}`,
      type: "budget_overspent",
      title: "Budget overschreden",
      detail: `${categoryNames.get(budget.categoryId) ?? budget.categoryId} staat boven het geplande bedrag.`,
      amount: budget.delta,
      count: 1,
      tone: "warning",
      href: "",
      actionLabel: "",
    }));
}

function buildLargeCorrectionSignals(transactions: Transaction[], categoryNames: Map<string, string>) {
  return transactions
    .filter((transaction) => transaction.amount > 0 && transaction.kind !== "inkomen" && !isSavingsTransfer(transaction))
    .filter((transaction) => transaction.amount >= 250)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 4)
    .map((transaction): ActionSignal => ({
      id: `large-correction:${transaction.id}`,
      type: "large_correction",
      title: "Grote bijschrijving",
      detail: `${normalizeReportLabel(transaction.counterparty) || categoryNames.get(transaction.categoryId ?? "") || "Onbekend"} staat als correctie/bijschrijving in deze periode.`,
      amount: roundMoney(transaction.amount),
      count: 1,
      tone: "info",
      href: "",
      actionLabel: "",
    }));
}

function signalPriority(type: ActionSignal["type"]) {
  if (type === "uncategorized") return 1;
  if (type === "unplanned_category") return 2;
  if (type === "budget_overspent") return 3;
  if (type === "fixed_expense_changed") return 4;
  if (type === "large_correction") return 5;
  return 4;
}

function signalDestination(type: ActionSignal["type"], selectedPeriod: string, periodType: ReportPeriodType) {
  const month = periodType === "month" ? `&month=${encodeURIComponent(selectedPeriod)}` : "";
  if (type === "uncategorized") return { href: `/transacties?mode=review${month}`, actionLabel: "Controleren" };
  if (type === "unplanned_category" || type === "budget_overspent") return { href: periodType === "month" ? `/budgetten?month=${encodeURIComponent(selectedPeriod)}` : "/budgetten", actionLabel: "Budget bekijken" };
  if (type === "fixed_expense_changed") return { href: "/vaste-lasten", actionLabel: "Vaste last bekijken" };
  return { href: `/transacties?kind=alle${month}`, actionLabel: "Transacties bekijken" };
}

export function getBudgetSuggestions(transactions: Transaction[], categories: Category[], selectedMonth: string, windowSize: BudgetSuggestionWindow = 6): BudgetSuggestion[] {
  const referenceMonths = getCashflowByMonth(transactions)
    .filter((row) => row.month < selectedMonth)
    .slice(0, windowSize)
    .map((row) => row.month);
  const allowedKinds = new Set<TransactionKind>(["vaste_last", "variabele_uitgave", "reservering"]);
  const categoryKinds = new Map(categories.map((category) => [category.id, category.kind]));
  const totals = new Map<string, Map<string, number>>();
  const drivers = new Map<string, Map<string, { label: string; amount: number; count: number }>>();

  for (const transaction of transactions) {
    const month = transaction.date.slice(0, 7);
    if (!referenceMonths.includes(month)) continue;
    if (transaction.amount >= 0 || transaction.kind === "interne_overboeking") continue;
    if (transaction.categoryId === "potje-opname" || transaction.categoryId === "ontsparen") continue;
    if (!transaction.categoryId) continue;
    if (!allowedKinds.has(categoryKinds.get(transaction.categoryId) ?? transaction.kind)) continue;
    const categoryTotals = totals.get(transaction.categoryId) ?? new Map<string, number>();
    categoryTotals.set(month, (categoryTotals.get(month) ?? 0) + Math.abs(transaction.amount));
    totals.set(transaction.categoryId, categoryTotals);
    const categoryDrivers = drivers.get(transaction.categoryId) ?? new Map<string, { label: string; amount: number; count: number }>();
    const driverLabel = normalizeReportLabel(transaction.counterparty) || normalizeReportLabel(transaction.description) || getCategoryName(categories, transaction.categoryId);
    const driver = categoryDrivers.get(driverLabel) ?? { label: driverLabel, amount: 0, count: 0 };
    driver.amount += Math.abs(transaction.amount);
    driver.count += 1;
    categoryDrivers.set(driverLabel, driver);
    drivers.set(transaction.categoryId, categoryDrivers);
  }

  return Array.from(totals.entries())
    .map(([categoryId, months]) => buildBudgetSuggestion(categoryId, months, referenceMonths, categoryKinds.get(categoryId), drivers.get(categoryId)))
    .filter((suggestion) => suggestion.amount > 0)
    .sort((a, b) => b.amount - a.amount);
}

export function getFixedExpenseHealthSignals(transactions: Transaction[], fixedExpenses: FixedExpense[], selectedMonth?: string) {
  const month = selectedMonth ?? getAvailableMonths(transactions)[0];
  if (!month) return [];
  const signals: FixedExpenseHealthSignal[] = [];
  const currentExpenses = transactions.filter((transaction) => transaction.date.startsWith(month) && transaction.amount < 0 && transaction.kind !== "interne_overboeking");

  for (const expense of fixedExpenses) {
    const expected = monthlyAmount(expense);
    const matches = currentExpenses.filter((transaction) => supplierMatches(expense.supplier, transaction.counterparty || transaction.description));
    const actual = roundMoney(matches.reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0));
    if (actual === 0) {
      signals.push({
        id: `missing:${expense.id}`,
        type: "missing",
        title: "Niet gezien deze maand",
        detail: `${expense.supplier} staat wel als vaste last, maar is in ${formatMonthLabel(month)} niet gevonden.`,
        supplier: expense.supplier,
        amount: 0,
        expectedAmount: roundMoney(expected),
        tone: "warning",
      });
      continue;
    }
    const delta = roundMoney(actual - expected);
    const percent = expected > 0 ? Math.abs(delta) / expected : 0;
    if (Math.abs(delta) >= 5 && percent >= 0.08) {
      signals.push({
        id: `changed:${expense.id}`,
        type: "changed",
        title: delta > 0 ? "Bedrag hoger dan vastgelegd" : "Bedrag lager dan vastgelegd",
        detail: `${expense.supplier} is gevonden voor ${formatMonthLabel(month)}, maar wijkt af van de maandbasis.`,
        supplier: expense.supplier,
        amount: actual,
        expectedAmount: roundMoney(expected),
        tone: "warning",
      });
    }
  }

  for (const duplicate of findDuplicateFixedExpenses(fixedExpenses)) {
    signals.push(duplicate);
  }

  return signals.sort((a, b) => signalSortValue(a.type) - signalSortValue(b.type) || Math.abs(b.amount - (b.expectedAmount ?? 0)) - Math.abs(a.amount - (a.expectedAmount ?? 0))).slice(0, 12);
}

function buildBudgetSuggestion(categoryId: string, months: Map<string, number>, referenceMonths: string[], kind?: TransactionKind, drivers?: Map<string, { label: string; amount: number; count: number }>): BudgetSuggestion {
  const values = referenceMonths.map((month) => roundMoney(months.get(month) ?? 0));
  const nonZeroValues = values.filter((value) => value > 0).sort((a, b) => a - b);
  const sampleSize = nonZeroValues.length;
  const medianAmount = roundMoney(median(nonZeroValues));
  const averageAmount = roundMoney(average(nonZeroValues));
  const minAmount = roundMoney(nonZeroValues[0] ?? 0);
  const maxAmount = roundMoney(nonZeroValues.at(-1) ?? 0);
  const trimmedValues = trimOutliers(nonZeroValues);
  const ignoredOutliers = Math.max(nonZeroValues.length - trimmedValues.length, 0);
  const trimmedAverage = roundMoney(average(trimmedValues));
  const volatility = averageAmount > 0 ? (maxAmount - minAmount) / averageAmount : 0;
  const method: BudgetSuggestion["method"] = kind === "vaste_last" ? "vaste-last" : ignoredOutliers > 0 || volatility > 1 ? "mediaan" : "gemiddelde";
  const baseAmount = method === "gemiddelde" ? averageAmount : method === "vaste-last" ? maxAmount || averageAmount : medianAmount || trimmedAverage;
  const confidence: BudgetSuggestion["confidence"] = sampleSize >= 5 && volatility <= 0.35 ? "hoog" : sampleSize >= 3 && volatility <= 0.8 ? "middel" : "laag";
  const amount = roundBudgetAmount(baseAmount);

  return {
    categoryId,
    amount,
    averageAmount,
    medianAmount,
    minAmount,
    maxAmount,
    sampleSize,
    ignoredOutliers,
    confidence,
    method,
    reason: buildBudgetSuggestionReason(method, confidence, sampleSize, ignoredOutliers),
    referenceMonths,
    drivers: Array.from(drivers?.values() ?? [])
      .map((driver) => ({ ...driver, amount: roundMoney(driver.amount) }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3),
  };
}

function buildBudgetSuggestionReason(method: BudgetSuggestion["method"], confidence: BudgetSuggestion["confidence"], sampleSize: number, ignoredOutliers: number) {
  const methodLabel = method === "vaste-last" ? "vaste lasten" : method === "mediaan" ? "mediaan" : "gemiddelde";
  const outlierText = ignoredOutliers ? `, ${ignoredOutliers} uitschieter genegeerd` : "";
  return `${methodLabel}, ${sampleSize} maanden data, vertrouwen ${confidence}${outlierText}`;
}

function roundBudgetAmount(value: number) {
  if (value <= 0) return 0;
  if (value < 20) return roundMoney(value);
  return Math.ceil(value / 5) * 5;
}

function median(values: number[]) {
  if (!values.length) return 0;
  const middle = Math.floor(values.length / 2);
  if (values.length % 2) return values[middle] ?? 0;
  return ((values[middle - 1] ?? 0) + (values[middle] ?? 0)) / 2;
}

function trimOutliers(values: number[]) {
  if (values.length < 4) return values;
  const sorted = [...values].sort((a, b) => a - b);
  const baseline = median(sorted);
  if (baseline <= 0) return sorted;
  return sorted.filter((value) => value <= baseline * 2.5);
}

function supplierMatches(managedSupplier: string, transactionLabel: string) {
  const supplier = normalizeSupplier(managedSupplier);
  const label = normalizeSupplier(transactionLabel);
  if (!supplier || !label) return false;
  return supplier.includes(label) || label.includes(supplier) || tokenOverlap(supplier, label) >= 0.65;
}

function findDuplicateFixedExpenses(fixedExpenses: FixedExpense[]) {
  const signals: FixedExpenseHealthSignal[] = [];
  for (let index = 0; index < fixedExpenses.length; index += 1) {
    const current = fixedExpenses[index];
    if (!current) continue;
    for (const other of fixedExpenses.slice(index + 1)) {
      const overlap = tokenOverlap(normalizeSupplier(current.supplier), normalizeSupplier(other.supplier));
      if (overlap < 0.72) continue;
      signals.push({
        id: `duplicate:${current.id}:${other.id}`,
        type: "duplicate",
        title: "Mogelijk dubbel beheerd",
        detail: `${current.supplier} en ${other.supplier} lijken dezelfde leverancier met andere omschrijving.`,
        supplier: current.supplier,
        amount: roundMoney(monthlyAmount(current) + monthlyAmount(other)),
        expectedAmount: roundMoney(monthlyAmount(current)),
        tone: "info",
      });
    }
  }
  return signals;
}

function tokenOverlap(a: string, b: string) {
  const left = new Set(a.split(" ").filter((token) => token.length >= 3));
  const right = new Set(b.split(" ").filter((token) => token.length >= 3));
  if (!left.size || !right.size) return 0;
  const shared = Array.from(left).filter((token) => right.has(token)).length;
  return shared / Math.min(left.size, right.size);
}

function normalizeSupplier(value: string) {
  return value
    .toLowerCase()
    .replace(/\b(?:via|bv|b\.v\.|nv|n\.v\.|incasso|mollie|mol|ideal|sepa|ccv|group|payments?)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function signalSortValue(type: FixedExpenseHealthSignal["type"]) {
  if (type === "changed") return 1;
  if (type === "missing") return 2;
  return 3;
}

function formatNarrativeAmount(value: number) {
  return `EUR ${roundMoney(value).toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatNarrativeSignedAmount(value: number) {
  const prefix = value >= 0 ? "+" : "-";
  return `${prefix}${formatNarrativeAmount(Math.abs(value))}`;
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function comparePeriodsAsc(a: string, b: string) {
  return periodSortValue(a) - periodSortValue(b);
}

function comparePeriodsDesc(a: string, b: string) {
  return periodSortValue(b) - periodSortValue(a);
}

function periodSortValue(period: string) {
  const quarterMatch = /^(\d{4})-Q([1-4])$/.exec(period);
  if (quarterMatch) return Number(quarterMatch[1]) * 10 + Number(quarterMatch[2]);
  if (/^\d{4}-\d{2}$/.test(period)) return Number(period.slice(0, 4)) * 100 + Number(period.slice(5, 7));
  if (/^\d{4}$/.test(period)) return Number(period) * 10;
  return 0;
}
