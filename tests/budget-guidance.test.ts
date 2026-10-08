import assert from "node:assert/strict";
import test from "node:test";
import { getDailyMoneyInsight, getWeeklyBudgetGuidance } from "../src/modules/finance/budget-guidance";
import type { Budget, Category } from "../src/modules/finance/types";
import type { DashboardCashflowForecast } from "../src/modules/finance/repository";

const categories: Category[] = [
  { id: "boodschappen", name: "Boodschappen", kind: "variabele_uitgave" },
  { id: "hypotheek", name: "Hypotheek", kind: "vaste_last" },
];

const forecast: DashboardCashflowForecast = {
  calculationVersion: "1.0.0",
  asOf: "2026-09-20",
  horizon: { date: "2026-09-30", reason: "end_of_month" },
  state: "planned",
  paymentBalance: 1000,
  availableToSpend: 500,
  scheduledExpenses: 300,
  expectedBudgetExpenses: 200,
  explicitReservations: 0,
  uncertaintyMargin: 0,
  incomeSources: [],
  projectedBeforeIncome: 500,
  timeline: [],
};

test("weekbedrag gebruikt alleen vrij besteedbare budgetten en verdeelt tot zondag", () => {
  const budgets: Budget[] = [
    { id: "b", month: "2026-09", categoryId: "boodschappen", planned: 500, actual: 280, rollover: false },
    { id: "h", month: "2026-09", categoryId: "hypotheek", planned: 1200, actual: 1200, rollover: false },
  ];
  const result = getWeeklyBudgetGuidance(budgets, categories, "2026-09", new Date("2026-09-20T10:00:00Z"));
  assert.equal(result.remainingThisMonth, 220);
  assert.equal(result.daysCovered, 1);
  assert.equal(result.amount, 20);
});

test("budgetwaarschuwingen zijn eenvoudig en beperkt tot twee", () => {
  const budgets: Budget[] = [
    { id: "a", month: "2026-09", categoryId: "boodschappen", planned: 100, actual: 145, rollover: false },
    { id: "b", month: "2026-09", categoryId: "uitgaan", planned: 100, actual: 125, rollover: false },
    { id: "c", month: "2026-09", categoryId: "kleding", planned: 100, actual: 120, rollover: false },
  ];
  const moreCategories: Category[] = [...categories, { id: "uitgaan", name: "Uitgaan", kind: "variabele_uitgave" }, { id: "kleding", name: "Kleding", kind: "variabele_uitgave" }];
  const result = getWeeklyBudgetGuidance(budgets, moreCategories, "2026-09", new Date("2026-09-20T10:00:00Z"));
  assert.equal(result.warnings.length, 2);
  assert.equal(result.warnings[0]?.title, "Boodschappen is op");
});

test("Vandaag toont precies het belangrijkste persoonlijke signaal", () => {
  const budgets: Budget[] = [{ id: "b", month: "2026-09", categoryId: "boodschappen", planned: 100, actual: 145, rollover: false }];
  const insight = getDailyMoneyInsight({ transactions: [], categories, budgets, month: "2026-09", forecast, reviewCount: 99, today: new Date("2026-09-20T10:00:00Z") });
  assert.equal(insight.title, "Boodschappen is over budget.");
  assert.equal(insight.actionLabel, "Bekijk budget");
});

test("ontbrekend inkomen krijgt voorrang op budgetsignalen", () => {
  const budgets: Budget[] = [{ id: "b", month: "2026-09", categoryId: "boodschappen", planned: 100, actual: 145, rollover: false }];
  const insight = getDailyMoneyInsight({
    transactions: [],
    categories,
    budgets,
    month: "2026-09",
    forecast: { ...forecast, state: "setup" },
    reviewCount: 99,
    today: new Date("2026-09-20T10:00:00Z"),
  });
  assert.equal(insight.title, "Plan je volgende inkomen.");
  assert.equal(insight.href, "/vaste-lasten#income-planning");
});

test("een tekort krijgt voorrang op een overschreden budget", () => {
  const budgets: Budget[] = [{ id: "b", month: "2026-09", categoryId: "boodschappen", planned: 100, actual: 145, rollover: false }];
  const insight = getDailyMoneyInsight({
    transactions: [],
    categories,
    budgets,
    month: "2026-09",
    forecast: { ...forecast, availableToSpend: -125 },
    reviewCount: 0,
    today: new Date("2026-09-20T10:00:00Z"),
  });
  assert.match(insight.title, /€\s?125/);
  assert.equal(insight.href, "/planning");
});
