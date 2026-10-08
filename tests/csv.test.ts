import assert from "node:assert/strict";
import test from "node:test";
import { encodeExcelCsv, protectExcelFormula } from "../src/lib/csv";
import { toReportCsv } from "../src/modules/finance/report-export";
import type { FinanceDataset } from "../src/modules/finance/bank-import";
import { parseReportSlug, reportDestinations } from "../src/lib/report-destinations";
import { FINANCIAL_CONTRACT_VERSION } from "../src/modules/finance/financial-contract";
import { CSV_PRODUCT_VERSION, toFilteredTransactionsCsv, toForwardCsv, toTodayCalculationCsv } from "../src/modules/finance/csv-product-contract";
import type { DashboardCashflowForecast } from "../src/modules/finance/repository";
import { parseTransactionFilters, transactionFiltersToParams } from "../src/modules/finance/transaction-query";

test("CSV voorkomt dat Excel geïmporteerde tekst als formule uitvoert", () => {
  for (const value of ["=2+2", "+cmd", "-10+20", "@SUM(A1:A2)", "  =2+2", "\t=2+2"]) {
    assert.equal(protectExcelFormula(value), `'${value}`);
  }
  assert.equal(protectExcelFormula("Normale tekst"), "Normale tekst");
  assert.match(encodeExcelCsv([["=2+2"]]), /"'=2\+2"/);
});

test("CSV houdt gehele aantallen geheel en bedragen rekenbaar voor Nederlandse Excel", () => {
  const csv = encodeExcelCsv([["Aantal", "Bedrag"], [3, 12.5]]);
  assert.match(csv, /3;12,5/);
  assert.doesNotMatch(csv, /3,00/);
});

test("rapportexport gebruikt de gekozen periode en beveiligt categorienamen", () => {
  const dataset: FinanceDataset = {
    accounts: [],
    categories: [{ id: "gevaarlijk", name: "=SOM(A1:A2)", kind: "variabele_uitgave" }],
    transactions: [
      { id: "jan", date: "2026-01-10", accountId: "rekening", counterparty: "Winkel", description: "Januari", amount: -10, categoryId: "gevaarlijk", kind: "variabele_uitgave" },
      { id: "feb", date: "2026-02-10", accountId: "rekening", counterparty: "Winkel", description: "Februari", amount: -20, categoryId: "gevaarlijk", kind: "variabele_uitgave" },
    ],
  };
  const csv = toReportCsv(dataset, "2026-01", "month");
  assert.match(csv, /"januari 2026"/i);
  assert.match(csv, new RegExp(`"Rekencontract";"${FINANCIAL_CONTRACT_VERSION.replaceAll(".", "\\.")}"`));
  assert.match(csv, new RegExp(`"CSV-productcontract";"${CSV_PRODUCT_VERSION.replaceAll(".", "\\.")}"`));
  assert.match(csv, /"'=SOM\(A1:A2\)";10/);
  assert.doesNotMatch(csv, /;20(?:;|\r)/);
});

test("gefilterde transactie-export bewaart filters, sortering en bronvelden", () => {
  const filters = parseTransactionFilters({ month: "2026-09", kind: "uitgaven", pattern: "afwijking", sortBy: "amount", sortDirection: "asc", mode: "review" });
  const csv = toFilteredTransactionsCsv({
    filters,
    exportedAt: "2026-09-21T12:00:00.000Z",
    asOf: "2026-09-21",
    accounts: [{ id: "a", name: "Betaalrekening", iban: "NL01TEST0000000001", bank: "Test", type: "betaalrekening", balance: 10, ownAccount: true, excluded_from_import: false, lastImportAt: "2026-09-21" }],
    categories: [{ id: "eten", name: "Eten", kind: "variabele_uitgave" }],
    transactions: [{ id: "t", date: "2026-09-20", accountId: "a", accountName: "Betaalrekening", counterparty: "=Onveilig", description: "+formule", amount: -12.34, categoryId: "eten", kind: "variabele_uitgave", recurrencePattern: "afwijking", recurrenceConfidence: "high", recurrenceEvidenceCount: 6 }],
  });
  assert.match(csv, /"# csv_product_version";"1.0"/);
  assert.match(csv, /sortBy/);
  assert.match(csv, /"'\=Onveilig"/);
  assert.match(csv, /-12,34/);
  assert.match(csv, /"transaction:t"/);
  assert.equal(transactionFiltersToParams(filters).get("mode"), "review");
  assert.equal(transactionFiltersToParams(filters).get("sortBy"), "amount");
});

test("Vandaag-CSV reconcileert exact met veilig te besteden", () => {
  const forecast: DashboardCashflowForecast = {
    calculationVersion: "1.0.0",
    asOf: "2026-09-21",
    horizon: { date: "2026-09-24", reason: "next_income" },
    state: "estimated",
    paymentBalance: 684.74,
    scheduledExpenses: 110.09,
    expectedBudgetExpenses: 178,
    explicitReservations: 0,
    uncertaintyMargin: 5,
    availableToSpend: 391.65,
    incomeSources: [],
    projectedBeforeIncome: 391.65,
    timeline: [],
  };
  const csv = toTodayCalculationCsv(forecast, "2026-09-21T12:00:00.000Z");
  assert.match(csv, /"Veilig te besteden";391,65/);
  assert.equal(forecast.paymentBalance - forecast.scheduledExpenses - forecast.expectedBudgetExpenses - forecast.explicitReservations - forecast.uncertaintyMargin, forecast.availableToSpend);
});

test("Vooruit-CSV sorteert uitgaven vóór inkomen op dezelfde dag", () => {
  const csv = toForwardCsv([
    { date: "2026-09-24", label: "Salaris", amount: 3000, direction: "inkomen", frequency: "maandelijks", status: "Zelf ingevuld", confidence: "high", estimated: false, source: "income:i" },
    { date: "2026-09-24", label: "Huur", amount: -1000, direction: "uitgave", frequency: "maandelijks", status: "Zelf ingevuld", confidence: "high", estimated: false, source: "expense:e" },
  ], "2026-09-21", "2026-09-21T12:00:00.000Z");
  assert.ok(csv.indexOf('"Huur"') < csv.indexOf('"Salaris"'));
});

test("rapportexport benoemt maand, kwartaal en jaar correct", () => {
  const dataset: FinanceDataset = { accounts: [], categories: [], transactions: [] };
  assert.match(toReportCsv(dataset, "2026-01", "month"), /"Huishouden maandrapport"/);
  assert.match(toReportCsv(dataset, "2026-Q1", "quarter"), /"Huishouden kwartaalrapport"/);
  assert.match(toReportCsv(dataset, "2026", "year"), /"Huishouden jaarrapport"/);
});

test("alle rapportbestemmingen hebben een vaste, herlaadbare URL", () => {
  assert.deepEqual(reportDestinations.map(({ id }) => id), ["overview", "trends", "year", "forecast", "month"]);
  for (const destination of reportDestinations.filter((item) => item.id !== "month")) {
    assert.match(destination.href, new RegExp(`rapport=${destination.slug}#${destination.slug}$`));
    assert.equal(parseReportSlug(destination.slug), destination.id);
  }
  assert.equal(parseReportSlug("onbekend"), "overview");
});
