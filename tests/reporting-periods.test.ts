import assert from "node:assert/strict";
import test from "node:test";
import {
  getAvailableReportPeriods,
  getCashflowByPeriod,
  getCurrentReportPeriod,
  getReportPeriodDemonstrative,
  getReportPeriodKey,
  getReportPeriodLabel,
  getReportPeriodTypeLabel,
  getReportPeriodTypePlural,
  getReportNarrative,
  isValidReportPeriod,
} from "../src/modules/finance/reporting";
import type { Transaction } from "../src/modules/finance/types";
import type { Category } from "../src/modules/finance/types";

const transactions: Transaction[] = [
  { id: "income-q1", date: "2025-01-10", accountId: "a", counterparty: "Werk", description: "Inkomen", amount: 3000, categoryId: "salaris", kind: "inkomen" },
  { id: "expense-q1", date: "2025-03-10", accountId: "a", counterparty: "Winkel", description: "Uitgave", amount: -250, categoryId: "boodschappen", kind: "variabele_uitgave" },
  { id: "income-q2", date: "2025-04-10", accountId: "a", counterparty: "Werk", description: "Inkomen", amount: 3200, categoryId: "salaris", kind: "inkomen" },
  { id: "expense-next-year", date: "2026-02-10", accountId: "a", counterparty: "Winkel", description: "Uitgave", amount: -400, categoryId: "boodschappen", kind: "variabele_uitgave" },
];

test("rapportperiodes krijgen per type de juiste sleutel, sortering en labels", () => {
  assert.equal(getReportPeriodKey("2025-11-30", "month"), "2025-11");
  assert.equal(getReportPeriodKey("2025-11-30", "quarter"), "2025-Q4");
  assert.equal(getReportPeriodKey("2025-11-30", "year"), "2025");
  assert.deepEqual(getAvailableReportPeriods(transactions, "quarter"), ["2026-Q1", "2025-Q2", "2025-Q1"]);
  assert.deepEqual(getAvailableReportPeriods(transactions, "year"), ["2026", "2025"]);
  assert.equal(getReportPeriodLabel("2025-Q4", "quarter"), "Kwartaal 2025 Q4");
  assert.equal(getReportPeriodLabel("2025", "year"), "Jaar 2025");
});

test("kwartaal- en jaarcashflow tellen dezelfde transacties exact op", () => {
  const quarters = getCashflowByPeriod(transactions, "quarter");
  const q1 = quarters.find((row) => row.period === "2025-Q1");
  assert.equal(q1?.income, 3000);
  assert.equal(q1?.spendableExpenses, 250);
  assert.equal(q1?.spendableNet, 2750);

  const years = getCashflowByPeriod(transactions, "year");
  const year = years.find((row) => row.period === "2025");
  assert.equal(year?.income, 6200);
  assert.equal(year?.spendableExpenses, 250);
  assert.equal(year?.spendableNet, 5950);
});

test("lege rapportages vallen terug op een geldig huidig type in Amsterdam", () => {
  const now = new Date("2026-09-23T10:00:00Z");
  assert.equal(getCurrentReportPeriod("month", now), "2026-09");
  assert.equal(getCurrentReportPeriod("quarter", now), "2026-Q3");
  assert.equal(getCurrentReportPeriod("year", now), "2026");
});

test("periodevalidatie en zichtbare terminologie volgen het gekozen type", () => {
  assert.equal(isValidReportPeriod("2026-09", "month"), true);
  assert.equal(isValidReportPeriod("2026-13", "month"), false);
  assert.equal(isValidReportPeriod("2026-Q3", "quarter"), true);
  assert.equal(isValidReportPeriod("2026-Q5", "quarter"), false);
  assert.equal(isValidReportPeriod("2026", "year"), true);
  assert.equal(isValidReportPeriod("2026-Q3", "year"), false);
  assert.equal(getReportPeriodTypeLabel("quarter"), "Kwartaal");
  assert.equal(getReportPeriodTypePlural("year"), "jaren");
  assert.equal(getReportPeriodDemonstrative("month"), "Deze maand");
  assert.equal(getReportPeriodDemonstrative("quarter"), "Dit kwartaal");
  assert.equal(getReportPeriodDemonstrative("year"), "Dit jaar");
});

test("verklarende tekst volgt periode en topafwijkingen zonder AI", () => {
  const categories: Category[] = [
    { id: "salaris", name: "Salaris", kind: "inkomen" },
    { id: "boodschappen", name: "Boodschappen", kind: "variabele_uitgave" },
  ];
  const narrative = getReportNarrative(transactions, categories, [], "2025-Q1", "quarter", 3);

  assert.equal(narrative.title, "Uitleg in gewone taal");
  assert.match(narrative.summary, /Kwartaal 2025 Q1/);
  assert.match(narrative.summary, /hield/);
});
