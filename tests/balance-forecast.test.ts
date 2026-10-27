import assert from "node:assert/strict";
import test from "node:test";
import { buildBalanceForecast } from "../src/modules/finance/balance-forecast-model";

test("saldoforecast traint alleen op voltooide maanden en reconcilieert historie", () => {
  const model = buildBalanceForecast(1000, [
    { month: "2026-06", net: 100 }, { month: "2026-07", net: 200 },
    { month: "2026-08", net: 300 }, { month: "2026-09", net: -900 },
  ], "2026-09");
  assert.equal(model.avgMonthlyNet, 200);
  assert.deepEqual(model.history.map((p) => p.balance), [1400, 1600, 1900, 1000]);
  assert.equal(model.forecast[0].balance, 1200);
  assert.equal(model.forecastEnd, 2200);
});

test("ontbrekende kalendermaanden worden niet uit het gemiddelde weggelaten", () => {
  const model = buildBalanceForecast(1000, [
    { month: "2026-06", net: 300 }, { month: "2026-08", net: 300 },
  ], "2026-09");
  assert.deepEqual(model.monthlyFlows.map((p) => p.net), [300, 0, 300]);
  assert.equal(model.avgMonthlyNet, 200);
});

test("geen zesmaandsraming bij minder dan drie voltooide kalendermaanden", () => {
  for (const flows of [[], [{ month: "2026-08", net: 100 }]]) {
    const model = buildBalanceForecast(1000, flows, "2026-09");
    assert.deepEqual(model.forecast, []);
    assert.equal(model.forecastEnd, 1000);
  }
});

test("einde-maandraming telt het restant van de huidige maand mee", () => {
  const flows = ["06", "07", "08"].map((month) => ({ month: `2026-${month}`, net: 300 }));
  assert.equal(buildBalanceForecast(1000, flows, "2026-09-15").forecast[0].balance, 1450);
  assert.equal(buildBalanceForecast(1000, flows, "2026-09-30").forecast[0].balance, 1300);
});

test("robuuste saldoraming wordt pas gekozen bij voldoende betere historische toetsen", () => {
  const flows = Array.from({ length: 12 }, (_, i) => ({ month: `2025-${String(i + 1).padStart(2, "0")}`, net: i === 3 ? 10000 : 100 }));
  const model = buildBalanceForecast(1000, flows, "2026-01-31");
  assert.equal(model.method, "median");
  assert.equal(model.avgMonthlyNet, 100);
  assert.equal(model.validation.folds, 9);
  assert.ok(model.validation.medianAbsoluteError! < model.validation.meanAbsoluteError! * 0.9);
  assert.equal(buildBalanceForecast(1000, flows.slice(0, 6), "2025-07-31").method, "mean");
});
