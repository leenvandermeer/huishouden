export interface ForecastBudgetRow {
  planned: number;
  spent: number;
}

/**
 * Estimate the variable spending that can still occur before the forecast
 * horizon. A monthly budget is a spending ceiling, not money that has already
 * been committed, so only the time-proportional part is held back.
 */
export function estimateBudgetExpensesUntil(
  rows: ForecastBudgetRow[],
  asOf: string,
  horizon: string,
) {
  const daysInMonth = getDaysInMonth(asOf);
  const nextMonth = getNextMonthStart(asOf);
  const effectiveHorizon = horizon < nextMonth ? horizon : nextMonth;
  const days = Math.max(daysBetween(asOf, effectiveHorizon), 0);

  return roundMoney(rows.reduce((total, row) => {
    const remaining = Math.max(row.planned - row.spent, 0);
    const expectedForWindow = Math.max(row.planned, 0) * (days / daysInMonth);
    return total + Math.min(remaining, expectedForWindow);
  }, 0));
}

function getDaysInMonth(value: string) {
  const [year, month] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function getNextMonthStart(value: string) {
  const [year, month] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string) {
  const fromDate = new Date(`${from}T12:00:00Z`);
  const toDate = new Date(`${to}T12:00:00Z`);
  return Math.round((toDate.getTime() - fromDate.getTime()) / 86_400_000);
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}
