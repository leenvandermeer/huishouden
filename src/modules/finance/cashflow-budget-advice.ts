import type { ForwardPlanningModel } from "./forward-planning";
import type { Budget, Category } from "./types";

export type CashflowBudgetAdviceStatus = "setup" | "attention" | "on_track";

export interface CashflowBudgetAdvice {
  status: CashflowBudgetAdviceStatus;
  historicalNet: number;
  plannedNetCashflow: number;
  remainingVariableBudget: number;
  lowestBalanceAfterBudgets: number;
  closingBalanceAfterBudgets: number;
  title: string;
  detail: string;
}

export function buildCashflowBudgetAdvice(input: {
  historicalNet?: number;
  planning: ForwardPlanningModel;
  budgets: Budget[];
  categories: Category[];
}): CashflowBudgetAdvice {
  const categoryKinds = new Map(input.categories.map((category) => [category.id, category.kind]));
  const variableBudgets = input.budgets.filter((budget) => categoryKinds.get(budget.categoryId) === "variabele_uitgave" && budget.planned > 0);
  const remainingVariableBudget = money(variableBudgets.reduce((sum, budget) => sum + Math.max(budget.planned - budget.actual, 0), 0));
  const historicalNet = money(input.historicalNet ?? 0);
  const plannedNetCashflow = money(input.planning.closingBalance - input.planning.openingBalance);
  const lowestBalanceAfterBudgets = money(input.planning.lowestBalance - remainingVariableBudget);
  const closingBalanceAfterBudgets = money(input.planning.closingBalance - remainingVariableBudget);

  if (!variableBudgets.length) {
    return {
      status: "setup",
      historicalNet,
      plannedNetCashflow,
      remainingVariableBudget,
      lowestBalanceAfterBudgets: input.planning.lowestBalance,
      closingBalanceAfterBudgets: input.planning.closingBalance,
      title: "Variabele uitgaven ontbreken nog in je vooruitblik.",
      detail: "De geldmomenten zijn gepland, maar zonder variabele maandbudgetten is de toekomstige ruimte nog te ruim ingeschat.",
    };
  }

  if (lowestBalanceAfterBudgets < 0) {
    return {
      status: "attention",
      historicalNet,
      plannedNetCashflow,
      remainingVariableBudget,
      lowestBalanceAfterBudgets,
      closingBalanceAfterBudgets,
      title: `Je mist ${formatWholeEuros(Math.abs(lowestBalanceAfterBudgets))} als je de resterende budgetten volledig gebruikt.`,
      detail: "Verlaag een variabel budget, verplaats een betaling of plan extra inkomen voordat het laagste saldo wordt bereikt.",
    };
  }

  return {
    status: "on_track",
    historicalNet,
    plannedNetCashflow,
    remainingVariableBudget,
    lowestBalanceAfterBudgets,
    closingBalanceAfterBudgets,
    title: `Na je resterende budgetten blijft het laagste punt ${formatWholeEuros(lowestBalanceAfterBudgets)}.`,
    detail: "De 30-dagenplanning en je variabele budgetten passen binnen de huidige betaalruimte.",
  };
}

function money(value: number) {
  return Math.round(value * 100) / 100;
}

function formatWholeEuros(value: number) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
}
