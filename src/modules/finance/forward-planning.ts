import { recurringOccurrence } from "./recurrence";
import type { ForecastConfidence, ForecastEvidenceStatus } from "./forecast-evidence";
import type { Frequency } from "./types";

export type ForwardSourceType = "income" | "expense" | "reservation" | "one_off";

export interface ForwardPlanningSource {
  sourceType: ForwardSourceType;
  sourceId: string;
  label: string;
  amount: number;
  direction: "income" | "expense";
  date: string;
  frequency?: Frequency;
  estimated: boolean;
  status: ForecastEvidenceStatus;
  confidence: ForecastConfidence;
  accountLabel: string;
  sourceHref: string;
}

export interface ForwardPlanningEvent extends ForwardPlanningSource {
  eventKey: string;
  projectedBalance: number;
}

export interface ForwardPlanningModel {
  asOf: string;
  endDate: string;
  horizonDays: 30 | 60 | 90;
  openingBalance: number;
  lowestBalance: number;
  closingBalance: number;
  events: ForwardPlanningEvent[];
  weeks: Array<{ key: string; label: string; events: ForwardPlanningEvent[]; lowestBalance: number }>;
}

export function buildForwardPlanning(input: {
  asOf: string;
  horizonDays: 30 | 60 | 90;
  openingBalance: number;
  sources: ForwardPlanningSource[];
  skippedEventKeys?: Set<string>;
}): ForwardPlanningModel {
  const endDate = addDays(input.asOf, input.horizonDays);
  const expanded = input.sources.flatMap((source) => expandSource(source, input.asOf, endDate))
    .filter((event) => !input.skippedEventKeys?.has(event.eventKey))
    .sort((a, b) => a.date.localeCompare(b.date) || (a.direction === b.direction ? a.label.localeCompare(b.label, "nl") : a.direction === "expense" ? -1 : 1));
  let balance = roundMoney(input.openingBalance);
  let lowestBalance = balance;
  const events = expanded.map((event) => {
    balance = roundMoney(balance + (event.direction === "income" ? event.amount : -event.amount));
    lowestBalance = Math.min(lowestBalance, balance);
    return { ...event, projectedBalance: balance };
  });
  const weeks = new Map<string, ForwardPlanningEvent[]>();
  for (const event of events) {
    const key = mondayOfWeek(event.date);
    weeks.set(key, [...(weeks.get(key) ?? []), event]);
  }
  return {
    asOf: input.asOf,
    endDate,
    horizonDays: input.horizonDays,
    openingBalance: roundMoney(input.openingBalance),
    lowestBalance: roundMoney(lowestBalance),
    closingBalance: roundMoney(balance),
    events,
    weeks: Array.from(weeks.entries()).map(([key, weekEvents]) => ({
      key,
      label: weekLabel(key),
      events: weekEvents,
      lowestBalance: Math.min(...weekEvents.map((event) => event.projectedBalance)),
    })),
  };
}

function expandSource(source: ForwardPlanningSource, asOf: string, endDate: string) {
  const events: Array<Omit<ForwardPlanningEvent, "projectedBalance">> = [];
  let date = source.date;
  let occurrence = 0;
  while (date < asOf && source.frequency) date = recurringOccurrence(source.date, source.frequency, ++occurrence);
  while (date >= asOf && date <= endDate) {
    events.push({ ...source, date, eventKey: `${source.sourceType}:${source.sourceId}:${date}` });
    if (!source.frequency) break;
    date = recurringOccurrence(source.date, source.frequency, ++occurrence);
  }
  return events;
}

function addDays(date: string, days: number) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function mondayOfWeek(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  const value = new Date(Date.UTC(year, month - 1, day));
  const offset = (value.getUTCDay() + 6) % 7;
  value.setUTCDate(value.getUTCDate() - offset);
  return value.toISOString().slice(0, 10);
}

function weekLabel(monday: string) {
  const end = addDays(monday, 6);
  const format = (value: string) => new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", timeZone: "Europe/Amsterdam" }).format(new Date(`${value}T12:00:00Z`)).replace(".", "");
  return `${format(monday)} – ${format(end)}`;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}
