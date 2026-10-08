import assert from "node:assert/strict";
import test from "node:test";
import { estimateFixedExpenseDate } from "../src/modules/finance/fixed-expense-date";

test("schatting gebruikt het gemiddelde patroon van recente afschrijvingen", () => {
  const estimate = estimateFixedExpenseDate(
    ["2026-04-25", "2026-05-26", "2026-06-25", "2026-07-26", "2026-08-25"],
    "maandelijks",
    "2026-09-01",
  );

  assert.equal(estimate?.date, "2026-09-25");
  assert.equal(estimate?.confidence, "high");
  assert.equal(estimate?.evidenceCount, 5);
});

test("schatting verschuift een verwacht weekend naar de volgende werkdag", () => {
  const estimate = estimateFixedExpenseDate(
    ["2026-05-26", "2026-06-26", "2026-07-27", "2026-08-26"],
    "maandelijks",
    "2026-09-01",
  );

  assert.equal(estimate?.date, "2026-09-28");
  assert.equal(estimate?.weekendAdjusted, true);
  assert.equal(estimate?.confidence, "high");
});

test("een onregelmatig patroon krijgt lage zekerheid", () => {
  const estimate = estimateFixedExpenseDate(
    ["2026-05-02", "2026-06-14", "2026-07-25", "2026-08-05"],
    "maandelijks",
    "2026-09-01",
  );

  assert.equal(estimate?.confidence, "low");
});

test("vierwekelijkse schatting telt steeds exact 28 dagen op", () => {
  const estimate = estimateFixedExpenseDate(
    ["2026-06-14", "2026-07-10", "2026-08-07"],
    "vierwekelijks",
    "2026-08-08",
  );

  assert.equal(estimate?.date, "2026-09-04");
  assert.equal(estimate?.confidence, "medium");
});

test("Rabobank vaste kosten vallen op de eerste werkdag van de maand", () => {
  const weekend = estimateFixedExpenseDate([], "maandelijks", "2026-10-20", "Rabobank Vaste kosten");
  assert.equal(weekend?.date, "2026-11-02");
  assert.equal(weekend?.confidence, "high");
  assert.equal(weekend?.weekendAdjusted, true);
  assert.equal(weekend?.reason, "Vaste bankregel: eerste werkdag van de maand");

  const weekday = estimateFixedExpenseDate([], "maandelijks", "2026-11-03", "RABOBANK - VASTE KOSTEN");
  assert.equal(weekday?.date, "2026-12-01");
  assert.equal(weekday?.weekendAdjusted, false);

  assert.equal(estimateFixedExpenseDate([], "maandelijks", "2026-09-23", "Vaste Kosten")?.date, "2026-10-01");
});
