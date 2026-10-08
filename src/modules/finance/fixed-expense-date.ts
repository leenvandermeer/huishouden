import type { Frequency } from "./types";

export type DueDateConfidence = "high" | "medium" | "low";

export interface FixedExpenseDateEstimate {
  date: string;
  confidence: DueDateConfidence;
  evidenceCount: number;
  spreadDays: number;
  weekendAdjusted: boolean;
  reason?: string;
}

export function dueDateConfidenceLabel(confidence?: DueDateConfidence) {
  if (confidence === "high") return "hoge";
  if (confidence === "medium") return "gemiddelde";
  return "lage";
}

const dayMs = 86_400_000;

export function estimateFixedExpenseDate(bookedDates: string[], frequency: Frequency, asOf: string, supplier?: string): FixedExpenseDateEstimate | undefined {
  if (frequency === "maandelijks" && isRabobankFixedCosts(supplier)) return estimateFirstBusinessDay(asOf);
  const dates = Array.from(new Set(bookedDates.filter(isDateString))).sort().slice(-6);
  if (!dates.length || !isDateString(asOf)) return undefined;

  if (frequency === "vierwekelijks") return estimateFourWeeklyDate(dates, asOf);

  const projections = dates.map((date) => projectAfter(date, frequency, asOf)).sort();
  const projectedTimes = projections.map(toUtcTime);
  const averageTime = projectedTimes.reduce((sum, value) => sum + value, 0) / projectedTimes.length;
  let date = fromUtcTime(Math.round(averageTime / dayMs) * dayMs);
  const mostlyWeekdays = dates.filter((value) => !isWeekend(value)).length / dates.length >= 0.75;
  const weekendAdjusted = mostlyWeekdays && isWeekend(date);
  if (weekendAdjusted) date = nextWeekday(date);

  const spreadDays = Math.round((Math.max(...projectedTimes) - Math.min(...projectedTimes)) / dayMs);
  const confidence: DueDateConfidence = dates.length >= 4 && spreadDays <= 3
    ? "high"
    : dates.length >= 2 && spreadDays <= 7
      ? "medium"
      : "low";

  return {
    date,
    confidence,
    evidenceCount: dates.length,
    spreadDays,
    weekendAdjusted,
  };
}

function estimateFirstBusinessDay(asOf: string): FixedExpenseDateEstimate | undefined {
  if (!isDateString(asOf)) return undefined;
  const [year, month] = asOf.split("-").map(Number);
  let date = firstBusinessDay(year, month);
  if (date < asOf) {
    const next = new Date(Date.UTC(year, month, 1));
    date = firstBusinessDay(next.getUTCFullYear(), next.getUTCMonth() + 1);
  }
  return { date, confidence: "high", evidenceCount: 0, spreadDays: 0, weekendAdjusted: date.endsWith("-02") || date.endsWith("-03"), reason: "Vaste bankregel: eerste werkdag van de maand" };
}

function firstBusinessDay(year: number, month: number) {
  const first = `${year}-${String(month).padStart(2, "0")}-01`;
  return isWeekend(first) ? nextWeekday(first) : first;
}

function isRabobankFixedCosts(supplier?: string) {
  const normalized = (supplier ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  return normalized === "vaste kosten" || (normalized.includes("rabobank") && normalized.includes("vaste") && normalized.includes("kost"));
}

function estimateFourWeeklyDate(dates: string[], asOf: string): FixedExpenseDateEstimate {
  let date = addDays(dates.at(-1)!, 28);
  while (date < asOf) date = addDays(date, 28);
  const mostlyWeekdays = dates.filter((value) => !isWeekend(value)).length / dates.length >= 0.75;
  const weekendAdjusted = mostlyWeekdays && isWeekend(date);
  if (weekendAdjusted) date = nextWeekday(date);

  const gaps = dates.slice(1).map((value, index) => Math.round((toUtcTime(value) - toUtcTime(dates[index])) / dayMs));
  const spreadDays = gaps.length ? Math.max(...gaps) - Math.min(...gaps) : 0;
  const confidence: DueDateConfidence = dates.length >= 4 && spreadDays <= 2
    ? "high"
    : dates.length >= 2 && spreadDays <= 4
      ? "medium"
      : "low";

  return { date, confidence, evidenceCount: dates.length, spreadDays, weekendAdjusted };
}

function projectAfter(date: string, frequency: Frequency, minimum: string) {
  if (frequency === "vierwekelijks") {
    let candidate = addDays(date, 28);
    while (candidate < minimum) candidate = addDays(candidate, 28);
    return candidate;
  }
  const months = frequency === "maandelijks" ? 1 : frequency === "kwartaal" ? 3 : 12;
  let candidate = addMonths(date, months);
  while (candidate < minimum) candidate = addMonths(candidate, months);
  return candidate;
}

function addDays(date: string, days: number) {
  return fromUtcTime(toUtcTime(date) + days * dayMs);
}

function addMonths(date: string, months: number) {
  const [year, month, day] = date.split("-").map(Number);
  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  return `${target.getUTCFullYear()}-${String(target.getUTCMonth() + 1).padStart(2, "0")}-${String(Math.min(day, lastDay)).padStart(2, "0")}`;
}

function nextWeekday(date: string) {
  let time = toUtcTime(date);
  do time += dayMs;
  while ([0, 6].includes(new Date(time).getUTCDay()));
  return fromUtcTime(time);
}

function isWeekend(date: string) {
  return [0, 6].includes(new Date(toUtcTime(date)).getUTCDay());
}

function toUtcTime(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

function fromUtcTime(time: number) {
  return new Date(time).toISOString().slice(0, 10);
}

function isDateString(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(toUtcTime(value));
}
