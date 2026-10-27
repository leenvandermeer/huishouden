export interface ForecastBudgetRow {
  /** Budget for the month of the peildatum; absent when the category has no plan this month. */
  planned?: number;
  spent?: number;
  /** Budgets for later months (`YYYY-MM`) that the horizon may reach. */
  plannedByMonth?: Record<string, number>;
  /** Daily expense rates for completed, sufficiently covered historical months. */
  historicalDailyRates?: number[];
}

/**
 * Estimate the variable spending that can still occur before the forecast
 * horizon. A monthly budget is a spending ceiling, not money that has already
 * been committed. A spent budget does not imply future spending stops.
 * Each calendar month in the period uses its own budget; without a budget the
 * historical rate still applies, so a missing plan never means zero spending.
 */
export function estimateBudgetExpensesUntil(
  rows: ForecastBudgetRow[],
  asOf: string,
  horizon: string,
) {
  const currentMonth = asOf.slice(0, 7);
  const segments = monthSegments(asOf, horizon);

  return roundMoney(rows.reduce((total, row) => {
    const rates = (row.historicalDailyRates ?? []).filter((rate) => Number.isFinite(rate) && rate >= 0).sort((a, b) => a - b);
    const middle = Math.floor(rates.length / 2);
    const historicalRate = rates.length >= 3
      ? rates.length % 2 ? rates[middle] : (rates[middle - 1] + rates[middle]) / 2
      : 0;
    return total + segments.reduce((sum, segment) => {
      const planned = segment.month === currentMonth ? row.planned : row.plannedByMonth?.[segment.month];
      const budgetRate = Math.max(planned ?? 0, 0) / segment.daysInMonth;
      return sum + Math.max(budgetRate, historicalRate) * segment.days;
    }, 0);
  }, 0));
}

/** Days from `from` up to (not including) `to`, split per calendar month. */
function monthSegments(from: string, to: string) {
  const segments: Array<{ month: string; days: number; daysInMonth: number }> = [];
  let start = from;
  while (start < to) {
    const nextMonth = getNextMonthStart(start);
    const end = to < nextMonth ? to : nextMonth;
    segments.push({ month: start.slice(0, 7), days: daysBetween(start, end), daysInMonth: getDaysInMonth(start) });
    start = end;
  }
  return segments;
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
