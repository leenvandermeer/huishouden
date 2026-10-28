import type { Frequency } from "./types";

const dayMs = 86_400_000;

export function detectRecurringFrequency(dates: string[]): Frequency | undefined {
  const uniqueDates = Array.from(new Set(dates.filter(isDateString))).sort();
  if (uniqueDates.length < 3) return undefined;

  const gaps = uniqueDates.slice(1).map((date, index) => daysBetween(uniqueDates[index], date));
  const fourWeekGaps = gaps.filter((gap) => gap >= 26 && gap <= 30);
  const averageGap = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;

  if (fourWeekGaps.length / gaps.length >= 0.75 && averageGap >= 26 && averageGap <= 30) {
    return "vierwekelijks";
  }

  const monthlyGaps = gaps.filter((gap) => gap >= 27 && gap <= 35);
  if (monthlyGaps.length / gaps.length >= 0.75 && averageGap >= 27 && averageGap <= 35) return "maandelijks";

  const quarterlyGaps = gaps.filter((gap) => gap >= 80 && gap <= 100);
  if (quarterlyGaps.length / gaps.length >= 0.75 && averageGap >= 80 && averageGap <= 100) return "kwartaal";

  const yearlyGaps = gaps.filter((gap) => gap >= 350 && gap <= 380);
  if (yearlyGaps.length / gaps.length >= 0.75 && averageGap >= 350 && averageGap <= 380) return "jaarlijks";

  return undefined;
}

export function normalizedSupplierKey(value: string) {
  return value
    .toLocaleLowerCase("nl-NL")
    .replace(/[^a-z0-9]+/g, "")
    .replace(/(?:nederland)?(?:bv|nv)$/, "");
}

function daysBetween(start: string, end: string) {
  return Math.round((toUtcTime(end) - toUtcTime(start)) / dayMs);
}

function toUtcTime(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

function isDateString(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(toUtcTime(value));
}

/** Project each occurrence from its original anchor to avoid February date drift. */
export function recurringOccurrence(anchor: string, frequency: Frequency, occurrence: number): string {
  const [year, month, day] = anchor.split("-").map(Number);
  if (frequency === "vierwekelijks") {
    return new Date(Date.UTC(year, month - 1, day + occurrence * 28)).toISOString().slice(0, 10);
  }
  const step = frequency === "maandelijks" ? 1 : frequency === "kwartaal" ? 3 : 12;
  const target = new Date(Date.UTC(year, month - 1 + step * occurrence, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return target.toISOString().slice(0, 10);
}

/** First occurrence on or after `minimum`; `alwaysAdvance` skips the anchor itself. */
export function rollDateForward(anchor: string, frequency: Frequency, minimum: string, alwaysAdvance = false) {
  let occurrence = alwaysAdvance ? 1 : 0;
  let candidate = recurringOccurrence(anchor, frequency, occurrence);
  while (candidate < minimum) candidate = recurringOccurrence(anchor, frequency, ++occurrence);
  return candidate;
}

/**
 * Once today's structural income is booked it is part of the bank balance, so a
 * planned income due today moves to its next occurrence instead of being the horizon.
 */
export function nextPlannedIncomeDate(nextExpectedOn: string, frequency: Frequency, asOf: string, incomeBookedToday: boolean) {
  const minimum = incomeBookedToday ? fromUtcTime(toUtcTime(asOf) + dayMs) : asOf;
  return rollDateForward(nextExpectedOn, frequency, minimum);
}

function fromUtcTime(time: number) {
  return new Date(time).toISOString().slice(0, 10);
}
