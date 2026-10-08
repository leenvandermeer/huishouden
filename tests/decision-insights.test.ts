import assert from "node:assert/strict";
import test from "node:test";
import { buildDecisionInsights } from "../src/modules/finance/decision-insights";

const rows = [
  { month: "2026-06", income: 3000, spendableExpenses: 1800, spendableNet: 1200 },
  { month: "2026-07", income: 3000, spendableExpenses: 2000, spendableNet: 1000 },
  { month: "2026-08", income: 3000, spendableExpenses: 1900, spendableNet: 1100 },
  { month: "2026-09", income: 3000, spendableExpenses: 2400, spendableNet: 600 },
];

test("beslisinzicht vergelijkt dezelfde maanddefinities", () => {
  const insights = buildDecisionInsights({ rows, selectedMonth: "2026-09", safeToSpend: 500, lowestBalance: 200, fixedMonthlyTotal: 1200 });
  assert.equal(insights.length, 4);
  assert.match(insights.find((item) => item.id === "spending")!.conclusion, /€ 500,00 boven/);
  assert.match(insights.find((item) => item.id === "structure")!.conclusion, /€ 1.200,00/);
  assert.equal(insights.find((item) => item.id === "runway")!.tone, "positive");
});

test("negatieve laagste ruimte wordt handelbaar benoemd", () => {
  const insights = buildDecisionInsights({ rows, selectedMonth: "2026-09", safeToSpend: -50, lowestBalance: -300, fixedMonthlyTotal: 1200 });
  const runway = insights.find((item) => item.id === "runway")!;
  assert.equal(runway.tone, "attention");
  assert.equal(runway.href, "/planning?days=90");
});
