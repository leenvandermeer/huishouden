import assert from "node:assert/strict";
import test from "node:test";
import { buildBudgetCopyPreview } from "../src/modules/finance/budget-copy";
import type { Budget } from "../src/modules/finance/types";

const budget = (categoryId: string, planned: number, rollover = false): Budget => ({ id: `budget-${categoryId}`, month: "2026-08", categoryId, planned, actual: 0, rollover });

test("budgetkopie toont nieuwe, gelijke, conflicterende en ongeldige regels voor bevestiging", () => {
  const preview = buildBudgetCopyPreview(
    [budget("nieuw", 100), budget("gelijk", 200), budget("conflict", 300, true), budget("vervallen", 50)],
    [budget("gelijk", 200), budget("conflict", 250, false)],
    new Set(["nieuw", "gelijk", "conflict"]),
  );

  assert.equal(preview.newCount, 1);
  assert.equal(preview.sameCount, 1);
  assert.equal(preview.conflictCount, 1);
  assert.equal(preview.invalidCount, 1);
  assert.equal(preview.copyCount, 2);
});
