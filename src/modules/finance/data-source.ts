import type { FinanceDataset } from "./bank-import";
import { getAnnualBudgetsFromDatabase, getBudgetsFromDatabase, getFinanceDatasetFromDatabase, getFinanceMetadataFromDatabase, getFixedExpensesFromDatabase, getRecurringIncomesFromDatabase, getReportSignalStatusesFromDatabase } from "./repository";

export async function getFinanceDataset(): Promise<FinanceDataset> {
  return getFinanceDatasetFromDatabase();
}

export async function getFinanceMetadata(): Promise<Omit<FinanceDataset, "transactions">> {
  return getFinanceMetadataFromDatabase();
}

export async function getBudgets(month?: string) {
  return getBudgetsFromDatabase(month);
}

export async function getAnnualBudgets(year: number) {
  return getAnnualBudgetsFromDatabase(year);
}

export async function getFixedExpenses() {
  return getFixedExpensesFromDatabase();
}

export async function getRecurringIncomes() {
  return getRecurringIncomesFromDatabase();
}

export async function getReportSignalStatuses(period: string, periodType: "month" | "quarter" | "year") {
  return getReportSignalStatusesFromDatabase(period, periodType);
}
