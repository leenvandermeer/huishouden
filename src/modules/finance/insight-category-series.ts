import type { DashboardInsight } from "./repository";

type CategorySeriesRow = DashboardInsight["categorySeries"][number];

const expenseKinds = new Set<CategorySeriesRow["kind"]>(["vaste_last", "reservering", "variabele_uitgave"]);

export function isExpenseCategoryRow(row: CategorySeriesRow) {
  const label = row.label.toLocaleLowerCase("nl-NL").replace(/[^a-z0-9]+/g, " ").trim();
  const isAssetMovement = row.categoryId === "sparen"
    || row.categoryId === "beleggen"
    || /(^| )(sparen|spaarrekening|beleggen|beleggingen)( |$)/.test(label);
  return expenseKinds.has(row.kind) && !isAssetMovement;
}

export function getExpenseCategoryRows(rows: CategorySeriesRow[], month?: string) {
  return rows
    .filter((row) => row.month === month && isExpenseCategoryRow(row))
    .sort((a, b) => b.amount - a.amount);
}

export function getExpenseCategoryBenchmark(rows: CategorySeriesRow[], month?: string) {
  const current = getExpenseCategoryRows(rows, month);
  const previousMonths = Array.from(new Set(rows.filter((row) => isExpenseCategoryRow(row) && (!month || row.month < month)).map((row) => row.month))).sort().slice(-3);
  return current.map((row) => {
    const comparable = rows.filter((item) => isExpenseCategoryRow(item) && previousMonths.includes(item.month) && item.categoryId === row.categoryId);
    const average = comparable.length ? comparable.reduce((sum, item) => sum + item.amount, 0) / previousMonths.length : 0;
    return { ...row, average: roundMoney(average), delta: roundMoney(row.amount - average) };
  }).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}

export function getExpenseCategoryTrend(rows: CategorySeriesRow[], months: string[], limit = 6) {
  const expenses = rows.filter((row) => months.includes(row.month) && isExpenseCategoryRow(row));
  return Array.from(new Set(expenses.map((row) => row.label)))
    .map((label) => {
      const values = months.map((month) => roundMoney(expenses.filter((row) => row.month === month && row.label === label).reduce((sum, row) => sum + row.amount, 0)));
      return { label, values, total: roundMoney(values.reduce((sum, value) => sum + value, 0)) };
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}
