
import { encodeExcelCsv, type CsvValue } from "@/lib/csv";
import type { DashboardCashflowForecast, TransactionSearchFilters } from "./repository";
import type { Account, Category, Frequency, Transaction } from "./types";
import { FINANCIAL_CONTRACT_VERSION } from "./financial-contract";
import type { WealthOverview } from "./wealth";
import type { ScenarioComparison } from "./scenario";

export const CSV_PRODUCT_VERSION = "1.0";

interface ForwardCsvEvent {
  date: string;
  label: string;
  amount: number;
  direction: "inkomen" | "uitgave";
  frequency: Frequency | "eenmalig";
  status: string;
  confidence: string;
  estimated: boolean;
  source: string;
}

export function toFilteredTransactionsCsv(input: {
  transactions: Transaction[];
  filters: TransactionSearchFilters;
  accounts: Account[];
  categories: Category[];
  exportedAt?: string;
  asOf?: string;
}) {
  const accountById = new Map(input.accounts.map((account) => [account.id, account]));
  const categoryById = new Map(input.categories.map((category) => [category.id, category]));
  const metadata: CsvValue[][] = [...csvMetadata("filtered_transactions", input.exportedAt, input.asOf, JSON.stringify(serializableFilters(input.filters))), ["# rows", input.transactions.length]];
  const headers = ["date", "account", "account_iban", "counterparty", "counter_account", "description", "amount", "category", "kind", "pattern", "confidence", "evidence_periods", "estimated", "source_file", "source"];
  const rows = input.transactions.map((transaction) => {
    const account = accountById.get(transaction.accountId);
    return [
      transaction.date,
      transaction.accountName ?? account?.name ?? "",
      account?.iban ?? "",
      transaction.counterparty,
      transaction.counterAccount ?? "",
      transaction.description,
      transaction.amount,
      transaction.categoryId ? categoryById.get(transaction.categoryId)?.name ?? transaction.categoryId : "",
      transaction.kind,
      transaction.recurrencePattern ?? "",
      transaction.recurrenceConfidence ?? "",
      transaction.recurrenceEvidenceCount ?? "",
      false,
      transaction.sourceFile ?? "",
      `transaction:${transaction.id}`,
    ];
  });
  return encodeExcelCsv([...metadata, [], headers, ...rows]);
}

export function toTodayCalculationCsv(forecast: DashboardCashflowForecast, exportedAt?: string) {
  const metadata = csvMetadata("today_calculation", exportedAt, forecast.asOf, `horizon=${forecast.horizon.date};reason=${forecast.horizon.reason}`);
  const rows: CsvValue[][] = [
    ["component", "date", "label", "amount", "estimated", "confidence", "source"],
    ["balance", forecast.asOf, "Op betaalrekeningen", forecast.paymentBalance, false, "confirmed", "accounts"],
    ["deduction", forecast.horizon.date, "Vaste lasten vóór inkomen", -forecast.scheduledExpenses, forecast.timeline.some((item) => item.type === "expense" && item.estimated), weakestConfidence(forecast.timeline.filter((item) => item.type === "expense").map((item) => item.confidence)), "fixed_expenses"],
    ["deduction", forecast.horizon.date, "Verwachte uitgaven vóór inkomen", -forecast.expectedBudgetExpenses, true, "calculated", "budgets"],
    ["deduction", forecast.horizon.date, "Bewuste reserveringen", -forecast.explicitReservations, false, "confirmed", "reservations"],
    ["deduction", forecast.horizon.date, "Onzekerheidsbuffer", -forecast.uncertaintyMargin, true, "calculated", "forecast_margin"],
    ["result", forecast.horizon.date, "Veilig te besteden", forecast.availableToSpend, forecast.state !== "planned", forecast.state === "planned" ? "confirmed" : "estimated", `contract:${forecast.calculationVersion}`],
  ];
  return encodeExcelCsv([...metadata, [], ...rows]);
}

export function toForwardCsv(events: ForwardCsvEvent[], asOf: string, exportedAt?: string) {
  const metadata = csvMetadata("forward_schedule", exportedAt, asOf, `events=${events.length}`);
  return encodeExcelCsv([
    ...metadata,
    [],
    ["date", "label", "amount", "direction", "frequency", "status", "confidence", "estimated", "source"],
    ...events
      .sort((a, b) => a.date.localeCompare(b.date) || (a.direction === "uitgave" ? -1 : 1))
      .map((event) => [event.date, event.label, event.amount, event.direction, event.frequency, event.status, event.confidence, event.estimated, event.source]),
  ]);
}

export function toWealthCsv(wealth: WealthOverview, exportedAt?: string) {
  const metadata = csvMetadata("wealth_overview", exportedAt, wealth.asOf, `accounts=${wealth.accounts.length}`);
  const summary: CsvValue[][] = [
    ["summary", "Netto vermogen", wealth.netWorth],
    ["summary", "Direct beschikbaar", wealth.directAvailable],
    ["summary", "Gereserveerd", wealth.reserved],
    ["summary", "Lange termijn", wealth.longTerm],
    ["summary", "Schulden", -wealth.debt],
  ];
  return encodeExcelCsv([
    ...metadata,
    [],
    ["section", "label", "amount"],
    ...summary,
    [],
    ["account", "type", "group", "iban", "balance", "balance_date", "balance_source", "quality", "balance_difference", "last_import_at", "last_transaction_on", "source"],
    ...wealth.accounts.map((account) => [
      account.name,
      account.typeLabel,
      account.groupLabel,
      account.iban,
      account.balance,
      account.balanceDate ?? "",
      account.balanceSource ?? "",
      account.quality.label,
      account.quality.balanceDifference,
      account.quality.lastImportAt ?? "",
      account.quality.lastTransactionOn ?? "",
      `account:${account.id}`,
    ]),
  ]);
}

export function toScenarioCsv(comparison: ScenarioComparison, exportedAt?: string) {
  const metadata = csvMetadata("scenario_comparison", exportedAt, comparison.asOf, `type=${comparison.input.type};start=${comparison.input.startDate};amount=${comparison.input.amount}`);
  return encodeExcelCsv([
    ...metadata,
    ["# label", comparison.input.label],
    ["# conclusion", comparison.conclusion],
    [],
    ["metric", "baseline", "scenario", "difference"],
    ["Veilig te besteden", comparison.baseline.safeToSpend, comparison.scenario.safeToSpend, comparison.difference.safeToSpend],
    ["Laagste saldo", comparison.baseline.lowestBalance, comparison.scenario.lowestBalance, comparison.difference.lowestBalance],
    ["Saldo einde maand", comparison.baseline.monthEndBalance, comparison.scenario.monthEndBalance, comparison.difference.monthEndBalance],
    [],
    ["date", "baseline_balance", "scenario_balance"],
    ...comparison.points.map((point) => [point.date, point.baseline, point.scenario]),
  ]);
}

function csvMetadata(reportType: string, exportedAt = new Date().toISOString(), asOf = exportedAt.slice(0, 10), filters = "") : CsvValue[][] {
  return [
    ["# csv_product_version", CSV_PRODUCT_VERSION],
    ["# calculation_contract", FINANCIAL_CONTRACT_VERSION],
    ["# report_type", reportType],
    ["# exported_at", exportedAt],
    ["# as_of", asOf],
    ["# filters", filters],
  ];
}

function serializableFilters(filters: TransactionSearchFilters) {
  const { counterAccount: _counterAccount, page: _page, pageSize: _pageSize, ...result } = filters;
  return result;
}

function weakestConfidence(values: Array<"high" | "medium" | "low">) {
  if (values.includes("low")) return "low";
  if (values.includes("medium")) return "medium";
  return values.length ? "high" : "confirmed";
}
