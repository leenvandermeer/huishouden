import assert from "node:assert/strict";
import test from "node:test";
import { detectRecurringFrequency, nextPlannedIncomeDate, normalizedSupplierKey } from "../src/modules/finance/recurrence";
import { monthlyAmount } from "../src/modules/finance/reporting";

test("herkent een vierwekelijks patroon in de Basic Fit-transacties", () => {
  assert.equal(
    detectRecurringFrequency(["2026-06-14", "2026-07-10", "2026-08-07"]),
    "vierwekelijks",
  );
});

test("verwisselt een kalendermaand niet met vier weken", () => {
  assert.equal(
    detectRecurringFrequency(["2026-05-07", "2026-06-07", "2026-07-07", "2026-08-07"]),
    "maandelijks",
  );
});

test("herkent kwartaal- en jaarpatronen", () => {
  assert.equal(detectRecurringFrequency(["2025-01-15", "2025-04-15", "2025-07-15", "2025-10-15"]), "kwartaal");
  assert.equal(detectRecurringFrequency(["2023-05-01", "2024-05-01", "2025-05-01"]), "jaarlijks");
});

test("voegt Basic Fit-naamvarianten samen", () => {
  assert.equal(normalizedSupplierKey("Basic Fit Nederland B.V."), normalizedSupplierKey("BasicFit"));
});

test("rekent een vierwekelijkse betaling om met dertien termijnen per jaar", () => {
  assert.equal(monthlyAmount({
    id: "basic-fit",
    supplier: "BasicFit",
    categoryId: "sport",
    amount: 24,
    frequency: "vierwekelijks",
  }), 26);
});

test("gepland inkomen op de peildatum blijft de horizon zolang het nog niet geboekt is", () => {
  assert.equal(nextPlannedIncomeDate("2026-10-24", "maandelijks", "2026-10-24", false), "2026-10-24");
});

test("gepland inkomen schuift door zodra vandaag structureel inkomen is geboekt", () => {
  assert.equal(nextPlannedIncomeDate("2026-10-24", "maandelijks", "2026-10-24", true), "2026-11-24");
  assert.equal(nextPlannedIncomeDate("2026-10-03", "vierwekelijks", "2026-10-31", true), "2026-11-28");
});

test("geboekt inkomen vandaag verschuift een latere inkomensdatum niet", () => {
  assert.equal(nextPlannedIncomeDate("2026-11-24", "maandelijks", "2026-10-24", true), "2026-11-24");
  assert.equal(nextPlannedIncomeDate("2026-08-24", "maandelijks", "2026-10-25", true), "2026-11-24");
});
