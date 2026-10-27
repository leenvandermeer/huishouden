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

test("verwacht uitgaven ook als er weinig maandbudget over is", () => {
  const result = estimateBudgetExpensesUntil([
    { planned: 300, spent: 290 },
  ], "2026-09-01", "2026-09-20");

  assert.equal(result, 190);
});

test("gebruikt na de maandgrens het budget van de volgende maand", () => {
  // 4 dagen januari × 310/31 + 9 dagen februari × 280/28
  const result = estimateBudgetExpensesUntil([
    { planned: 310, spent: 0, plannedByMonth: { "2026-02": 280 } },
  ], "2026-01-28", "2026-02-10");

  assert.equal(result, 130);
});

test("zonder budget voor de volgende maand telt het budget van deze maand daar niet door", () => {
  assert.equal(estimateBudgetExpensesUntil([{ planned: 310, spent: 0 }], "2026-01-28", "2026-02-10"), 40);
});

test("zonder maandbudget telt het historische tempo, ook over de maandgrens", () => {
  assert.equal(estimateBudgetExpensesUntil([{ spent: 0, historicalDailyRates: [150, 170, 1100] }], "2026-10-27", "2026-11-15"), 3230);
  assert.equal(estimateBudgetExpensesUntil([{ spent: 0, historicalDailyRates: [150, 170] }], "2026-10-27", "2026-11-15"), 0);
});


test("budgetoverschrijding laat verwachte volgende uitgaven niet verdwijnen", () => {
  assert.equal(estimateBudgetExpensesUntil([{ planned: 300, spent: 450 }], "2026-09-21", "2026-09-24"), 30);
});

test("historisch tempo telt mee vanaf drie maanden en gebruikt een robuuste mediaan", () => {
  assert.equal(estimateBudgetExpensesUntil([{ planned: 300, spent: 0, historicalDailyRates: [20, 22, 200] }], "2026-09-21", "2026-09-24"), 66);
  assert.equal(estimateBudgetExpensesUntil([{ planned: 300, spent: 0, historicalDailyRates: [200, 200] }], "2026-09-21", "2026-09-24"), 30);
});

test("historie verlaagt het budgettempo niet en loopt door tot de horizon", () => {
  // januari: max(10, 2) × 4; februari zonder budget: 2 × 9
  assert.equal(estimateBudgetExpensesUntil([{ planned: 310, spent: 500, historicalDailyRates: [1, 2, 3] }], "2026-01-28", "2026-02-10"), 58);
  assert.equal(estimateBudgetExpensesUntil([{ planned: 300, spent: 0 }], "2026-09-24", "2026-09-21"), 0);
});
