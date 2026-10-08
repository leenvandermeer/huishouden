import type { Budget, Category } from "./types";

export interface BudgetGroup {
  id: string;
  label: string;
  planned: number;
  actual: number;
  remaining: number;
  budgets: Budget[];
}

export function buildBudgetGroups(budgets: Budget[], categories: Category[]): BudgetGroup[] {
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const groups = new Map<string, BudgetGroup>();
  for (const budget of budgets) {
    const category = categoryById.get(budget.categoryId);
    const label = category?.parent || category?.name || "Overig";
    const id = slug(label);
    const group = groups.get(id) ?? { id, label, planned: 0, actual: 0, remaining: 0, budgets: [] };
    group.planned += budget.planned;
    group.actual += budget.actual;
    group.budgets.push(budget);
    groups.set(id, group);
  }
  return Array.from(groups.values())
    .map((group) => ({ ...group, planned: money(group.planned), actual: money(group.actual), remaining: money(group.planned - group.actual), budgets: group.budgets.sort((a, b) => b.actual - a.actual) }))
    .sort((a, b) => b.actual - a.actual || b.planned - a.planned || a.label.localeCompare(b.label, "nl"));
}

function slug(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "overig";
}

function money(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
