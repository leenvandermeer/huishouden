import assert from "node:assert/strict";
import test from "node:test";
import { buildCashflowBudgetAdvice } from "../src/modules/finance/cashflow-budget-advice";
import type { ForwardPlanningModel } from "../src/modules/finance/forward-planning";

const categories = [{ id: "food", name: "Boodschappen", kind: "variabele_uitgave" as const }];
const planning: ForwardPlanningModel = { asOf: "2026-09-23", endDate: "2026-10-23", horizonDays: 30, openingBalance: 1000, lowestBalance: 400, closingBalance: 700, events: [], weeks: [] };

test("kasstroomadvies trekt het resterende variabele budget van de vooruitblik af", () => {
  const advice = buildCashflowBudgetAdvice({ historicalNet: 125, planning, categories, budgets: [{ id: "budget-food", month: "2026-09", categoryId: "food", planned: 500, actual: 250, rollover: false }] });
  assert.equal(advice.plannedNetCashflow, -300);
  assert.equal(advice.remainingVariableBudget, 250);
  assert.equal(advice.lowestBalanceAfterBudgets, 150);
  assert.equal(advice.closingBalanceAfterBudgets, 450);
  assert.equal(advice.status, "on_track");
});

test("kasstroomadvies maakt een verwacht tekort handelbaar", () => {
  const advice = buildCashflowBudgetAdvice({ planning, categories, budgets: [{ id: "budget-food", month: "2026-09", categoryId: "food", planned: 900, actual: 200, rollover: false }] });
  assert.equal(advice.lowestBalanceAfterBudgets, -300);
  assert.equal(advice.status, "attention");
  assert.match(advice.title, /€\s*300/);
});

test("kasstroomadvies benoemt ontbrekende variabele budgetten", () => {
  const advice = buildCashflowBudgetAdvice({ planning, categories, budgets: [] });
  assert.equal(advice.status, "setup");
  assert.equal(advice.lowestBalanceAfterBudgets, planning.lowestBalance);
});
