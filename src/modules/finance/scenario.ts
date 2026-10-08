import type { ForwardPlanningEvent, ForwardPlanningModel } from "./forward-planning";

export type ScenarioType = "one_off_expense" | "monthly_expense" | "extra_reservation" | "income_change";

export interface MoneyScenario {
  type: ScenarioType;
  amount: number;
  startDate: string;
  label: string;
}

export interface ScenarioPoint {
  date: string;
  baseline: number;
  scenario: number;
}

export interface ScenarioComparison {
  input: MoneyScenario;
  asOf: string;
  endDate: string;
  monthEnd: string;
  safeThrough: string;
  baseline: { safeToSpend: number; lowestBalance: number; monthEndBalance: number };
  scenario: { safeToSpend: number; lowestBalance: number; monthEndBalance: number };
  difference: { safeToSpend: number; lowestBalance: number; monthEndBalance: number };
  points: ScenarioPoint[];
  conclusion: string;
}

export function buildScenarioComparison(input: {
  planning: ForwardPlanningModel;
  safeToSpend: number;
  safeThrough: string;
  scenario: MoneyScenario;
}): ScenarioComparison {
  const scenario = normalizeScenario(input.scenario, input.planning.asOf, input.planning.endDate);
  const baselineEvents = input.planning.events.map(toSignedEvent);
  const scenarioEvents = buildScenarioEvents(scenario, input.planning.events, input.planning.endDate);
  const dates = Array.from(new Set([input.planning.asOf, input.planning.endDate, endOfMonth(input.planning.asOf), ...baselineEvents.map((event) => event.date), ...scenarioEvents.map((event) => event.date)])).sort();
  const points = dates.map((date) => ({
    date,
    baseline: money(input.planning.openingBalance + sumThrough(baselineEvents, date)),
    scenario: money(input.planning.openingBalance + sumThrough(baselineEvents, date) + sumThrough(scenarioEvents, date)),
  }));
  const monthEnd = endOfMonth(input.planning.asOf);
  const baselineMonthEnd = balanceAt(points, monthEnd, "baseline", input.planning.openingBalance);
  const scenarioMonthEnd = balanceAt(points, monthEnd, "scenario", input.planning.openingBalance);
  const baselineLowest = Math.min(input.planning.openingBalance, ...points.map((point) => point.baseline));
  const scenarioLowest = Math.min(input.planning.openingBalance, ...points.map((point) => point.scenario));
  const safeImpact = sumThrough(scenarioEvents, input.safeThrough);
  const baseline = { safeToSpend: money(input.safeToSpend), lowestBalance: money(baselineLowest), monthEndBalance: money(baselineMonthEnd) };
  const changed = { safeToSpend: money(input.safeToSpend + safeImpact), lowestBalance: money(scenarioLowest), monthEndBalance: money(scenarioMonthEnd) };
  const difference = {
    safeToSpend: money(changed.safeToSpend - baseline.safeToSpend),
    lowestBalance: money(changed.lowestBalance - baseline.lowestBalance),
    monthEndBalance: money(changed.monthEndBalance - baseline.monthEndBalance),
  };
  return { input: scenario, asOf: input.planning.asOf, endDate: input.planning.endDate, monthEnd, safeThrough: input.safeThrough, baseline, scenario: changed, difference, points, conclusion: scenarioConclusion(scenario, changed, difference) };
}

function buildScenarioEvents(scenario: MoneyScenario, baseEvents: ForwardPlanningEvent[], endDate: string) {
  if (scenario.type === "income_change") {
    return baseEvents
      .filter((event) => event.direction === "income" && event.date >= scenario.startDate)
      .map((event) => ({ date: event.date, amount: scenario.amount }));
  }
  const amount = -Math.abs(scenario.amount);
  if (scenario.type === "one_off_expense") return [{ date: scenario.startDate, amount }];
  const events: Array<{ date: string; amount: number }> = [];
  let date = scenario.startDate;
  while (date <= endDate) {
    events.push({ date, amount });
    date = addMonths(date, 1);
  }
  return events;
}

function normalizeScenario(scenario: MoneyScenario, asOf: string, endDate: string): MoneyScenario {
  const amount = Number.isFinite(scenario.amount) ? money(scenario.amount) : 0;
  const startDate = scenario.startDate < asOf ? asOf : scenario.startDate > endDate ? endDate : scenario.startDate;
  return { ...scenario, amount, startDate, label: scenario.label.trim() || scenarioLabel(scenario.type) };
}

function scenarioConclusion(scenario: MoneyScenario, changed: ScenarioComparison["scenario"], difference: ScenarioComparison["difference"]) {
  const effect = difference.monthEndBalance < 0 ? `${formatEuro(Math.abs(difference.monthEndBalance))} minder` : `${formatEuro(difference.monthEndBalance)} meer`;
  const safety = changed.lowestBalance < 0 ? `Je verwachte laagste saldo wordt ${formatEuro(changed.lowestBalance)}.` : `Je verwachte saldo blijft boven nul; het laagste punt is ${formatEuro(changed.lowestBalance)}.`;
  return `${scenario.label} geeft je aan het einde van deze maand ${effect} ruimte. ${safety}`;
}

function scenarioLabel(type: ScenarioType) {
  if (type === "monthly_expense") return "Nieuwe maandlast";
  if (type === "extra_reservation") return "Extra reservering";
  if (type === "income_change") return "Verandering in inkomen";
  return "Eenmalige uitgave";
}

function toSignedEvent(event: ForwardPlanningEvent) {
  return { date: event.date, amount: event.direction === "income" ? event.amount : -event.amount };
}

function sumThrough(events: Array<{ date: string; amount: number }>, date: string) {
  return events.filter((event) => event.date <= date).reduce((sum, event) => sum + event.amount, 0);
}

function balanceAt(points: ScenarioPoint[], date: string, key: "baseline" | "scenario", fallback: number) {
  return [...points].reverse().find((point) => point.date <= date)?.[key] ?? fallback;
}

function endOfMonth(date: string) {
  const [year, month] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}

function addMonths(date: string, months: number) {
  const [year, month, day] = date.split("-").map(Number);
  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  return `${target.getUTCFullYear()}-${String(target.getUTCMonth() + 1).padStart(2, "0")}-${String(Math.min(day, lastDay)).padStart(2, "0")}`;
}

function formatEuro(value: number) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(value);
}

function money(value: number) {
  return Math.round(value * 100) / 100;
}
