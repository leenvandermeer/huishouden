import assert from "node:assert/strict";
import test from "node:test";
import { toReportCsv } from "../src/modules/finance/report-export";
import { getPrivateExpenseReport, parseBudgetSuggestionWindow, parseReportReferenceWindow } from "../src/modules/finance/reporting";
import type { FinanceDataset } from "../src/modules/finance/bank-import";

const dataset: FinanceDataset = {
  accounts: [],
  categories: [{ id: "boodschappen", name: "Boodschappen", kind: "variabele_uitgave" }],
  transactions: Array.from({ length: 7 }, (_, index) => ({
    id: `t-${index + 1}`,
    date: `2026-${String(index + 1).padStart(2, "0")}-10`,
    accountId: "rekening",
    counterparty: "Supermarkt",
    description: "Boodschappen",
    amount: -(index + 1) * 10,
    categoryId: "boodschappen",
    kind: "variabele_uitgave" as const,
  })),
};

test("rapportreferentie gebruikt het gekozen aantal beschikbare periodes", () => {
  const threePeriods = getPrivateExpenseReport(dataset.transactions, dataset.categories, "2026-07", 3, "month");
  const sixPeriods = getPrivateExpenseReport(dataset.transactions, dataset.categories, "2026-07", 6, "month");

  assert.deepEqual(threePeriods.referenceMonths, ["2026-06", "2026-05", "2026-04"]);
  assert.deepEqual(sixPeriods.referenceMonths, ["2026-06", "2026-05", "2026-04", "2026-03", "2026-02", "2026-01"]);
  assert.equal(threePeriods.sections.find((section) => section.id === "household")?.referenceTotal, 50);
  assert.equal(sixPeriods.sections.find((section) => section.id === "household")?.referenceTotal, 35);
});

test("alleen ondersteunde referentievensters worden geaccepteerd", () => {
  assert.equal(parseReportReferenceWindow("6"), 6);
  assert.equal(parseReportReferenceWindow(12), 12);
  assert.equal(parseReportReferenceWindow("24"), 3);
  assert.equal(parseReportReferenceWindow(undefined), 3);
});

test("budgetvoorstellen accepteren vrij drie of zes maanden", () => {
  assert.equal(parseBudgetSuggestionWindow("3"), 3);
  assert.equal(parseBudgetSuggestionWindow("6"), 6);
  assert.equal(parseBudgetSuggestionWindow("12"), 6);
});

test("rapport-CSV vermeldt en gebruikt dezelfde referentieperiode", () => {
  const csv = toReportCsv(dataset, "2026-07", "month", 6);

  assert.match(csv, /"Referentieperiodes";"2026-06, 2026-05, 2026-04, 2026-03, 2026-02, 2026-01"/);
  assert.match(csv, /"Gemiddelde vorige 6 periodes"/);
  assert.match(csv, /"Huishoudelijke uitgaven";"Boodschappen";70;35;35;1/);
});
