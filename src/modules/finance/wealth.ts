import type { Account, AccountType } from "./types";

export type WealthGroup = "direct" | "reserved" | "long_term" | "debt";
export type AccountQualityStatus = "good" | "attention" | "stale";

export interface WealthAccountQuality {
  status: AccountQualityStatus;
  label: string;
  balanceDifference: number;
  balanceDate?: string;
  lastImportAt?: string;
  lastTransactionOn?: string;
  missingSince?: string;
}

export interface WealthAccount extends Account {
  group: WealthGroup;
  groupLabel: string;
  typeLabel: string;
  quality: WealthAccountQuality;
}

export interface WealthMonthlyMovement {
  month: string;
  accountId: string;
  amount: number;
}

export interface WealthHistoryRow {
  month: string;
  direct: number;
  reserved: number;
  longTerm: number;
  debts: number;
  netWorth: number;
}

export interface WealthOverview {
  asOf: string;
  netWorth: number;
  assets: number;
  debt: number;
  directAvailable: number;
  reserved: number;
  longTerm: number;
  accounts: WealthAccount[];
  history: WealthHistoryRow[];
  attentionCount: number;
}

export interface WealthAccountEvidence {
  balanceDifference: number;
  lastTransactionOn?: string;
}

export function buildWealthOverview(input: {
  accounts: Account[];
  evidenceByAccount?: Map<string, WealthAccountEvidence>;
  monthlyMovements?: WealthMonthlyMovement[];
  asOf: string;
  historyMonths?: number;
}): WealthOverview {
  const evidenceByAccount = input.evidenceByAccount ?? new Map();
  const accounts = input.accounts.filter((account) => !account.excluded_from_import).map((account) => {
    const evidence = evidenceByAccount.get(account.id) ?? { balanceDifference: 0 };
    const quality = assessAccountQuality(account, evidence, input.asOf);
    return {
      ...account,
      group: accountGroup(account.type),
      groupLabel: accountGroupLabel(account.type),
      typeLabel: accountTypeLabel(account.type),
      quality,
    };
  });
  const directAvailable = money(sumType(accounts, "betaalrekening"));
  const reserved = money(sumType(accounts, "spaarrekening"));
  const longTerm = money(sumType(accounts, "beleggingsrekening"));
  const signedDebt = money(sumType(accounts, "schuld"));
  const netWorth = money(directAvailable + reserved + longTerm + signedDebt);
  const assets = money(accounts.reduce((sum, account) => sum + Math.max(0, account.balance), 0));
  const debt = money(accounts.filter((account) => account.type === "schuld").reduce((sum, account) => sum + Math.abs(Math.min(0, account.balance)), 0));

  return {
    asOf: input.asOf,
    netWorth,
    assets,
    debt,
    directAvailable,
    reserved,
    longTerm,
    accounts,
    history: buildWealthHistory(accounts, input.monthlyMovements ?? [], input.asOf, input.historyMonths ?? 12),
    attentionCount: accounts.filter((account) => account.quality.status !== "good").length,
  };
}

export function accountTypeLabel(type: AccountType) {
  if (type === "spaarrekening") return "Spaarrekening";
  if (type === "beleggingsrekening") return "Beleggingen";
  if (type === "schuld") return "Schuld";
  return "Betaalrekening";
}

export function accountGroup(type: AccountType): WealthGroup {
  if (type === "spaarrekening") return "reserved";
  if (type === "beleggingsrekening") return "long_term";
  if (type === "schuld") return "debt";
  return "direct";
}

export function accountGroupLabel(type: AccountType) {
  if (type === "spaarrekening") return "Gereserveerd";
  if (type === "beleggingsrekening") return "Lange termijn";
  if (type === "schuld") return "Schulden";
  return "Direct beschikbaar";
}

function assessAccountQuality(account: Account, evidence: WealthAccountEvidence, asOf: string): WealthAccountQuality {
  const balanceDifference = money(evidence.balanceDifference);
  const referenceDate = latestDate(account.balanceDate, evidence.lastTransactionOn);
  const age = referenceDate ? daysBetween(referenceDate, asOf) : Number.POSITIVE_INFINITY;
  const missingSince = age > 10 ? referenceDate : undefined;
  const status: AccountQualityStatus = Math.abs(balanceDifference) >= 0.01 ? "attention" : age > 31 ? "stale" : age > 10 ? "attention" : "good";
  const label = Math.abs(balanceDifference) >= 0.01 ? "Saldoverschil" : age > 31 ? "Gegevens verouderd" : age > 10 ? "Periode ontbreekt" : "Actueel";
  return {
    status,
    label,
    balanceDifference,
    balanceDate: account.balanceDate,
    lastImportAt: account.lastImportAt && account.lastImportAt !== new Date(0).toISOString() ? account.lastImportAt : undefined,
    lastTransactionOn: evidence.lastTransactionOn,
    missingSince,
  };
}

function buildWealthHistory(accounts: WealthAccount[], movements: WealthMonthlyMovement[], asOf: string, months: number): WealthHistoryRow[] {
  const monthKeys = lastMonthKeys(asOf.slice(0, 7), months);
  const deltas = new Map<string, Record<WealthGroup, number>>();
  const typeByAccount = new Map(accounts.map((account) => [account.id, account.type]));
  for (const movement of movements) {
    if (!monthKeys.includes(movement.month)) continue;
    const type = typeByAccount.get(movement.accountId);
    if (!type) continue;
    const group = accountGroup(type);
    const month = deltas.get(movement.month) ?? { direct: 0, reserved: 0, long_term: 0, debt: 0 };
    month[group] += movement.amount;
    deltas.set(movement.month, month);
  }

  let direct = accounts.filter((account) => account.group === "direct").reduce((sum, account) => sum + account.balance, 0);
  let reserved = accounts.filter((account) => account.group === "reserved").reduce((sum, account) => sum + account.balance, 0);
  let longTerm = accounts.filter((account) => account.group === "long_term").reduce((sum, account) => sum + account.balance, 0);
  let signedDebt = accounts.filter((account) => account.group === "debt").reduce((sum, account) => sum + account.balance, 0);
  const result: WealthHistoryRow[] = [];

  for (let index = monthKeys.length - 1; index >= 0; index -= 1) {
    const month = monthKeys[index];
    result.unshift({
      month,
      direct: money(direct),
      reserved: money(reserved),
      longTerm: money(longTerm),
      debts: money(Math.abs(Math.min(0, signedDebt))),
      netWorth: money(direct + reserved + longTerm + signedDebt),
    });
    const delta = deltas.get(month) ?? { direct: 0, reserved: 0, long_term: 0, debt: 0 };
    direct -= delta.direct;
    reserved -= delta.reserved;
    longTerm -= delta.long_term;
    signedDebt -= delta.debt;
  }
  return result;
}

function lastMonthKeys(endMonth: string, count: number) {
  const [year, month] = endMonth.split("-").map(Number);
  return Array.from({ length: Math.max(1, count) }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1 - (count - 1 - index), 1));
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  });
}

function sumType(accounts: Account[], type: AccountType) {
  return accounts.filter((account) => account.type === type).reduce((sum, account) => sum + account.balance, 0);
}

function latestDate(...values: Array<string | undefined>) {
  return values.filter((value): value is string => Boolean(value)).sort().at(-1);
}

function daysBetween(from: string, to: string) {
  return Math.floor((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000);
}

function money(value: number) {
  return Math.round(value * 100) / 100;
}
