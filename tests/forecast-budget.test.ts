import assert from "node:assert/strict";
import test from "node:test";
import { estimateBudgetExpensesUntil } from "../src/modules/finance/forecast-budget";

test("reserveert alleen het verwachte budgettempo tot het volgende inkomen", () => {
  const result = estimateBudgetExpensesUntil([
    { planned: 535, spent: 76 },
    { planned: 1245, spent: 870.18 },
  ], "2026-09-21", "2026-09-24");

  assert.equal(result, 178);
});

test("reserveert nooit meer dan het nog beschikbare maandbudget", () => {
  const result = estimateBudgetExpensesUntil([
    { planned: 300, spent: 290 },
  ], "2026-09-01", "2026-09-20");

  assert.equal(result, 10);
});

test("neemt voor een horizon in de volgende maand alleen de huidige maand mee", () => {
  const result = estimateBudgetExpensesUntil([
    { planned: 310, spent: 0 },
  ], "2026-01-28", "2026-02-10");

  assert.equal(result, 40);
});
