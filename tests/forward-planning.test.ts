import assert from "node:assert/strict";
import test from "node:test";
import { buildForwardPlanning, type ForwardPlanningSource } from "../src/modules/finance/forward-planning";

const base = (overrides: Partial<ForwardPlanningSource>): ForwardPlanningSource => ({
  sourceType: "expense",
  sourceId: "source",
  label: "Betaling",
  amount: 100,
  direction: "expense",
  date: "2026-09-24",
  frequency: "maandelijks",
  estimated: false,
  status: "manual",
  confidence: "high",
  accountLabel: "Betaalrekening",
  sourceHref: "/vaste-lasten",
  ...overrides,
});

test("Vooruit breidt vierwekelijkse momenten exact per 28 dagen uit", () => {
  const model = buildForwardPlanning({ asOf: "2026-09-21", horizonDays: 90, openingBalance: 1000, sources: [base({ frequency: "vierwekelijks" })] });
  assert.deepEqual(model.events.map((event) => event.date), ["2026-09-24", "2026-10-22", "2026-11-19", "2026-12-17"]);
});

test("Vooruit verwerkt uitgaven vóór inkomen en toont de laagste ruimte", () => {
  const model = buildForwardPlanning({
    asOf: "2026-09-21",
    horizonDays: 30,
    openingBalance: 500,
    sources: [
      base({ sourceId: "income", label: "Salaris", direction: "income", amount: 1000, frequency: undefined }),
      base({ sourceId: "rent", label: "Huur", amount: 600, frequency: undefined }),
    ],
  });
  assert.deepEqual(model.events.map((event) => event.label), ["Huur", "Salaris"]);
  assert.equal(model.lowestBalance, -100);
  assert.equal(model.closingBalance, 900);
});

test("overgeslagen geldmomenten verdwijnen zonder de bron te verwijderen", () => {
  const source = base({ frequency: "vierwekelijks" });
  const model = buildForwardPlanning({ asOf: "2026-09-21", horizonDays: 60, openingBalance: 1000, sources: [source], skippedEventKeys: new Set(["expense:source:2026-09-24"]) });
  assert.deepEqual(model.events.map((event) => event.date), ["2026-10-22", "2026-11-19"]);
});

test("30, 60 en 90 dagen hebben een vaste inclusieve einddatum", () => {
  assert.equal(buildForwardPlanning({ asOf: "2026-09-21", horizonDays: 30, openingBalance: 0, sources: [] }).endDate, "2026-10-21");
  assert.equal(buildForwardPlanning({ asOf: "2026-09-21", horizonDays: 60, openingBalance: 0, sources: [] }).endDate, "2026-11-20");
  assert.equal(buildForwardPlanning({ asOf: "2026-09-21", horizonDays: 90, openingBalance: 0, sources: [] }).endDate, "2026-12-20");
});
