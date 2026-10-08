import type { Budget } from "./types";

export interface BudgetCopyPreviewRow {
  categoryId: string;
  sourceAmount: number;
  targetAmount?: number;
  rollover: boolean;
  status: "new" | "same" | "conflict" | "invalid";
}

export interface BudgetCopyPreview {
  rows: BudgetCopyPreviewRow[];
  newCount: number;
  sameCount: number;
  conflictCount: number;
  invalidCount: number;
  copyCount: number;
}

export function buildBudgetCopyPreview(source: Budget[], target: Budget[], activeCategoryIds: Set<string>): BudgetCopyPreview {
  const targetByCategory = new Map(target.map((budget) => [budget.categoryId, budget]));
  const rows = source.map((budget): BudgetCopyPreviewRow => {
    const targetBudget = targetByCategory.get(budget.categoryId);
    const valid = activeCategoryIds.has(budget.categoryId) && Number.isFinite(budget.planned) && budget.planned > 0;
    const status = !valid
      ? "invalid"
      : !targetBudget || targetBudget.planned <= 0
        ? "new"
        : targetBudget.planned === budget.planned && targetBudget.rollover === budget.rollover
          ? "same"
          : "conflict";
    return {
      categoryId: budget.categoryId,
      sourceAmount: budget.planned,
      targetAmount: targetBudget?.planned,
      rollover: budget.rollover,
      status,
    };
  });

  const count = (status: BudgetCopyPreviewRow["status"]) => rows.filter((row) => row.status === status).length;
  const newCount = count("new");
  const sameCount = count("same");
  const conflictCount = count("conflict");
  const invalidCount = count("invalid");
  return { rows, newCount, sameCount, conflictCount, invalidCount, copyCount: newCount + conflictCount };
}
