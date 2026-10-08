import assert from "node:assert/strict";
import test from "node:test";
import { buildBudgetGroups } from "../src/modules/finance/budget-groups";
import type { Budget, Category } from "../src/modules/finance/types";

const categories: Category[] = [
  { id: "wonen", name: "Wonen", kind: "vaste_last" },
  { id: "energie", name: "Energie", parent: "Wonen", kind: "vaste_last" },
  { id: "huur", name: "Huur", parent: "Wonen", kind: "vaste_last" },
];
const budgets: Budget[] = [
  { id: "energie", month: "2026-09", categoryId: "energie", planned: 200, actual: 180, rollover: false },
  { id: "huur", month: "2026-09", categoryId: "huur", planned: 1000, actual: 1000, rollover: false },
];

test("budgetgroepen tellen hoofdgroep op en behouden subcategorieën voor drill-down", () => {
  const groups = buildBudgetGroups(budgets, categories);
  assert.equal(groups.length, 1);
  assert.equal(groups[0]?.label, "Wonen");
  assert.equal(groups[0]?.planned, 1200);
  assert.equal(groups[0]?.actual, 1180);
  assert.deepEqual(groups[0]?.budgets.map((budget) => budget.categoryId), ["huur", "energie"]);
});
