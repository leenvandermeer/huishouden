import { buildForwardPlanning, type ForwardPlanningSource } from "./forward-planning";
import { normalizedSupplierKey } from "./recurrence";
import {
  getFinanceMetadataFromDatabase,
  getFixedExpensesFromDatabase,
  getForecastEventSkipsFromDatabase,
  getForecastSourceAccountsFromDatabase,
  getInferredRecurringIncomeCandidatesFromDatabase,
  getPlannedCashEventsFromDatabase,
  getPotsFromDatabase,
  getRecurringIncomesFromDatabase,
} from "./repository";

export async function getForwardPlanningFromDatabase(horizonDays: 30 | 60 | 90) {
  const [metadata, fixedExpenses, incomes, incomeCandidates, pots, plannedEvents, skippedEvents, sourceAccounts] = await Promise.all([
    getFinanceMetadataFromDatabase(),
    getFixedExpensesFromDatabase(),
    getRecurringIncomesFromDatabase(),
    getInferredRecurringIncomeCandidatesFromDatabase(),
    getPotsFromDatabase(),
    getPlannedCashEventsFromDatabase(),
    getForecastEventSkipsFromDatabase(),
    getForecastSourceAccountsFromDatabase(),
  ]);
  const asOf = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Amsterdam", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const accountById = new Map(metadata.accounts.map((account) => [account.id, account]));
  const accountFor = (label: string) => sourceAccounts.get(normalizedSupplierKey(label)) ?? { accountLabel: "Rekening nog niet bepaald" };
  const sources: ForwardPlanningSource[] = [
    ...incomes.map((income) => ({ sourceType: "income" as const, sourceId: income.id, label: income.label, amount: income.amount, direction: "income" as const, date: income.nextExpectedOn, frequency: income.frequency, estimated: false, status: "manual" as const, confidence: "high" as const, accountLabel: accountFor(income.label).accountLabel, sourceHref: "/vaste-lasten#income-planning" })),
    ...incomeCandidates.map((income) => ({ sourceType: "income" as const, sourceId: income.candidateId, label: income.label, amount: income.amount, direction: "income" as const, date: income.date, frequency: income.frequency, estimated: true, status: income.status, confidence: income.confidence, accountLabel: accountFor(income.label).accountLabel, sourceHref: "/vaste-lasten#income-planning" })),
    ...fixedExpenses.flatMap((expense) => {
      const date = expense.nextDueOn ?? expense.estimatedNextDueOn;
      return date ? [{ sourceType: "expense" as const, sourceId: expense.id, label: expense.supplier, amount: expense.amount, direction: "expense" as const, date, frequency: expense.frequency, estimated: !expense.nextDueOn, status: expense.nextDueOn ? "manual" as const : expense.dueDateConfidence === "high" ? "strong_estimate" as const : "provisional_estimate" as const, confidence: expense.nextDueOn ? "high" as const : expense.dueDateConfidence ?? "low", accountLabel: accountFor(expense.supplier).accountLabel, sourceHref: "/vaste-lasten" }] : [];
    }),
    ...pots.filter((pot) => (pot.monthlyReservation ?? 0) > 0).map((pot) => ({ sourceType: "reservation" as const, sourceId: pot.id, label: `Reservering ${pot.name}`, amount: pot.monthlyReservation ?? 0, direction: "expense" as const, date: endOfMonth(asOf), frequency: "maandelijks" as const, estimated: false, status: "manual" as const, confidence: "high" as const, accountLabel: pot.accountId ? accountById.get(pot.accountId)?.name ?? "Spaarrekening" : "Rekening nog niet bepaald", sourceHref: "/sparen" })),
    ...plannedEvents.map((event) => ({ sourceType: "one_off" as const, sourceId: event.id, label: event.label, amount: event.amount, direction: event.direction, date: event.dueOn, estimated: false, status: "manual" as const, confidence: "high" as const, accountLabel: event.accountLabel, sourceHref: "/planning" })),
  ];
  const openingBalance = metadata.accounts.filter((account) => account.type === "betaalrekening").reduce((sum, account) => sum + account.balance, 0);
  return {
    model: buildForwardPlanning({ asOf, horizonDays, openingBalance, sources, skippedEventKeys: new Set(skippedEvents.map((event) => event.eventKey)) }),
    accounts: metadata.accounts,
    skippedEvents,
  };
}

function endOfMonth(date: string) {
  const [year, month] = date.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
}
