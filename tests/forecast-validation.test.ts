import assert from "node:assert/strict";
import test from "node:test";
import { backtestMonthlyBaseline } from "../src/modules/finance/forecast-validation";

test("historische toets gebruikt de te voorspellen maand niet als training", () => {
  const result = backtestMonthlyBaseline([100, 100, 100, 10000]);
  assert.equal(result.folds, 1);
  assert.equal(result.meanAbsoluteError, 9900);
  assert.equal(result.medianAbsoluteError, 9900);
});

test("historische toets toont geen foutmaat zonder toetsperiode", () => {
  assert.deepEqual(backtestMonthlyBaseline([100, 100, 100]), { folds: 0, meanAbsoluteError: undefined, medianAbsoluteError: undefined });
});
