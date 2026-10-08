import assert from "node:assert/strict";
import test from "node:test";
import { getExpenseCategoryBenchmark, getExpenseCategoryRows, getExpenseCategoryTrend } from "../src/modules/finance/insight-category-series";
import type { DashboardInsight } from "../src/modules/finance/repository";

type CategoryRow = DashboardInsight["categorySeries"][number];

const rows: CategoryRow[] = [
  { month: "2026-08", categoryId: "vervoer", label: "Vervoer", kind: "variabele_uitgave", amount: 100 },
  { month: "2026-09", categoryId: "vervoer", label: "Vervoer", kind: "variabele_uitgave", amount: 80.74 },
  { month: "2026-09", categoryId: "vervoer", label: "Vervoer", kind: "bijschrijving", amount: 69_353.54 },
  { month: "2026-09", categoryId: "custom-savings", label: "Sparen", kind: "reservering", amount: 32_000 },
];

test("een positieve bijschrijving met een uitgavencategorie komt niet in de uitgavengrafiek", () => {
  assert.deepEqual(getExpenseCategoryRows(rows, "2026-09").map((row) => row.amount), [80.74]);
  const trend = getExpenseCategoryTrend(rows, ["2026-08", "2026-09"]);
  assert.deepEqual(trend[0], { label: "Vervoer", values: [100, 80.74], total: 180.74 });
});

test("de categoriebenchmark vergelijkt uitsluitend echte uitgaven", () => {
  const benchmark = getExpenseCategoryBenchmark(rows, "2026-09");
  assert.equal(benchmark[0]?.average, 100);
  assert.equal(benchmark[0]?.delta, -19.26);
  assert.equal(benchmark.some((row) => row.label === "Sparen"), false);
});
