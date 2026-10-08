import assert from "node:assert/strict";
import test from "node:test";
import { buildForwardPlanning } from "../src/modules/finance/forward-planning";
import { buildScenarioComparison } from "../src/modules/finance/scenario";
import { toScenarioCsv } from "../src/modules/finance/csv-product-contract";

const planning = buildForwardPlanning({
  asOf: "2026-09-22",
  horizonDays: 90,
  openingBalance: 1000,
  sources: [
    { sourceType: "expense", sourceId: "rent", label: "Huur", amount: 400, direction: "expense", date: "2026-09-25", frequency: "maandelijks", estimated: false, status: "manual", confidence: "high", accountLabel: "Betaalrekening", sourceHref: "/vaste-lasten" },
    { sourceType: "income", sourceId: "salary", label: "Salaris", amount: 1500, direction: "income", date: "2026-09-28", frequency: "maandelijks", estimated: false, status: "manual", confidence: "high", accountLabel: "Betaalrekening", sourceHref: "/vaste-lasten" },
  ],
});

test("een tijdelijk scenario wijzigt alleen de vergelijking", () => {
  const before = structuredClone(planning);
  const result = buildScenarioComparison({ planning, safeToSpend: 600, safeThrough: "2026-09-28", scenario: { type: "one_off_expense", amount: 250, startDate: "2026-09-24", label: "Fiets" } });
  assert.equal(result.scenario.safeToSpend, 350);
  assert.equal(result.difference.monthEndBalance, -250);
  assert.deepEqual(planning, before);
});

test("maandlast werkt reproduceerbaar door in latere maanden", () => {
  const result = buildScenarioComparison({ planning, safeToSpend: 600, safeThrough: "2026-09-28", scenario: { type: "monthly_expense", amount: 100, startDate: "2026-09-24", label: "Abonnement" } });
  assert.equal(result.difference.safeToSpend, -100);
  assert.ok(result.points.at(-1)!.scenario < result.points.at(-1)!.baseline);
  assert.match(result.conclusion, /Abonnement/);
});

test("inkomenswijziging past iedere toekomstige inkomensbetaling aan", () => {
  const result = buildScenarioComparison({ planning, safeToSpend: 600, safeThrough: "2026-09-28", scenario: { type: "income_change", amount: -200, startDate: "2026-09-22", label: "Minder uren" } });
  assert.equal(result.difference.safeToSpend, -200);
  assert.equal(result.difference.monthEndBalance, -200);
});

test("scenario-CSV bevat dezelfde bedragen en aannames als het schermmodel", () => {
  const result = buildScenarioComparison({ planning, safeToSpend: 600, safeThrough: "2026-09-28", scenario: { type: "one_off_expense", amount: 250, startDate: "2026-09-24", label: "Fiets" } });
  const csv = toScenarioCsv(result, "2026-09-22T12:00:00.000Z");
  assert.match(csv, /"# report_type";"scenario_comparison"/);
  assert.match(csv, /"Veilig te besteden";600;350;-250/);
  assert.match(csv, /"# label";"Fiets"/);
});
