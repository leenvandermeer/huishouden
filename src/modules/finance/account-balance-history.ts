export interface BalanceHistoryTransaction {
  date: string;
  amount: number;
}

export interface BalanceObservation {
  date: string;
  balance: number;
  source: "import" | "manual";
  observedAt?: string;
}

export interface AccountBalanceHistoryRow {
  month: string;
  income: number;
  expenses: number;
  net: number;
  estimatedBalance: number;
  observationSource?: BalanceObservation["source"];
  observationDate?: string;
}

export function buildAccountBalanceHistory(
  transactions: BalanceHistoryTransaction[],
  observations: BalanceObservation[],
  fallbackBalance: number,
): AccountBalanceHistoryRow[] {
  const normalizedTransactions = transactions
    .filter((transaction) => /^\d{4}-\d{2}-\d{2}$/.test(transaction.date) && Number.isFinite(transaction.amount))
    .sort((a, b) => a.date.localeCompare(b.date));
  const normalizedObservations = observations
    .filter((observation) => /^\d{4}-\d{2}-\d{2}$/.test(observation.date) && Number.isFinite(observation.balance))
    .sort((a, b) => a.date.localeCompare(b.date) || (a.observedAt ?? "").localeCompare(b.observedAt ?? ""));
  const months = Array.from(new Set([
    ...normalizedTransactions.map((transaction) => transaction.date.slice(0, 7)),
    ...normalizedObservations.map((observation) => observation.date.slice(0, 7)),
  ])).sort();

  if (!months.length) return [];

  return months.map((month) => {
    const monthEnd = `${month}-${daysInMonth(month)}`;
    const monthTransactions = normalizedTransactions.filter((transaction) => transaction.date.startsWith(month));
    const income = roundMoney(monthTransactions.filter((transaction) => transaction.amount > 0).reduce((sum, transaction) => sum + transaction.amount, 0));
    const expenses = roundMoney(monthTransactions.filter((transaction) => transaction.amount < 0).reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0));
    const net = roundMoney(monthTransactions.reduce((sum, transaction) => sum + transaction.amount, 0));
    const pastObservation = normalizedObservations.filter((observation) => observation.date <= monthEnd).at(-1);
    const futureObservation = normalizedObservations.find((observation) => observation.date > monthEnd);
    let estimatedBalance = fallbackBalance;

    if (pastObservation) {
      estimatedBalance = pastObservation.balance + normalizedTransactions
        .filter((transaction) => transaction.date > pastObservation.date && transaction.date <= monthEnd)
        .reduce((sum, transaction) => sum + transaction.amount, 0);
    } else if (futureObservation) {
      estimatedBalance = futureObservation.balance - normalizedTransactions
        .filter((transaction) => transaction.date > monthEnd && transaction.date <= futureObservation.date)
        .reduce((sum, transaction) => sum + transaction.amount, 0);
    } else {
      estimatedBalance = fallbackBalance - normalizedTransactions
        .filter((transaction) => transaction.date > monthEnd)
        .reduce((sum, transaction) => sum + transaction.amount, 0);
    }

    const monthObservation = normalizedObservations.filter((observation) => observation.date.startsWith(month)).at(-1);
    return {
      month,
      income,
      expenses,
      net,
      estimatedBalance: roundMoney(estimatedBalance),
      observationSource: monthObservation?.source,
      observationDate: monthObservation?.date,
    };
  });
}

function daysInMonth(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return String(new Date(Date.UTC(year, monthNumber, 0)).getUTCDate()).padStart(2, "0");
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
