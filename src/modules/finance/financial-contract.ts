/** Version of the shared financial definitions and equations used by UI and exports. */
export const FINANCIAL_CONTRACT_VERSION = "1.0.0";

export const FINANCIAL_TERMS = {
  bankBalance: {
    label: "Op betaalrekeningen",
    definition: "De actuele bankstand van alle actieve betaalrekeningen op de peildatum.",
  },
  scheduledExpenses: {
    label: "Vaste lasten vóór inkomen",
    definition: "Verwachte vaste afschrijvingen vanaf de peildatum tot vóór de gekozen horizon.",
  },
  expectedBudgetExpenses: {
    label: "Verwachte uitgaven vóór inkomen",
    definition: "Het tijdsevenredige deel van variabele maandbudgetten dat naar verwachting vóór de horizon wordt uitgegeven.",
  },
  explicitReservations: {
    label: "Bewuste reserveringen",
    definition: "Geld dat expliciet apart is gezet en daarom niet vrij beschikbaar is.",
  },
  uncertaintyMargin: {
    label: "Onzekerheidsbuffer",
    definition: "Voorzichtige marge voor geschatte datums en bronnen met beperkte historische zekerheid.",
  },
  safeToSpend: {
    label: "Veilig te besteden",
    definition: "Bankstand min vaste lasten, verwachte uitgaven en bewuste reserveringen tot de horizon.",
  },
} as const;

export const STRUCTURAL_INCOME_CATEGORY_IDS = ["salaris", "inkomsten-onderneming", "uitkering-toeslagen"] as const;
export const SAVINGS_TRANSFER_CATEGORY_IDS = ["sparen", "potje-opname", "ontsparen"] as const;
export const INVESTMENT_CATEGORY_IDS = ["beleggen"] as const;

export interface SafeToSpendInput {
  paymentBalance: number;
  scheduledExpenses: number;
  expectedBudgetExpenses: number;
  explicitReservations?: number;
  uncertaintyMargin?: number;
}

export interface SafeToSpendCalculation {
  contractVersion: typeof FINANCIAL_CONTRACT_VERSION;
  paymentBalance: number;
  scheduledExpenses: number;
  expectedBudgetExpenses: number;
  explicitReservations: number;
  uncertaintyMargin: number;
  safeToSpend: number;
}

export function calculateSafeToSpend(input: SafeToSpendInput): SafeToSpendCalculation {
  const paymentBalance = roundMoney(input.paymentBalance);
  const scheduledExpenses = positiveMoney(input.scheduledExpenses);
  const expectedBudgetExpenses = positiveMoney(input.expectedBudgetExpenses);
  const explicitReservations = positiveMoney(input.explicitReservations ?? 0);
  const uncertaintyMargin = positiveMoney(input.uncertaintyMargin ?? 0);
  const safeToSpend = roundMoney(paymentBalance - scheduledExpenses - expectedBudgetExpenses - explicitReservations - uncertaintyMargin);

  return {
    contractVersion: FINANCIAL_CONTRACT_VERSION,
    paymentBalance,
    scheduledExpenses,
    expectedBudgetExpenses,
    explicitReservations,
    uncertaintyMargin,
    safeToSpend,
  };
}

export function calculateForecastUncertaintyMargin(input: {
  estimatedExpenses: Array<{ amount: number; confidence: "high" | "medium" | "low" }>;
  expectedBudgetExpenses: number;
  daysUntilHorizon?: number;
  incomeConfidence?: "high" | "medium" | "low";
}) {
  const expenseMargin = input.estimatedExpenses.reduce((sum, expense) => {
    const factor = expense.confidence === "low" ? 0.1 : expense.confidence === "medium" ? 0.05 : 0;
    return sum + Math.max(expense.amount, 0) * factor;
  }, 0);
  const days = Math.max(input.daysUntilHorizon ?? 0, 1);
  const dailyExpected = Math.max(input.expectedBudgetExpenses, 0) / days;
  const incomeDays = input.incomeConfidence === "low" ? 2 : input.incomeConfidence === "medium" ? 1 : 0;
  return roundMoney(expenseMargin + dailyExpected * incomeDays);
}

export function compareForecastEvents(
  a: { date: string; type: "income" | "expense" },
  b: { date: string; type: "income" | "expense" },
) {
  return a.date.localeCompare(b.date) || (a.type === b.type ? 0 : a.type === "expense" ? -1 : 1);
}

export function resolveForecastHorizon(asOf: string, nextIncomeDate?: string) {
  if (nextIncomeDate && nextIncomeDate >= asOf) {
    return { date: nextIncomeDate, reason: "next_income" as const };
  }
  return { date: endOfMonth(asOf), reason: "end_of_month" as const };
}

export function isStructuralIncomeCategory(categoryId?: string | null) {
  return Boolean(categoryId && STRUCTURAL_INCOME_CATEGORY_IDS.includes(categoryId as typeof STRUCTURAL_INCOME_CATEGORY_IDS[number]));
}

export function isSavingsTransferCategory(categoryId?: string | null) {
  return Boolean(categoryId && SAVINGS_TRANSFER_CATEGORY_IDS.includes(categoryId as typeof SAVINGS_TRANSFER_CATEGORY_IDS[number]));
}

export function isInvestmentCategory(categoryId?: string | null) {
  return Boolean(categoryId && INVESTMENT_CATEGORY_IDS.includes(categoryId as typeof INVESTMENT_CATEGORY_IDS[number]));
}

function positiveMoney(value: number) {
  return roundMoney(Math.max(value, 0));
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function endOfMonth(date: string) {
  const [year, month] = date.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
}
