import assert from "node:assert/strict";
import test from "node:test";
import { calculateBudgetCarryover } from "../src/modules/finance/budget-rollover";

test("ongebruikt budget wordt alleen bij meenemen aan de volgende maand toegevoegd", () => {
  assert.equal(calculateBudgetCarryover({ planned: 500, actual: 425, rollover: true }), 75);
  assert.equal(calculateBudgetCarryover({ planned: 500, actual: 425, rollover: false }), 0);
});

test("een overschreden budget levert nooit negatieve carry-over op", () => {
  assert.equal(calculateBudgetCarryover({ planned: 500, actual: 560, rollover: true }), 0);
});
