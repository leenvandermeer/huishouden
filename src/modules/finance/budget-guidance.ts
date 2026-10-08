import type { DashboardCashflowForecast } from "./repository";
import type { Budget, Category, Transaction } from "./types";
import { getBudgetSuggestions } from "./reporting";

export interface WeeklyBudgetGuidance {
  amount: number;
  remainingThisMonth: number;
  daysCovered: number;
  isCurrentMonth: boolean;
  hasVariableBudgets: boolean;
  warnings: Array<{ title: string; detail: string; categoryId?: string }>;
}

export interface DailyMoneyInsight {
  title: string;
  detail: string;
  actionLabel: string;
  href: string;
  tone: "positive" | "attention" | "neutral";
}

export function getWeeklyBudgetGuidance(
  budgets: Budget[],
  categories: Category[],
  selectedMonth: string,
  today = new Date(),
): WeeklyBudgetGuidance {
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const variableBudgets = budgets.filter((budget) => categoryById.get(budget.categoryId)?.kind === "variabele_uitgave" && budget.planned > 0);
  const remainingThisMonth = roundMoney(variableBudgets.reduce((sum, budget) => sum + budget.planned - budget.actual, 0));
  const todayParts = getAmsterdamDateParts(today);
  const isCurrentMonth = selectedMonth === `${todayParts.year}-${String(todayParts.month).padStart(2, "0")}`;
  const daysInMonth = new Date(Date.UTC(Number(selectedMonth.slice(0, 4)), Number(selectedMonth.slice(5, 7)), 0)).getUTCDate();
  const day = isCurrentMonth ? todayParts.day : 1;
  const daysRemaining = Math.max(daysInMonth - day + 1, 1);
  const daysCovered = isCurrentMonth ? Math.min(daysUntilSundayInclusive(todayParts.weekday), daysRemaining) : 7;
  const amount = isCurrentMonth
    ? Math.max(remainingThisMonth, 0) * (daysCovered / daysRemaining)
    : Math.max(remainingThisMonth, 0) * (7 / daysInMonth);

  const warnings = variableBudgets
    .map((budget) => {
      const category = categoryById.get(budget.categoryId);
      const over = budget.actual - budget.planned;
      if (over >= 10) {
        return {
          score: over + 10_000,
          title: `${category?.name ?? "Dit budget"} is op`,
          detail: `Je hebt ${formatWholeEuros(over)} meer uitgegeven dan gepland.`,
          categoryId: budget.categoryId,
        };
      }
      const expectedByNow = isCurrentMonth ? budget.planned * (day / daysInMonth) : budget.planned;
      const ahead = budget.actual - expectedByNow;
      if (isCurrentMonth && ahead >= 15 && budget.actual >= expectedByNow * 1.2) {
        return {
          score: ahead,
          title: `${category?.name ?? "Dit budget"} gaat sneller`,
          detail: `Je loopt ongeveer ${formatWholeEuros(ahead)} voor op je maandtempo.`,
          categoryId: budget.categoryId,
        };
      }
      return undefined;
    })
    .filter((warning): warning is NonNullable<typeof warning> => Boolean(warning))
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map(({ score: _score, ...warning }) => warning);

  return {
    amount: roundMoney(amount),
    remainingThisMonth,
    daysCovered,
    isCurrentMonth,
    hasVariableBudgets: variableBudgets.length > 0,
    warnings,
  };
}

export function getDailyMoneyInsight(input: {
  transactions: Transaction[];
  categories: Category[];
  budgets: Budget[];
  month: string;
  forecast: DashboardCashflowForecast;
  reviewCount: number;
  today?: Date;
}): DailyMoneyInsight {
  if (input.forecast.state === "setup") {
    return {
      title: "Plan je volgende inkomen.",
      detail: "Zonder inkomensdatum kunnen we je veilige ruimte niet tot je volgende inkomen berekenen.",
      actionLabel: "Inkomen plannen",
      href: "/vaste-lasten#income-planning",
      tone: "attention",
    };
  }

  if (input.forecast.availableToSpend < 0) {
    return {
      title: `Je mist ${formatWholeEuros(Math.abs(input.forecast.availableToSpend))} tot je volgende inkomen.`,
      detail: "Bekijk welke geplande betaling de ruimte kleiner maakt.",
      actionLabel: "Bekijk planning",
      href: "/planning",
      tone: "attention",
    };
  }

  const categoryById = new Map(input.categories.map((category) => [category.id, category]));
  const variableBudgets = input.budgets.filter((budget) => categoryById.get(budget.categoryId)?.kind === "variabele_uitgave");
  const overspent = variableBudgets
    .map((budget) => ({ budget, over: roundMoney(budget.actual - budget.planned) }))
    .filter(({ budget, over }) => budget.planned > 0 && over >= 10)
    .sort((a, b) => b.over - a.over)[0];

  if (overspent) {
    const name = categoryById.get(overspent.budget.categoryId)?.name ?? "Een budget";
    return {
      title: `${name} is over budget.`,
      detail: `Je gaf ${formatWholeEuros(overspent.over)} meer uit dan gepland.`,
      actionLabel: "Bekijk budget",
      href: `/budgetten?month=${input.month}`,
      tone: "attention",
    };
  }

  const suggestions = getBudgetSuggestions(input.transactions, input.categories, input.month);
  const suggestionByCategory = new Map(suggestions.map((suggestion) => [suggestion.categoryId, suggestion]));
  const todayParts = getAmsterdamDateParts(input.today ?? new Date());
  const daysInMonth = new Date(Date.UTC(Number(input.month.slice(0, 4)), Number(input.month.slice(5, 7)), 0)).getUTCDate();
  const currentMonth = input.month === `${todayParts.year}-${String(todayParts.month).padStart(2, "0")}`;
  const progress = currentMonth ? todayParts.day / daysInMonth : 1;
  const paceSignal = variableBudgets
    .map((budget) => {
      const suggestion = suggestionByCategory.get(budget.categoryId);
      const expected = (suggestion?.amount ?? budget.planned) * progress;
      return { budget, ahead: roundMoney(budget.actual - expected) };
    })
    .filter(({ budget, ahead }) => budget.actual > 0 && ahead >= 20)
    .sort((a, b) => b.ahead - a.ahead)[0];

  if (paceSignal) {
    const name = categoryById.get(paceSignal.budget.categoryId)?.name ?? "Je uitgaven";
    return {
      title: `${name} gaat sneller dan normaal.`,
      detail: `Je ligt ongeveer ${formatWholeEuros(paceSignal.ahead)} voor op je gebruikelijke tempo.`,
      actionLabel: "Bekijk uitgaven",
      href: `/transacties?month=${input.month}&kind=uitgaven&categoryId=${encodeURIComponent(paceSignal.budget.categoryId)}`,
      tone: "attention",
    };
  }

  const plannedIds = new Set(input.budgets.filter((budget) => budget.planned > 0).map((budget) => budget.categoryId));
  const missingSuggestion = suggestions.find((suggestion) => categoryById.get(suggestion.categoryId)?.kind === "variabele_uitgave" && !plannedIds.has(suggestion.categoryId));
  if (missingSuggestion) {
    const name = categoryById.get(missingSuggestion.categoryId)?.name ?? "een categorie";
    return {
      title: `Maak ${name} voorspelbaar.`,
      detail: `Op basis van eerdere maanden past ${formatWholeEuros(missingSuggestion.amount)} per maand.`,
      actionLabel: "Gebruik voorstel",
      href: `/budgetten?month=${input.month}`,
      tone: "neutral",
    };
  }

  if (input.reviewCount > 0) {
    return {
      title: `${input.reviewCount} transacties hebben nog aandacht nodig.`,
      detail: "Met een categorie worden je budgetten en inzichten nauwkeuriger.",
      actionLabel: "Nu opruimen",
      href: "/categoriseren",
      tone: "neutral",
    };
  }

  return {
    title: "Je geldplanning ligt op koers.",
    detail: "Geplande betalingen en budgetten zijn meegerekend.",
    actionLabel: "Bekijk budgetten",
    href: "/budgetten",
    tone: "positive",
  };
}

function getAmsterdamDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Amsterdam",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  const weekdays: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { year: Number(value("year")), month: Number(value("month")), day: Number(value("day")), weekday: weekdays[value("weekday")] ?? 0 };
}

function daysUntilSundayInclusive(weekday: number) {
  return ((7 - weekday) % 7) + 1;
}

function formatWholeEuros(value: number) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}
