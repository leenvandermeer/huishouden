import { createHash, createHmac, randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { getDatabaseUrl, getPool, query } from "../../server/db/pool";
import { defaultCategories } from "./default-categories";
import { estimateFixedExpenseDate } from "./fixed-expense-date";
import { detectRecurringFrequency, normalizedSupplierKey } from "./recurrence";
import { marketCategories, marketMappingRules } from "./market-mapping";
import type { Account, AnnualBudget, Budget, CategorizationRule, CategorizationRuleScope, Category, FixedExpense, FixedExpenseCandidate, RecurringIncome, SavingsPot, Transaction } from "./types";
import { estimateBudgetExpensesUntil } from "./forecast-budget";
import { calculateForecastUncertaintyMargin, calculateSafeToSpend, compareForecastEvents, FINANCIAL_CONTRACT_VERSION, resolveForecastHorizon, STRUCTURAL_INCOME_CATEGORY_IDS } from "./financial-contract";
import { estimateStatus, type ForecastConfidence, type ForecastEvidenceStatus } from "./forecast-evidence";
import type { FinanceDataset } from "./bank-import";
import type { ReportSignalStatusRecord, ReportSignalStatusValue } from "./report-signal-status";
import { buildAccountBalanceHistory } from "./account-balance-history";
import { calculateBudgetCarryover } from "./budget-rollover";

export interface ImportResult {
  importId: string;
  filename: string;
  accountCount: number;
  transactionCount: number;
  insertedTransactions: number;
  skippedTransactions: number;
  skippedExcludedTransactions: number;
  duplicateFile: boolean;
}

export interface PendingImportFile {
  filename: string;
  contentBase64: string;
}

export interface PendingImport {
  id: string;
  files: PendingImportFile[];
  options: Record<string, unknown>;
  createdAt: string;
}

export interface ImportMappingPreset {
  id: string;
  name: string;
  sourceBank: string;
  mapping: Record<string, string>;
  lastUsedAt: string;
}

export interface ImportControlSummary {
  latestImports: Array<{
    id: string;
    filename: string;
    sourceBank: string;
    transactionCount: number;
    accountCount: number;
    importedAt: string;
  }>;
    accountRows: Array<{
      accountId: string;
      accountName: string;
      iban: string;
      type: Account["type"];
      balance: number;
      calculatedBalance: number;
      balanceDifference: number;
      transactionCount: number;
      lastImportAt?: string;
    }>;
  reviewCount: number;
}

export interface AccountDetail {
  account: Account;
  aliases: AccountAlias[];
  recentTransactions: Transaction[];
  totals: {
    transactionCount: number;
    income: number;
    expenses: number;
    investments: number;
    internal: number;
    savings: number;
    withdrawals: number;
  };
  balanceSeries: Array<{ month: string; income: number; expenses: number; net: number; estimatedBalance: number; observationSource?: "import" | "manual"; observationDate?: string }>;
}

export interface DashboardSummary {
  totalBalance: number;
  paymentBalance: number;
  savingsBalance: number;
  accounts: Account[];
  transactionCount: number;
  reviewCount: number;
  latestMonth?: string;
  selectedMonth?: string;
  previousMonth?: string;
  nextMonth?: string;
  availableMonths: string[];
  balanceSeries: Array<{
    month: string;
    totalBalance: number;
    paymentBalance: number;
    savingsBalance: number;
    income: number;
    expenses: number;
    spendableExpenses: number;
    savings: number;
    investments: number;
    withdrawals: number;
    cashNet: number;
    spendableNet: number;
  }>;
  topExpenseCategories: Array<{ categoryId?: string; label: string; amount: number }>;
  cashflowForecast: DashboardCashflowForecast;
}

export interface DashboardCashflowForecast {
  calculationVersion: typeof FINANCIAL_CONTRACT_VERSION;
  asOf: string;
  horizon: {
    date: string;
    reason: "next_income" | "end_of_month";
  };
  state: "planned" | "mixed" | "estimated" | "setup";
  paymentBalance: number;
  availableToSpend: number;
  scheduledExpenses: number;
  expectedBudgetExpenses: number;
  explicitReservations: number;
  uncertaintyMargin: number;
  dailyAmount?: number;
  daysUntilIncome?: number;
  nextIncome?: {
    label: string;
    amount: number;
    date: string;
    estimated: boolean;
    status: ForecastEvidenceStatus;
    confidence: ForecastConfidence;
  };
  incomeSources: IncomeForecastSource[];
  projectedBeforeIncome: number;
  projectedAfterIncome?: number;
  timeline: Array<{
    id: string;
    label: string;
    amount: number;
    date: string;
    type: "income" | "expense";
    estimated: boolean;
    status: ForecastEvidenceStatus;
    confidence: ForecastConfidence;
    evidenceCount: number;
    sourceHref: string;
  }>;
}

export interface IncomeForecastSource {
  id: string;
  candidateId: string;
  label: string;
  amount: number;
  minimumAmount: number;
  maximumAmount: number;
  date: string;
  frequency: FixedExpense["frequency"];
  estimated: boolean;
  status: ForecastEvidenceStatus;
  confidence: ForecastConfidence;
  evidenceCount: number;
  lastObservedOn?: string;
  sourceTransactionIds: string[];
}

export interface PlannedCashEvent {
  id: string;
  label: string;
  amount: number;
  direction: "income" | "expense";
  dueOn: string;
  accountId?: string;
  accountLabel: string;
}

export interface DashboardInsight {
  totalBalance: number;
  paymentBalance: number;
  savingsBalance: number;
  transactionCount: number;
  reviewCount: number;
  latestMonth?: string;
  balanceSeries: DashboardSummary["balanceSeries"];
  categorySeries: Array<{
    month: string;
    categoryId?: string;
    label: string;
    kind: Transaction["kind"] | "sparen" | "beleggen" | "ontsparen" | "bijschrijving";
    amount: number;
  }>;
}

export interface PotMovement {
  id: string;
  date: string;
  paymentAccountId: string;
  paymentAccountName: string;
  description: string;
  amount: number;
  direction: "inleg" | "opname";
}

export interface SavingsAccountFlow {
  totalBalance: number;
  totalIn: number;
  totalOut: number;
  netMovement: number;
  pots: SavingsPot[];
  accounts: Array<{
    account: Account;
    totalIn: number;
    totalOut: number;
    netMovement: number;
    estimatedOpeningBalance: number;
    transactionCount: number;
    recentTransactions: Transaction[];
    monthlyRows: Array<{ month: string; in: number; out: number; net: number; estimatedBalance: number }>;
  }>;
}

export interface MonthClosure {
  month: string;
  closedAt?: string;
  note?: string;
  updatedAt: string;
}

export async function getReportSignalStatusesFromDatabase(period: string, periodType: "month" | "quarter" | "year"): Promise<ReportSignalStatusRecord[]> {
  const result = await query<{ signal_id: string; status: ReportSignalStatusValue; updated_at: string }>(
    `select signal_id, status, to_char(updated_at, 'YYYY-MM-DD"T"HH24:MI:SSOF') as updated_at
     from report_signal_statuses
     where period_type = $1 and period = $2
     order by updated_at desc`,
    [periodType, period],
  );
  return result.rows.map((row) => ({ signalId: row.signal_id, status: row.status, updatedAt: row.updated_at }));
}

export async function upsertReportSignalStatus(input: { period: string; periodType: "month" | "quarter" | "year"; signalId: string; status: ReportSignalStatusValue; userId: string }) {
  await query(
    `insert into report_signal_statuses (period_type, period, signal_id, status, updated_by, updated_at)
     values ($1, $2, $3, $4, $5, now())
     on conflict (period_type, period, signal_id) do update set
       status = excluded.status,
       updated_by = excluded.updated_by,
       updated_at = now()`,
    [input.periodType, input.period, input.signalId, input.status, input.userId],
  );
}

export interface AccountAlias {
  id: string;
  accountId: string;
  alias: string;
  label?: string;
}

export interface AuditLogEntry {
  id: string;
  actorUserId?: string;
  actorName?: string;
  actorEmail?: string;
  eventType: string;
  entityType: string;
  entityId?: string;
  details: Record<string, unknown>;
  createdAt: string;
}

export type TransactionKindFilter = Transaction["kind"] | "uitgaven" | "alle";
export type TransactionSortField = "date" | "amount" | "counterparty" | "account" | "category";
export type TransactionPatternFilter = "alle" | "terugkerend" | "afwijking";
export type TransactionConfidenceFilter = "alle" | "high" | "medium" | "low";

export interface TransactionSearchFilters {
  query?: string;
  month?: string;
  accountId?: string;
  counterAccount?: string;
  counterAccountKey?: string;
  categoryId?: string;
  kind?: TransactionKindFilter;
  minAmount?: number;
  maxAmount?: number;
  review?: boolean;
  pattern?: TransactionPatternFilter;
  confidence?: TransactionConfidenceFilter;
  sortBy?: TransactionSortField;
  sortDirection?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface TransactionSearchResult {
  transactions: Transaction[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  totals: {
    income: number;
    expenses: number;
    investments: number;
    internal: number;
  };
}

export interface AccountImportExclusionResult {
  excluded: boolean;
  deletedTransactions: number;
}

export async function writeAuditLog(input: {
  actorUserId?: string;
  eventType: string;
  entityType: string;
  entityId?: string;
  details?: Record<string, unknown>;
}) {
  await query(
    `insert into audit_log (id, actor_user_id, event_type, entity_type, entity_id, details)
     values ($1, $2, $3, $4, $5, $6::jsonb)`,
    [
      `aud_${randomUUID()}`,
      input.actorUserId ?? null,
      input.eventType,
      input.entityType,
      input.entityId ?? null,
      JSON.stringify(input.details ?? {}),
    ],
  );
}

export async function getAuditLog(limit = 100): Promise<AuditLogEntry[]> {
  const result = await query<AuditLogRow>(
    `select
       a.id,
       a.actor_user_id,
       u.name as actor_name,
       u.email as actor_email,
       a.event_type,
       a.entity_type,
       a.entity_id,
       a.details,
       a.created_at
     from audit_log a
     left join users u on u.id = a.actor_user_id
     order by a.created_at desc
     limit $1`,
    [limit],
  );

  return result.rows.map((row) => ({
    id: row.id,
    actorUserId: row.actor_user_id ?? undefined,
    actorName: row.actor_name ?? undefined,
    actorEmail: row.actor_email ?? undefined,
    eventType: row.event_type,
    entityType: row.entity_type,
    entityId: row.entity_id ?? undefined,
    details: row.details ?? {},
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  }));
}

export async function createPendingImport(input: { actorUserId: string; files: PendingImportFile[]; options: Record<string, unknown> }) {
  const id = `pim_${randomUUID()}`;
  await query(
    `insert into pending_imports (id, actor_user_id, files, options)
     values ($1, $2, $3::jsonb, $4::jsonb)`,
    [id, input.actorUserId, JSON.stringify(input.files), JSON.stringify(input.options)],
  );
  return id;
}

export async function getPendingImport(id: string): Promise<PendingImport | undefined> {
  const result = await query<{ id: string; files: PendingImportFile[]; options: Record<string, unknown>; created_at: Date | string }>(
    `select id, files, options, created_at
     from pending_imports
     where id = $1
       and status = 'pending'
       and created_at > now() - interval '2 hours'`,
    [id],
  );
  const row = result.rows[0];
  if (!row) return undefined;
  return {
    id: row.id,
    files: row.files,
    options: row.options,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  };
}

export async function markPendingImportImported(id: string) {
  await query("update pending_imports set status = 'imported', imported_at = now() where id = $1", [id]);
}

// A session lock also covers the separate transactions used for each bank file.
// Use a non-blocking lock so a repeated request never waits and imports again.
export async function withBankImportLock<T>(work: () => Promise<T>): Promise<T | undefined> {
  const client = await getPool().connect();
  let locked = false;
  try {
    const result = await client.query<{ locked: boolean }>(
      "select pg_try_advisory_lock(182736, 1) as locked",
    );
    locked = result.rows[0]?.locked === true;
    if (!locked) return undefined;
    return await work();
  } finally {
    try {
      if (locked) await client.query("select pg_advisory_unlock(182736, 1)");
    } finally {
      // Destroy the session so even a failed unlock cannot leak its lock.
      client.release(true);
    }
  }
}

export async function getImportMappingPresets(): Promise<ImportMappingPreset[]> {
  const result = await query<ImportMappingPresetRow>(
    `select id, name, source_bank, mapping, last_used_at
     from import_mapping_presets
     order by last_used_at desc, name`,
  );
  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    sourceBank: row.source_bank,
    mapping: row.mapping ?? {},
    lastUsedAt: row.last_used_at instanceof Date ? row.last_used_at.toISOString() : String(row.last_used_at),
  }));
}

export async function saveImportMappingPreset(input: { name: string; sourceBank: string; mapping: Record<string, string> }) {
  const cleanMapping = Object.fromEntries(Object.entries(input.mapping).filter(([, value]) => value.trim()));
  if (!Object.keys(cleanMapping).length) return;
  await query(
    `insert into import_mapping_presets (id, name, source_bank, mapping, last_used_at)
     values ($1, $2, $3, $4::jsonb, now())
     on conflict (id) do update
     set name = excluded.name,
         source_bank = excluded.source_bank,
         mapping = excluded.mapping,
         last_used_at = now()`,
    [stableId("impmap", `${input.sourceBank.toLowerCase()}|${input.name.toLowerCase()}`), input.name, input.sourceBank, JSON.stringify(cleanMapping)],
  );
}

export async function touchImportMappingPreset(id: string) {
  await query("update import_mapping_presets set last_used_at = now() where id = $1", [id]);
}

export async function getImportControlSummary(): Promise<ImportControlSummary> {
  const [importsResult, accountsResult, reviewCount] = await Promise.all([
    query<ImportHistoryRow>(
      `select id, filename, source_bank, transaction_count, account_count, imported_at
       from imports
       order by imported_at desc
       limit 5`,
    ),
    query<ImportAccountControlRow>(
      `select
         a.id as account_id,
         a.name as account_name,
         a.iban,
         a.type,
         a.balance,
         case
           when a.balance_source = 'manual' and a.manual_balance is not null and a.balance_date is not null
             then a.manual_balance + coalesce(sum(t.amount) filter (
               where t.booked_at > a.balance_date
                  or (t.booked_at = a.balance_date and t.created_at > a.balance_checked_at)
             ), 0)
           else a.opening_balance + coalesce(sum(t.amount), 0)
         end as calculated_balance,
         a.balance - case
           when a.balance_source = 'manual' and a.manual_balance is not null and a.balance_date is not null
             then a.manual_balance + coalesce(sum(t.amount) filter (
               where t.booked_at > a.balance_date
                  or (t.booked_at = a.balance_date and t.created_at > a.balance_checked_at)
             ), 0)
           else a.opening_balance + coalesce(sum(t.amount), 0)
         end as balance_difference,
         count(distinct t.id)::int as transaction_count,
         a.last_import_at
       from accounts a
       left join transactions t on t.account_id = a.id
       where a.archived_at is null
       group by a.id, a.name, a.iban, a.type, a.balance, a.manual_balance, a.balance_date, a.balance_source, a.opening_balance, a.last_import_at
       order by a.name`,
    ),
    getCategoryReviewCount(),
  ]);

  const accountRows = accountsResult.rows.map((row) => ({
    accountId: row.account_id,
    accountName: row.account_name,
    iban: row.iban,
    type: row.type,
    balance: Number(row.balance),
    calculatedBalance: Number(row.calculated_balance),
    balanceDifference: Number(row.balance_difference),
    transactionCount: row.transaction_count,
    lastImportAt: row.last_import_at ? (row.last_import_at instanceof Date ? row.last_import_at.toISOString() : String(row.last_import_at)) : undefined,
  }));

  return {
    latestImports: importsResult.rows.map((row) => ({
      id: row.id,
      filename: row.filename,
      sourceBank: row.source_bank,
      transactionCount: row.transaction_count,
      accountCount: row.account_count,
      importedAt: row.imported_at instanceof Date ? row.imported_at.toISOString() : String(row.imported_at),
    })),
    accountRows,
    reviewCount,
  };
}

export async function getFinanceDatasetFromDatabase(): Promise<FinanceDataset> {
  const [accountsResult, categoriesResult, transactionsResult, latestImportResult] = await Promise.all([
    query<AccountRow>(
      `select id, name, iban, bank, type, balance, opening_balance,
              to_char(opening_balance_date, 'YYYY-MM-DD') as opening_balance_date,
              to_char(balance_date, 'YYYY-MM-DD') as balance_date,
              balance_checked_at,
              balance_source, own_account, last_import_at
       from accounts
       where archived_at is null
       order by name`,
    ),
    query<CategoryRow>("select id, name, parent, kind, valid_to from categories order by valid_to nulls first, parent nulls first, name"),
    query<TransactionRow>(
      `select id, account_id, to_char(booked_at, 'YYYY-MM-DD') as booked_at, counterparty, counter_account, description, amount, category_id, kind, internal_transfer_group, rule_applied
       from transactions
       order by booked_at desc, created_at desc`,
    ),
    query<ImportRow>("select filename, file_hash, transaction_count, account_count from imports order by imported_at desc limit 1"),
  ]);

  return {
    accounts: accountsResult.rows.map(mapAccount),
    categories: categoriesResult.rows.map(mapCategory),
    transactions: transactionsResult.rows.map(mapTransaction),
    importInfo: latestImportResult.rows[0]
      ? {
          filename: latestImportResult.rows[0].filename,
          fileHash: latestImportResult.rows[0].file_hash,
          transactionCount: latestImportResult.rows[0].transaction_count,
          accountCount: latestImportResult.rows[0].account_count,
        }
      : undefined,
  };
}

export async function getFinanceMetadataFromDatabase(): Promise<Omit<FinanceDataset, "transactions">> {
  const [accountsResult, categoriesResult, latestImportResult] = await Promise.all([
    query<AccountRow>(
      `select id, name, iban, bank, type, balance, opening_balance,
              to_char(opening_balance_date, 'YYYY-MM-DD') as opening_balance_date,
              to_char(balance_date, 'YYYY-MM-DD') as balance_date,
              balance_checked_at,
              balance_source, own_account, excluded_from_import, last_import_at
       from accounts
       where archived_at is null
       order by name`,
    ),
    query<CategoryRow>("select id, name, parent, kind, valid_to from categories order by valid_to nulls first, parent nulls first, name"),
    query<ImportRow>("select filename, file_hash, transaction_count, account_count from imports order by imported_at desc limit 1"),
  ]);

  return {
    accounts: accountsResult.rows.map(mapAccount),
    categories: categoriesResult.rows.map(mapCategory),
    importInfo: latestImportResult.rows[0]
      ? {
          filename: latestImportResult.rows[0].filename,
          fileHash: latestImportResult.rows[0].file_hash,
          transactionCount: latestImportResult.rows[0].transaction_count,
          accountCount: latestImportResult.rows[0].account_count,
        }
      : undefined,
  };
}

export async function getAccountSummariesFromDatabase() {
  const result = await query<{
    account_id: string;
    income: string;
    expenses: string;
    investments: string;
    calculated_balance: string;
    balance_difference: string;
  }>(
    `select
       a.id as account_id,
       coalesce(sum(t.amount) filter (
         where t.amount > 0
           and t.kind <> 'interne_overboeking'
           and t.category_id is distinct from 'sparen'
           and t.category_id is distinct from 'potje-opname'
           and t.category_id is distinct from 'ontsparen'
           and t.category_id is distinct from 'beleggen'
       ), 0)::text as income,
       coalesce(sum(abs(t.amount)) filter (
         where t.amount < 0
           and t.kind <> 'interne_overboeking'
           and t.category_id is distinct from 'sparen'
           and t.category_id is distinct from 'potje-opname'
           and t.category_id is distinct from 'ontsparen'
           and t.category_id is distinct from 'beleggen'
       ), 0)::text as expenses,
       coalesce(sum(abs(t.amount)) filter (where t.amount < 0 and t.category_id = 'beleggen'), 0)::text as investments,
       case
         when a.balance_source = 'manual' and a.manual_balance is not null and a.balance_date is not null
           then a.manual_balance + coalesce(sum(t.amount) filter (
             where t.booked_at > a.balance_date
                or (t.booked_at = a.balance_date and t.created_at > a.balance_checked_at)
           ), 0)
         else a.opening_balance + coalesce(sum(t.amount), 0)
       end::text as calculated_balance,
       (a.balance - case
         when a.balance_source = 'manual' and a.manual_balance is not null and a.balance_date is not null
           then a.manual_balance + coalesce(sum(t.amount) filter (
             where t.booked_at > a.balance_date
                or (t.booked_at = a.balance_date and t.created_at > a.balance_checked_at)
           ), 0)
         else a.opening_balance + coalesce(sum(t.amount), 0)
       end)::text as balance_difference
     from accounts a
     left join transactions t on t.account_id = a.id
     where a.archived_at is null
     group by a.id`,
  );
  return new Map(result.rows.map((row) => [
    row.account_id,
    {
      income: Number(row.income),
      expenses: Number(row.expenses),
      investments: Number(row.investments),
      calculatedBalance: Number(row.calculated_balance),
      balanceDifference: Number(row.balance_difference),
    },
  ]));
}

export async function getTransactionMonthsFromDatabase() {
  const result = await query<{ month: string }>(
    `select distinct to_char(booked_at, 'YYYY-MM') as month
     from transactions
     order by month desc`,
  );
  return result.rows.map((row) => row.month);
}

export async function getDashboardSummaryFromDatabase(selectedMonthInput?: string): Promise<DashboardSummary> {
  const [accountsResult, monthlyResult, countResult, reviewCount] = await Promise.all([
    query<AccountRow>(
      `select id, name, iban, bank, type, balance, opening_balance,
              to_char(opening_balance_date, 'YYYY-MM-DD') as opening_balance_date,
              to_char(balance_date, 'YYYY-MM-DD') as balance_date,
              balance_checked_at,
              balance_source, own_account, last_import_at
       from accounts
       where archived_at is null
       order by name`,
    ),
    query<DashboardMonthlyRow>(
      `select
         to_char(t.booked_at, 'YYYY-MM') as month,
         a.type,
         sum(t.amount)::text as delta,
         coalesce(sum(t.amount) filter (
           where t.amount > 0
             and t.kind <> 'interne_overboeking'
             and t.category_id is distinct from 'sparen'
             and t.category_id is distinct from 'ontsparen'
             and t.category_id is distinct from 'potje-opname'
             and t.category_id is distinct from 'beleggen'
         ), 0)::text as income,
         coalesce(sum(abs(t.amount)) filter (where t.amount < 0 and t.kind <> 'interne_overboeking'), 0)::text as expenses,
         coalesce(sum(abs(t.amount)) filter (
           where t.amount < 0
             and t.kind <> 'interne_overboeking'
             and t.category_id is distinct from 'sparen'
             and t.category_id is distinct from 'potje-opname'
             and t.category_id is distinct from 'ontsparen'
             and t.category_id is distinct from 'beleggen'
         ), 0)::text as spendable_expenses,
         coalesce(sum(abs(t.amount)) filter (where t.amount < 0 and t.category_id = 'sparen'), 0)::text as savings,
         coalesce(sum(abs(t.amount)) filter (where t.amount < 0 and t.category_id = 'beleggen'), 0)::text as investments,
         coalesce(sum(t.amount) filter (where t.amount > 0 and t.category_id in ('sparen', 'potje-opname', 'ontsparen')), 0)::text as withdrawals
       from transactions t
       join accounts a on a.id = t.account_id
       where a.archived_at is null
       group by to_char(t.booked_at, 'YYYY-MM'), a.type
       order by month desc`,
    ),
    query<{ count: string }>("select count(*)::text as count from transactions"),
    getCategoryReviewCount(),
  ]);

  const accounts = accountsResult.rows.map(mapAccount);
  const totalBalance = roundMoney(accounts.reduce((sum, account) => sum + account.balance, 0));
  const paymentBalance = roundMoney(accounts.filter((account) => account.type === "betaalrekening").reduce((sum, account) => sum + account.balance, 0));
  const savingsBalance = roundMoney(accounts.filter((account) => account.type === "spaarrekening").reduce((sum, account) => sum + account.balance, 0));
  const monthRows = buildDashboardBalanceSeries(monthlyResult.rows, totalBalance, paymentBalance, savingsBalance);
  const availableMonths = monthRows.map((row) => row.month);
  const selectedMonth = selectedMonthInput && availableMonths.includes(selectedMonthInput) ? selectedMonthInput : monthRows.at(-1)?.month;
  const selectedIndex = selectedMonth ? availableMonths.indexOf(selectedMonth) : -1;
  const previousMonth = selectedIndex > 0 ? availableMonths[selectedIndex - 1] : undefined;
  const nextMonth = selectedIndex >= 0 && selectedIndex < availableMonths.length - 1 ? availableMonths[selectedIndex + 1] : undefined;
  const chartStart = selectedIndex >= 0 ? Math.max(0, selectedIndex - 2) : Math.max(0, monthRows.length - 3);
  const [categoryResult, cashflowForecast] = await Promise.all([
    selectedMonth
    ? query<{ category_id: string | null; category_name: string | null; amount: string }>(
        `select t.category_id, c.name as category_name, sum(abs(t.amount))::text as amount
         from transactions t
         left join categories c on c.id = t.category_id
         where t.amount < 0
           and t.kind <> 'interne_overboeking'
           and t.category_id is distinct from 'sparen'
           and t.category_id is distinct from 'potje-opname'
           and t.category_id is distinct from 'ontsparen'
           and t.category_id is distinct from 'beleggen'
           and t.booked_at >= $1::date
           and t.booked_at < $2::date
         group by t.category_id, c.name
         order by sum(abs(t.amount)) desc
         limit 6`,
        [`${selectedMonth}-01`, nextMonthStart(selectedMonth)],
      )
    : Promise.resolve({ rows: [] as Array<{ category_id: string | null; category_name: string | null; amount: string }> }),
    getDashboardCashflowForecast(paymentBalance),
  ]);

  return {
    totalBalance,
    paymentBalance,
    savingsBalance,
    accounts,
    transactionCount: Number(countResult.rows[0]?.count ?? 0),
    reviewCount,
    latestMonth: monthRows.at(-1)?.month,
    selectedMonth,
    previousMonth,
    nextMonth,
    availableMonths,
    balanceSeries: monthRows.slice(chartStart, chartStart + 3),
    topExpenseCategories: categoryResult.rows.map((row) => ({
      categoryId: row.category_id ?? undefined,
      label: row.category_name ?? "Nog kiezen",
      amount: Number(row.amount),
    })),
    cashflowForecast,
  };
}

async function getDashboardCashflowForecast(paymentBalance: number): Promise<DashboardCashflowForecast> {
  const asOf = amsterdamDateString();
  const currentMonth = asOf.slice(0, 7);
  const [plannedIncomeResult, fixedExpenseResult, incomeHistoryResult, budgetResult, ignoredIncomeResult, skippedEventResult, plannedExpenseResult] = await Promise.all([
    query<{ id: string; label: string; amount: string; frequency: FixedExpense["frequency"]; next_expected_on: string }>(
      `select id, label, amount::text, frequency, to_char(next_expected_on, 'YYYY-MM-DD') as next_expected_on
       from recurring_incomes
       where valid_to is null
       order by next_expected_on, amount desc`,
    ),
    query<{
      id: string;
      supplier: string;
      amount: string;
      frequency: FixedExpense["frequency"];
      next_due_on: string | null;
      valid_from: string;
      booked_dates: string[];
    }>(
      `select
         f.id,
         f.supplier,
         f.amount::text,
         f.frequency,
         to_char(f.next_due_on, 'YYYY-MM-DD') as next_due_on,
         to_char(f.valid_from, 'YYYY-MM-DD') as valid_from,
         array(
           select to_char(t.booked_at, 'YYYY-MM-DD')
           from transactions t
           where t.amount < 0
             and t.kind <> 'interne_overboeking'
             and regexp_replace(regexp_replace(lower(coalesce(t.counterparty, '')), '[^a-z0-9]+', '', 'g'), '(nederland)?(bv|nv)$', '')
               = regexp_replace(regexp_replace(lower(f.supplier), '[^a-z0-9]+', '', 'g'), '(nederland)?(bv|nv)$', '')
             and t.booked_at <= current_date
           order by t.booked_at desc, t.created_at desc
           limit 6
         ) as booked_dates
       from fixed_expenses f
       where f.valid_to is null
       order by f.supplier`,
    ),
    query<{ id: string; label: string; amount: string; booked_on: string; category_id: string | null }>(
      `select
         t.id,
         coalesce(nullif(t.counterparty, ''), nullif(t.description, ''), 'Inkomen') as label,
         t.amount::text,
         to_char(t.booked_at, 'YYYY-MM-DD') as booked_on,
         t.category_id
       from transactions t
       where t.amount > 0
         and t.kind = 'inkomen'
         and t.category_id = any($1::text[])
         and t.internal_transfer_group is null
         and t.booked_at >= current_date - interval '40 months'
       order by (t.category_id = 'salaris') desc nulls last, t.booked_at desc
       limit 160`,
      [STRUCTURAL_INCOME_CATEGORY_IDS],
    ),
    query<{ planned: string; spent: string }>(
      `with actuals as (
         select t.category_id, sum(abs(t.amount)) as actual
         from transactions t
         where t.amount < 0
           and t.kind <> 'interne_overboeking'
           and to_char(t.booked_at, 'YYYY-MM') = $1
         group by t.category_id
       )
       select b.planned_amount::text as planned, coalesce(a.actual, 0)::text as spent
       from budgets b
       join categories c on c.id = b.category_id
       left join actuals a on a.category_id = b.category_id
       where b.month = $1
         and c.kind in ('variabele_uitgave', 'reservering')`,
      [currentMonth],
    ),
    query<{ suggestion_key: string }>("select suggestion_key from ignored_suggestions where suggestion_type = 'income_candidate'"),
    query<{ event_key: string }>("select event_key from forecast_event_skips where occurrence_date >= current_date - interval '1 day'"),
    query<{ id: string; label: string; amount: string; due_on: string }>(
      `select id, label, amount::text, to_char(due_on, 'YYYY-MM-DD') as due_on
       from planned_cash_events
       where direction = 'expense' and due_on >= current_date
       order by due_on`,
    ),
  ]);

  const skippedEventKeys = new Set(skippedEventResult.rows.map((row) => row.event_key));

  const plannedIncomes: IncomeForecastSource[] = plannedIncomeResult.rows.map((row) => ({
    id: row.id,
    candidateId: row.id,
    label: row.label,
    amount: Number(row.amount),
    minimumAmount: Number(row.amount),
    maximumAmount: Number(row.amount),
    date: rollDateForward(row.next_expected_on, row.frequency, asOf),
    frequency: row.frequency,
    estimated: false,
    status: "manual" as const,
    confidence: "high" as const,
    evidenceCount: 0,
    sourceTransactionIds: [],
  })).filter((income) => !skippedEventKeys.has(`income:${income.id}:${income.date}`));
  const managedIncomeKeys = new Set(plannedIncomes.map((income) => normalizedSupplierKey(income.label)));
  const ignoredIncomeKeys = new Set(ignoredIncomeResult.rows.map((row) => row.suggestion_key));
  const inferredIncomes = inferRecurringIncomes(incomeHistoryResult.rows, asOf).filter(
    (income) => !managedIncomeKeys.has(normalizedSupplierKey(income.label)) && !ignoredIncomeKeys.has(income.candidateId) && !skippedEventKeys.has(`income:${income.candidateId}:${income.date}`),
  );
  const incomeCandidates = [...plannedIncomes, ...inferredIncomes];
  const nextIncome = [...incomeCandidates].sort((a, b) => a.date.localeCompare(b.date) || b.amount - a.amount)[0];
  const horizon = resolveForecastHorizon(asOf, nextIncome?.date);

  const expenses: DashboardCashflowForecast["timeline"] = [
    ...fixedExpenseResult.rows.flatMap((row) => {
      const estimate = row.next_due_on ? undefined : estimateFixedExpenseDate(row.booked_dates, row.frequency, asOf, row.supplier);
      const date = row.next_due_on
        ? rollDateForward(row.next_due_on, row.frequency, asOf)
        : estimate?.date;
      if (!date) return [];
      return {
        id: row.id,
        label: row.supplier,
        amount: Number(row.amount),
        date,
        type: "expense" as const,
        estimated: row.next_due_on == null,
        status: row.next_due_on == null ? estimateStatus(estimate?.confidence ?? "low") : "manual" as ForecastEvidenceStatus,
        confidence: row.next_due_on == null ? estimate?.confidence ?? "low" : "high" as ForecastConfidence,
        evidenceCount: row.next_due_on == null ? estimate?.evidenceCount ?? 0 : 0,
        sourceHref: `/transacties?q=${encodeURIComponent(row.supplier)}`,
      };
    }),
    ...plannedExpenseResult.rows.map((row) => ({ id: `one_off_${row.id}`, label: row.label, amount: Number(row.amount), date: row.due_on, type: "expense" as const, estimated: false, status: "manual" as const, confidence: "high" as const, evidenceCount: 0, sourceHref: "/planning" })),
  ].filter((row) => row.date <= horizon.date && !skippedEventKeys.has(`expense:${row.id}:${row.date}`));
  const scheduledExpenses = roundMoney(expenses.reduce((sum, row) => sum + row.amount, 0));
  const expectedBudgetExpenses = estimateBudgetExpensesUntil(
    budgetResult.rows.map((row) => ({ planned: Number(row.planned), spent: Number(row.spent) })),
    asOf,
    horizon.date,
  );
  const daysUntilIncome = nextIncome ? daysBetween(asOf, nextIncome.date) : undefined;
  const uncertaintyMargin = calculateForecastUncertaintyMargin({
    estimatedExpenses: expenses.filter((expense) => expense.estimated).map((expense) => ({ amount: expense.amount, confidence: expense.confidence })),
    expectedBudgetExpenses,
    daysUntilHorizon: daysUntilIncome,
    incomeConfidence: nextIncome?.confidence,
  });
  const calculation = calculateSafeToSpend({ paymentBalance, scheduledExpenses, expectedBudgetExpenses, uncertaintyMargin });
  const availableToSpend = calculation.safeToSpend;
  const timeline: DashboardCashflowForecast["timeline"] = [
    ...expenses,
    ...(nextIncome ? [{ ...nextIncome, type: "income" as const, sourceHref: `/transacties?q=${encodeURIComponent(nextIncome.label)}&kind=inkomen` }] : []),
  ].sort(compareForecastEvents);

  return {
    calculationVersion: calculation.contractVersion,
    asOf,
    horizon,
    state: plannedIncomes.length && inferredIncomes.length ? "mixed" : plannedIncomes.length ? "planned" : inferredIncomes.length ? "estimated" : "setup",
    paymentBalance: roundMoney(paymentBalance),
    availableToSpend,
    scheduledExpenses,
    expectedBudgetExpenses,
    explicitReservations: calculation.explicitReservations,
    uncertaintyMargin: calculation.uncertaintyMargin,
    dailyAmount: daysUntilIncome == null ? undefined : roundMoney(Math.max(availableToSpend, 0) / Math.max(daysUntilIncome, 1)),
    daysUntilIncome,
    nextIncome: nextIncome
      ? { label: nextIncome.label, amount: nextIncome.amount, date: nextIncome.date, estimated: nextIncome.estimated, status: nextIncome.status, confidence: nextIncome.confidence }
      : undefined,
    incomeSources: incomeCandidates,
    projectedBeforeIncome: availableToSpend,
    projectedAfterIncome: nextIncome ? roundMoney(availableToSpend + nextIncome.amount) : undefined,
    timeline,
  };
}

export function inferRecurringIncomes(
  rows: Array<{ id: string; label: string; amount: string; booked_on: string; category_id: string | null }>,
  asOf: string,
) {
  const groups = new Map<string, typeof rows>();
  for (const row of rows) {
    const key = row.label.trim().toLowerCase();
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  const candidates = Array.from(groups.values())
    .flatMap((group) => {
      const sorted = [...group].sort((a, b) => b.booked_on.localeCompare(a.booked_on));
      const byMonth = new Map<string, { amount: number; latestDate: string }>();
      for (const row of sorted) {
        const month = row.booked_on.slice(0, 7);
        const current = byMonth.get(month);
        byMonth.set(month, {
          amount: (current?.amount ?? 0) + Number(row.amount),
          latestDate: current && current.latestDate > row.booked_on ? current.latestDate : row.booked_on,
        });
      }
      const monthly = Array.from(byMonth.values()).sort((a, b) => b.latestDate.localeCompare(a.latestDate)).slice(0, 6);
      if (monthly.length < 2) return [];
      const frequency = detectRecurringFrequency(sorted.map((row) => row.booked_on)) ?? "maandelijks";
      const staleAfterDays = frequency === "jaarlijks" ? 550 : frequency === "kwartaal" ? 190 : 62;
      if (daysBetween(monthly[0].latestDate, asOf) > staleAfterDays) return [];
      const amounts = monthly.map((row) => row.amount).sort((a, b) => a - b);
      const middle = Math.floor(amounts.length / 2);
      const amount = amounts.length % 2 ? amounts[middle] : (amounts[middle - 1] + amounts[middle]) / 2;
      const confidence: ForecastConfidence = monthly.length >= 5 ? "high" : monthly.length >= 3 ? "medium" : "low";
      const latestAmount = monthly[0].amount;
      const deviates = monthly.length >= 4 && amount > 0 && Math.abs(latestAmount - amount) / amount >= 0.4;
      const candidateId = stableId("income_candidate", normalizedSupplierKey(sorted[0].label));
      return [{
        id: candidateId,
        candidateId,
        label: sorted[0].label,
        amount: roundMoney(amount),
        minimumAmount: roundMoney(Math.min(...amounts)),
        maximumAmount: roundMoney(Math.max(...amounts)),
        date: rollDateForward(
          monthly[0].latestDate,
          frequency,
          asOf,
          true,
        ),
        frequency,
        estimated: true,
        status: estimateStatus(confidence, deviates),
        confidence,
        evidenceCount: monthly.length,
        lastObservedOn: monthly[0].latestDate,
        sourceTransactionIds: sorted.slice(0, 12).map((row) => row.id),
        salary: sorted.some((row) => row.category_id === "salaris"),
        occurrences: monthly.length,
      }];
    })
    .sort((a, b) => a.date.localeCompare(b.date) || Number(b.salary) - Number(a.salary) || b.occurrences - a.occurrences || b.amount - a.amount);
  return candidates;
}

function amsterdamDateString() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Amsterdam", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function rollDateForward(date: string, frequency: FixedExpense["frequency"], minimum: string, alwaysAdvance = false) {
  let candidate = date;
  if (alwaysAdvance) candidate = addFrequency(candidate, frequency);
  while (candidate < minimum) candidate = addFrequency(candidate, frequency);
  return candidate;
}

function addFrequency(date: string, frequency: FixedExpense["frequency"]) {
  if (frequency === "vierwekelijks") {
    const [year, month, day] = date.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day + 28)).toISOString().slice(0, 10);
  }
  const months = frequency === "maandelijks" ? 1 : frequency === "kwartaal" ? 3 : 12;
  const [year, month, day] = date.split("-").map(Number);
  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  return `${target.getUTCFullYear()}-${String(target.getUTCMonth() + 1).padStart(2, "0")}-${String(Math.min(day, lastDay)).padStart(2, "0")}`;
}

function daysBetween(start: string, end: string) {
  const parse = (value: string) => {
    const [year, month, day] = value.split("-").map(Number);
    return Date.UTC(year, month - 1, day);
  };
  return Math.max(0, Math.round((parse(end) - parse(start)) / 86_400_000));
}

export async function getDashboardInsightFromDatabase(): Promise<DashboardInsight> {
  const [accountsResult, monthlyResult, categoryResult, countResult, reviewCount] = await Promise.all([
    query<AccountRow>(
      `select id, name, iban, bank, type, balance, opening_balance,
              to_char(opening_balance_date, 'YYYY-MM-DD') as opening_balance_date,
              to_char(balance_date, 'YYYY-MM-DD') as balance_date,
              balance_checked_at,
              balance_source, own_account, last_import_at
       from accounts
       where archived_at is null
       order by name`,
    ),
    query<DashboardMonthlyRow>(
      `select
         to_char(t.booked_at, 'YYYY-MM') as month,
         a.type,
         sum(t.amount)::text as delta,
         coalesce(sum(t.amount) filter (
           where t.amount > 0
             and t.kind <> 'interne_overboeking'
             and t.category_id is distinct from 'sparen'
             and t.category_id is distinct from 'ontsparen'
             and t.category_id is distinct from 'potje-opname'
             and t.category_id is distinct from 'beleggen'
         ), 0)::text as income,
         coalesce(sum(abs(t.amount)) filter (where t.amount < 0 and t.kind <> 'interne_overboeking'), 0)::text as expenses,
         coalesce(sum(abs(t.amount)) filter (
           where t.amount < 0
             and t.kind <> 'interne_overboeking'
             and t.category_id is distinct from 'sparen'
             and t.category_id is distinct from 'potje-opname'
             and t.category_id is distinct from 'ontsparen'
             and t.category_id is distinct from 'beleggen'
         ), 0)::text as spendable_expenses,
         coalesce(sum(abs(t.amount)) filter (where t.amount < 0 and t.category_id = 'sparen'), 0)::text as savings,
         coalesce(sum(abs(t.amount)) filter (where t.amount < 0 and t.category_id = 'beleggen'), 0)::text as investments,
         coalesce(sum(t.amount) filter (where t.amount > 0 and t.category_id in ('sparen', 'potje-opname', 'ontsparen')), 0)::text as withdrawals
       from transactions t
       join accounts a on a.id = t.account_id
       where a.archived_at is null
       group by to_char(t.booked_at, 'YYYY-MM'), a.type
       order by month desc`,
    ),
    query<DashboardCategoryInsightRow>(
      `select
         to_char(t.booked_at, 'YYYY-MM') as month,
         t.category_id,
         coalesce(c.name, 'Nog kiezen') as category_name,
         case
           when t.category_id = 'sparen' and t.amount < 0 then 'sparen'
           when t.category_id = 'sparen' and t.amount > 0 then 'ontsparen'
           when t.category_id = 'beleggen' and t.amount < 0 then 'beleggen'
           when t.category_id in ('potje-opname', 'ontsparen') and t.amount > 0 then 'ontsparen'
           when t.amount > 0 and t.kind <> 'interne_overboeking' then 'bijschrijving'
           else t.kind::text
         end as kind,
         sum(abs(t.amount))::text as amount
       from transactions t
       join accounts a on a.id = t.account_id
       left join categories c on c.id = t.category_id
       where a.archived_at is null
         and t.kind <> 'interne_overboeking'
       group by
         to_char(t.booked_at, 'YYYY-MM'),
         t.category_id,
         c.name,
         case
           when t.category_id = 'sparen' and t.amount < 0 then 'sparen'
           when t.category_id = 'sparen' and t.amount > 0 then 'ontsparen'
           when t.category_id = 'beleggen' and t.amount < 0 then 'beleggen'
           when t.category_id in ('potje-opname', 'ontsparen') and t.amount > 0 then 'ontsparen'
           when t.amount > 0 and t.kind <> 'interne_overboeking' then 'bijschrijving'
           else t.kind::text
         end
       order by month asc, amount desc`,
    ),
    query<{ count: string }>("select count(*)::text as count from transactions"),
    getCategoryReviewCount(),
  ]);

  const accounts = accountsResult.rows.map(mapAccount);
  const totalBalance = roundMoney(accounts.reduce((sum, account) => sum + account.balance, 0));
  const paymentBalance = roundMoney(accounts.filter((account) => account.type === "betaalrekening").reduce((sum, account) => sum + account.balance, 0));
  const savingsBalance = roundMoney(accounts.filter((account) => account.type === "spaarrekening").reduce((sum, account) => sum + account.balance, 0));
  const balanceSeries = buildDashboardBalanceSeries(monthlyResult.rows, totalBalance, paymentBalance, savingsBalance);

  return {
    totalBalance,
    paymentBalance,
    savingsBalance,
    transactionCount: Number(countResult.rows[0]?.count ?? 0),
    reviewCount,
    latestMonth: balanceSeries.at(-1)?.month,
    balanceSeries,
    categorySeries: categoryResult.rows.map((row) => ({
      month: row.month,
      categoryId: row.category_id ?? undefined,
      label: row.category_name,
      kind: row.kind,
      amount: Number(row.amount),
    })),
  };
}

export async function searchTransactionsFromDatabase(filters: TransactionSearchFilters): Promise<TransactionSearchResult> {
  const pageSize = Math.min(Math.max(filters.pageSize ?? 50, 1), 100);
  const page = Math.max(filters.page ?? 1, 1);
  const where = buildTransactionWhere(filters);
  const offset = (page - 1) * pageSize;
  const orderBy = transactionOrderBy(filters);

  const [rowsResult, countResult, totalsResult] = await Promise.all([
    query<TransactionRow>(
      `select t.id,
              t.account_id,
              a.name as account_name,
              to_char(t.booked_at, 'YYYY-MM-DD') as booked_at,
              t.counterparty,
              t.counter_account,
              t.description,
              t.amount,
              t.category_id,
              t.kind,
              t.internal_transfer_group,
              t.rule_applied,
              i.filename as source_file,
              recurrence.evidence_count,
              recurrence.average_amount,
              category_suggestion.suggested_category_id,
              category_suggestion.suggestion_score,
              category_suggestion.suggestion_reason
       from transactions t
       join accounts a on a.id = t.account_id
       left join imports i on i.id = t.import_id
       left join categories c on c.id = t.category_id
       ${transactionRecurrenceJoin()}
       ${transactionCategorySuggestionJoin()}
       ${where.sql}
       order by ${orderBy}, t.created_at desc
       limit $${where.values.length + 1}
       offset $${where.values.length + 2}`,
      [...where.values, pageSize, offset],
    ),
    query<{ count: string }>(
      `select count(*)::text as count
       from transactions t
       join accounts a on a.id = t.account_id
       left join categories c on c.id = t.category_id
       ${transactionRecurrenceJoin()}
       ${where.sql}`,
      where.values,
    ),
    query<{ income: string; expenses: string; investments: string; internal: string }>(
      `select
         coalesce(sum(t.amount) filter (
           where t.amount > 0
             and t.kind <> 'interne_overboeking'
             and t.category_id is distinct from 'sparen'
             and t.category_id is distinct from 'potje-opname'
             and t.category_id is distinct from 'ontsparen'
             and t.category_id is distinct from 'beleggen'
         ), 0)::text as income,
         coalesce(sum(abs(t.amount)) filter (
           where t.amount < 0
             and t.kind <> 'interne_overboeking'
             and t.category_id is distinct from 'sparen'
             and t.category_id is distinct from 'potje-opname'
             and t.category_id is distinct from 'ontsparen'
             and t.category_id is distinct from 'beleggen'
         ), 0)::text as expenses,
         coalesce(sum(abs(t.amount)) filter (where t.amount < 0 and t.category_id = 'beleggen'), 0)::text as investments,
         coalesce(sum(abs(t.amount)) filter (where t.kind = 'interne_overboeking'), 0)::text as internal
       from transactions t
       join accounts a on a.id = t.account_id
       left join categories c on c.id = t.category_id
       ${transactionRecurrenceJoin()}
       ${where.sql}`,
      where.values,
    ),
  ]);

  const total = Number(countResult.rows[0]?.count ?? 0);
  return {
    transactions: rowsResult.rows.map(mapTransaction),
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
    totals: {
      income: Number(totalsResult.rows[0]?.income ?? 0),
      expenses: Number(totalsResult.rows[0]?.expenses ?? 0),
      investments: Number(totalsResult.rows[0]?.investments ?? 0),
      internal: Number(totalsResult.rows[0]?.internal ?? 0),
    },
  };
}

export async function exportTransactionsFromDatabase(filters: TransactionSearchFilters): Promise<Transaction[]> {
  const where = buildTransactionWhere(filters);
  const result = await query<TransactionRow>(
    `select t.id,
            t.account_id,
            a.name as account_name,
            to_char(t.booked_at, 'YYYY-MM-DD') as booked_at,
            t.counterparty,
            t.counter_account,
            t.description,
            t.amount,
            t.category_id,
            t.kind,
            t.internal_transfer_group,
            t.rule_applied,
            i.filename as source_file,
            recurrence.evidence_count,
            recurrence.average_amount
     from transactions t
     join accounts a on a.id = t.account_id
     left join imports i on i.id = t.import_id
     left join categories c on c.id = t.category_id
     ${transactionRecurrenceJoin()}
     ${where.sql}
     order by ${transactionOrderBy(filters)}, t.created_at desc`,
    where.values,
  );
  return result.rows.map(mapTransaction);
}

export async function getCategoryReviewTransactions(limit = 100, search?: string) {
  const pattern = search?.trim() ? `%${search.trim().toLowerCase()}%` : undefined;
  const result = await query<TransactionRow>(
    `select id, account_id, to_char(booked_at, 'YYYY-MM-DD') as booked_at, counterparty, counter_account, description, amount, category_id, kind, internal_transfer_group, rule_applied
     from transactions
     where kind <> 'interne_overboeking'
       and (
         category_id is null
         or category_id in ('overig', 'overig-inkomen')
         or rule_applied is null
       )
       and (
         $2::text is null
         or lower(concat_ws(' ', counterparty, counter_account, description)) like $2
       )
     order by booked_at desc, created_at desc
     limit $1`,
    [limit, pattern ?? null],
  );
  return result.rows.map(mapTransaction);
}

export async function getCategoryReviewBatches(limit = 8) {
  const result = await query<{ label: string; count: string; amount: string }>(
    `select
       coalesce(nullif(counterparty, ''), 'Onbekend') as label,
       count(*)::text as count,
       sum(abs(amount))::text as amount
     from transactions
     where kind <> 'interne_overboeking'
       and (
         category_id is null
         or category_id in ('overig', 'overig-inkomen')
         or rule_applied is null
       )
     group by coalesce(nullif(counterparty, ''), 'Onbekend')
     order by count(*) desc, sum(abs(amount)) desc
     limit $1`,
    [limit],
  );
  return result.rows.map((row) => ({ label: row.label, count: Number(row.count), amount: Number(row.amount) }));
}

export async function getCategoryReviewCount() {
  const result = await query<{ count: string }>(
    `select count(*)::text as count
     from transactions
     where kind <> 'interne_overboeking'
       and (
         category_id is null
         or category_id in ('overig', 'overig-inkomen')
         or rule_applied is null
       )`,
  );
  return Number(result.rows[0]?.count ?? 0);
}

export async function getTransactionCountFromDatabase() {
  const result = await query<{ count: string }>("select count(*)::text as count from transactions");
  return Number(result.rows[0]?.count ?? 0);
}

export async function getTransactionCounterAccountsFromDatabase() {
  const result = await query<{ counter_account: string; count: string }>(
    `select counter_account, count(*)::text as count
     from transactions
     where counter_account is not null
       and counter_account <> ''
     group by counter_account
     order by count(*) desc, counter_account
     limit 300`,
  );
  return result.rows.map((row) => ({ key: counterAccountKey(row.counter_account), value: row.counter_account, count: Number(row.count) }));
}

export async function resolveCounterAccountKeyFromDatabase(key: string) {
  if (!key) return undefined;
  const accounts = await getTransactionCounterAccountsFromDatabase();
  return accounts.find((account) => account.key === key)?.value;
}

export async function countExistingTransactions(transactionIds: string[]) {
  if (!transactionIds.length) return 0;
  const result = await query<{ count: string }>(
    "select count(*)::text as count from transactions where transaction_hash = any($1)",
    [transactionIds],
  );
  return Number(result.rows[0]?.count ?? 0);
}

export async function getAccountDetailFromDatabase(accountId: string): Promise<AccountDetail | undefined> {
  const [accountResult, aliasesResult, recentResult, totalsResult, historyTransactionsResult, observationsResult] = await Promise.all([
    query<AccountRow>(
      `select id, name, iban, bank, type, balance, opening_balance,
              to_char(opening_balance_date, 'YYYY-MM-DD') as opening_balance_date,
              to_char(balance_date, 'YYYY-MM-DD') as balance_date,
              balance_checked_at,
              balance_source, own_account, last_import_at
       from accounts
       where id = $1
         and archived_at is null`,
      [accountId],
    ),
    query<AccountAliasRow>("select id, account_id, alias, label from account_aliases where account_id = $1 order by alias", [accountId]),
    query<TransactionRow>(
      `select id, account_id, to_char(booked_at, 'YYYY-MM-DD') as booked_at, counterparty, counter_account, description, amount, category_id, kind, internal_transfer_group, rule_applied
       from transactions
       where account_id = $1
       order by booked_at desc, created_at desc
       limit 40`,
      [accountId],
    ),
    query<{ transaction_count: string; income: string; expenses: string; investments: string; internal: string; savings: string; withdrawals: string }>(
      `select
         count(*)::text as transaction_count,
         coalesce(sum(amount) filter (
           where amount > 0
             and kind <> 'interne_overboeking'
             and category_id is distinct from 'sparen'
             and category_id is distinct from 'potje-opname'
             and category_id is distinct from 'ontsparen'
             and category_id is distinct from 'beleggen'
         ), 0)::text as income,
         coalesce(sum(abs(amount)) filter (
           where amount < 0
             and kind <> 'interne_overboeking'
             and category_id is distinct from 'sparen'
             and category_id is distinct from 'potje-opname'
             and category_id is distinct from 'ontsparen'
             and category_id is distinct from 'beleggen'
         ), 0)::text as expenses,
         coalesce(sum(abs(amount)) filter (where amount < 0 and category_id = 'beleggen'), 0)::text as investments,
         coalesce(sum(abs(amount)) filter (where kind = 'interne_overboeking'), 0)::text as internal,
         coalesce(sum(abs(amount)) filter (where amount < 0 and category_id = 'sparen'), 0)::text as savings,
         coalesce(sum(amount) filter (where amount > 0 and category_id in ('sparen', 'potje-opname', 'ontsparen')), 0)::text as withdrawals
       from transactions
       where account_id = $1`,
      [accountId],
    ),
    query<{ date: string; amount: string }>(
      `select to_char(booked_at, 'YYYY-MM-DD') as date, amount::text
       from transactions
       where account_id = $1
       order by booked_at, created_at`,
      [accountId],
    ),
    query<{ date: string; balance: string; source: "import" | "manual"; observed_at: Date | string }>(
      `select to_char(observed_on, 'YYYY-MM-DD') as date, balance::text, source, observed_at
       from account_balance_observations
       where account_id = $1
       order by observed_on, observed_at`,
      [accountId],
    ),
  ]);

  const account = accountResult.rows[0];
  if (!account) return undefined;
  const mappedAccount = mapAccount(account);
  const balanceSeries = buildAccountBalanceHistory(
    historyTransactionsResult.rows.map((row) => ({ date: row.date, amount: Number(row.amount) })),
    observationsResult.rows.map((row) => ({ date: row.date, balance: Number(row.balance), source: row.source, observedAt: dateTimeString(row.observed_at) })),
    mappedAccount.balance,
  );
  const totals = totalsResult.rows[0];

  return {
    account: mappedAccount,
    aliases: aliasesResult.rows.map((row) => ({ id: row.id, accountId: row.account_id, alias: row.alias, label: row.label ?? undefined })),
    recentTransactions: recentResult.rows.map(mapTransaction),
    totals: {
      transactionCount: Number(totals?.transaction_count ?? 0),
      income: Number(totals?.income ?? 0),
      expenses: Number(totals?.expenses ?? 0),
      investments: Number(totals?.investments ?? 0),
      internal: Number(totals?.internal ?? 0),
      savings: Number(totals?.savings ?? 0),
      withdrawals: Number(totals?.withdrawals ?? 0),
    },
    balanceSeries,
  };
}

export async function getPotMovementsFromDatabase(potId: string, limit = 80): Promise<PotMovement[]> {
  const result = await query<PotMovementRow>(
    `with selected_pot as (
       select id, account_id, lower(name) as pot_key
       from pots
       where id = $1
     )
     select id, booked_at, payment_account_id, payment_account_name, description, amount, direction
     from (
       select distinct on (t.id)
         t.id,
         to_char(t.booked_at, 'YYYY-MM-DD') as booked_at,
         t.booked_at as booked_at_sort,
         t.created_at,
         t.account_id as payment_account_id,
         a.name as payment_account_name,
         t.description,
         abs(t.amount) as amount,
         case when t.amount < 0 then 'inleg' else 'opname' end as direction
       from selected_pot p
       join transactions savings_transaction
         on savings_transaction.account_id = p.account_id
        and savings_transaction.internal_transfer_group is not null
       join transactions t
         on t.internal_transfer_group = savings_transaction.internal_transfer_group
        and t.id <> savings_transaction.id
        and t.category_id in ('sparen', 'potje-opname', 'ontsparen')
       join accounts a on a.id = t.account_id
       cross join lateral (
         select lower(nullif(trim(regexp_replace(substring(t.description from '(?i)(?:naar|van):\\s*([^"]+)'), '\\s*"+\\s*$', '')), '')) as pot_key
       ) extracted
       where extracted.pot_key = p.pot_key
         or (p.pot_key = 'benzine' and extracted.pot_key = 'bezine')
       order by t.id, t.booked_at desc, t.created_at desc
     ) deduped
     order by booked_at_sort desc, created_at desc
     limit $2`,
    [potId, limit],
  );
  return result.rows.map((row) => ({
    id: row.id,
    date: dateString(row.booked_at) ?? String(row.booked_at).slice(0, 10),
    paymentAccountId: row.payment_account_id,
    paymentAccountName: row.payment_account_name,
    description: row.description,
    amount: Number(row.amount),
    direction: row.direction,
  }));
}

export async function getSavingsAccountFlowFromDatabase(limit = 80): Promise<SavingsAccountFlow> {
  const accountsResult = await query<AccountRow>(
    `select id, name, iban, bank, type, balance, opening_balance,
            to_char(opening_balance_date, 'YYYY-MM-DD') as opening_balance_date,
            to_char(balance_date, 'YYYY-MM-DD') as balance_date,
            balance_checked_at,
            balance_source,
            own_account,
            last_import_at
     from accounts
     where type = 'spaarrekening'
       and archived_at is null
     order by name`,
  );

  const accounts = await Promise.all(accountsResult.rows.map(async (row) => {
    const account = mapAccount(row);
    const [totalsResult, recentResult, monthlyResult] = await Promise.all([
      query<{ total_in: string; total_out: string; net_movement: string; transaction_count: string }>(
        `select
           coalesce(sum(amount) filter (where amount > 0), 0)::text as total_in,
           coalesce(sum(abs(amount)) filter (where amount < 0), 0)::text as total_out,
           coalesce(sum(amount), 0)::text as net_movement,
           count(*)::text as transaction_count
         from transactions
         where account_id = $1`,
        [account.id],
      ),
      query<TransactionRow>(
        `select id, account_id, to_char(booked_at, 'YYYY-MM-DD') as booked_at, counterparty, counter_account, description, amount, category_id, kind, internal_transfer_group, rule_applied
         from transactions
         where account_id = $1
         order by booked_at desc, created_at desc
         limit $2`,
        [account.id, limit],
      ),
      query<{ month: string; total_in: string; total_out: string; net: string }>(
        `select
           to_char(booked_at, 'YYYY-MM') as month,
           coalesce(sum(amount) filter (where amount > 0), 0)::text as total_in,
           coalesce(sum(abs(amount)) filter (where amount < 0), 0)::text as total_out,
           coalesce(sum(amount), 0)::text as net
         from transactions
         where account_id = $1
         group by to_char(booked_at, 'YYYY-MM')
         order by month`,
        [account.id],
      ),
    ]);
    const totals = totalsResult.rows[0];
    const netMovement = Number(totals?.net_movement ?? 0);
    const estimatedOpeningBalance = roundMoney(account.balance - netMovement);
    let runningBalance = estimatedOpeningBalance;
    const monthlyRows = monthlyResult.rows.map((monthRow) => {
      runningBalance = roundMoney(runningBalance + Number(monthRow.net));
      return {
        month: monthRow.month,
        in: Number(monthRow.total_in),
        out: Number(monthRow.total_out),
        net: Number(monthRow.net),
        estimatedBalance: runningBalance,
      };
    });

    return {
      account,
      totalIn: Number(totals?.total_in ?? 0),
      totalOut: Number(totals?.total_out ?? 0),
      netMovement,
      estimatedOpeningBalance,
      transactionCount: Number(totals?.transaction_count ?? 0),
      recentTransactions: recentResult.rows.map(mapTransaction),
      monthlyRows,
    };
  }));

  const [potsResult] = await Promise.all([getPotsFromDatabase()]);

  return {
    totalBalance: roundMoney(accounts.reduce((sum, row) => sum + row.account.balance, 0)),
    totalIn: roundMoney(accounts.reduce((sum, row) => sum + row.totalIn, 0)),
    totalOut: roundMoney(accounts.reduce((sum, row) => sum + row.totalOut, 0)),
    netMovement: roundMoney(accounts.reduce((sum, row) => sum + row.netMovement, 0)),
    pots: potsResult,
    accounts,
  };
}

export async function getBudgetsFromDatabase(month?: string): Promise<Budget[]> {
  const result = await query<BudgetRow>(
    `with selected_month as (
       select coalesce($1::text, (select to_char(max(booked_at), 'YYYY-MM') from transactions), to_char(current_date, 'YYYY-MM')) as month
     ),
     actuals as (
       select
         to_char(t.booked_at, 'YYYY-MM') as month,
         coalesce(t.category_id, 'geen') as category_id,
         sum(abs(t.amount)) as actual_amount
       from transactions t
       join selected_month sm
         on t.booked_at >= (sm.month || '-01')::date
        and t.booked_at < (sm.month || '-01')::date + interval '1 month'
       left join categories c on c.id = t.category_id
       where t.amount < 0
         and t.kind <> 'interne_overboeking'
         and t.category_id is distinct from 'sparen'
         and t.category_id is distinct from 'potje-opname'
         and t.category_id is distinct from 'ontsparen'
         and t.category_id is distinct from 'beleggen'
         and (t.category_id is null or c.kind in ('vaste_last', 'variabele_uitgave', 'reservering'))
       group by to_char(t.booked_at, 'YYYY-MM'), coalesce(t.category_id, 'geen')
     ),
     previous_actuals as (
       select coalesce(t.category_id, 'geen') as category_id, sum(abs(t.amount)) as actual_amount
       from transactions t
       join selected_month sm
         on t.booked_at >= (sm.month || '-01')::date - interval '1 month'
        and t.booked_at < (sm.month || '-01')::date
       left join categories c on c.id = t.category_id
       where t.amount < 0
         and t.kind <> 'interne_overboeking'
         and t.category_id is distinct from 'sparen'
         and t.category_id is distinct from 'potje-opname'
         and t.category_id is distinct from 'ontsparen'
         and t.category_id is distinct from 'beleggen'
         and (t.category_id is null or c.kind in ('vaste_last', 'variabele_uitgave', 'reservering'))
       group by coalesce(t.category_id, 'geen')
     )
     select
       b.id,
       b.month,
       b.category_id,
       b.planned_amount,
       previous.planned_amount as previous_planned_amount,
       pa.actual_amount as previous_actual_amount,
       coalesce(a.actual_amount, 0) as actual_amount,
       b.rollover,
       b.note,
       b.exception_accepted
     from budgets b
     join selected_month sm on sm.month = b.month
     left join actuals a on a.month = b.month and a.category_id = b.category_id
     left join budgets previous
       on previous.month = to_char((sm.month || '-01')::date - interval '1 month', 'YYYY-MM')
      and previous.category_id = b.category_id
      and previous.rollover
     left join previous_actuals pa on pa.category_id = b.category_id
     order by b.planned_amount desc, actual_amount desc, b.category_id`,
    [month ?? null],
  );
  return result.rows.map((row) => {
    const basePlanned = Number(row.planned_amount);
    const carriedAmount = calculateBudgetCarryover(row.previous_planned_amount == null ? undefined : {
      planned: Number(row.previous_planned_amount),
      actual: Number(row.previous_actual_amount ?? 0),
      rollover: true,
    });
    return {
      id: row.id,
      month: row.month,
      categoryId: row.category_id,
      planned: roundMoney(basePlanned + carriedAmount),
      basePlanned,
      carriedAmount,
      actual: Number(row.actual_amount),
      rollover: row.rollover,
      note: row.note ?? undefined,
      exceptionAccepted: row.exception_accepted,
    };
  });
}

export async function getAnnualBudgetsFromDatabase(year: number): Promise<AnnualBudget[]> {
  const result = await query<AnnualBudgetRow>(
    `select ab.id, ab.year, ab.category_id, ab.planned_amount,
            coalesce(sum(abs(t.amount)) filter (
              where t.amount < 0
                and t.kind <> 'interne_overboeking'
                and t.category_id is distinct from 'sparen'
                and t.category_id is distinct from 'potje-opname'
                and t.category_id is distinct from 'ontsparen'
                and t.category_id is distinct from 'beleggen'
            ), 0) as actual_amount
     from annual_budgets ab
     left join transactions t
       on t.category_id = ab.category_id
      and t.booked_at >= make_date(ab.year, 1, 1)
      and t.booked_at < make_date(ab.year + 1, 1, 1)
     where ab.year = $1
     group by ab.id, ab.year, ab.category_id, ab.planned_amount
     order by ab.planned_amount desc, ab.category_id`,
    [year],
  );
  return result.rows.map((row) => ({ id: row.id, year: row.year, categoryId: row.category_id, planned: Number(row.planned_amount), actual: Number(row.actual_amount) }));
}

export async function updateTransactionCategory(transactionId: string, categoryId: string, ruleOptions?: { saveRule?: boolean; rulePattern?: string; ruleScope?: CategorizationRuleScope }) {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("begin");
    const transactionResult = await client.query<TransactionRow>(
      `select id, account_id, booked_at, counterparty, counter_account, description, amount, category_id, kind, internal_transfer_group, rule_applied
       from transactions
       where id = $1`,
      [transactionId],
    );
    const transaction = transactionResult.rows[0];
    if (!transaction) throw new Error("Transactie niet gevonden.");

    const categoryResult = await client.query<CategoryRow>("select id, name, parent, kind, valid_to from categories where id = $1", [categoryId]);
    const category = categoryResult.rows[0];
    if (!category) throw new Error("Categorie niet gevonden.");

    await client.query("update transactions set category_id = $1, kind = $2, rule_applied = $3 where id = $4", [
      category.id,
      category.kind,
      "Handmatig gecorrigeerd",
      transactionId,
    ]);

    const pattern = normalizeRulePattern(ruleOptions?.rulePattern || inferRulePattern(transaction));
    const matchScope = ruleOptions?.ruleScope ?? "all";
    if (ruleOptions?.saveRule && pattern && category.kind !== "interne_overboeking") {
      const ruleId = stableId("rule", `${matchScope}|${pattern}|${category.id}`);
      await client.query(
        `insert into categorization_rules (id, pattern, match_scope, category_id, kind, created_from_transaction_id)
         values ($1, $2, $3, $4, $5, $6)
         on conflict (id) do update set pattern = excluded.pattern, match_scope = excluded.match_scope, category_id = excluded.category_id, kind = excluded.kind, active = true`,
        [ruleId, pattern, matchScope, category.id, category.kind, transactionId],
      );
      await client.query(
        `update transactions
         set category_id = $1, kind = $2, rule_applied = $3
         where ${ruleMatchSql("transactions", "$4", "$5")}
           and kind <> 'interne_overboeking'
           and (
             ($2 = 'inkomen' and amount > 0)
             or ($2 <> 'inkomen' and amount < 0)
           )`,
        [category.id, category.kind, `Regel: ${pattern}`, pattern, matchScope],
      );
    }

    // One confirmed transaction is enough to classify other open transactions with
    // the same unambiguous counter account (or, if absent, counterparty).
    await applyHistoricalCategoryMatches(client);
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function bulkUpdateTransactionCategory(input: { categoryId: string; transactionIds?: string[]; filters?: TransactionSearchFilters }) {
  const categoryResult = await query<CategoryRow>("select id, name, parent, kind, valid_to from categories where id = $1 and valid_to is null", [input.categoryId]);
  const category = categoryResult.rows[0];
  if (!category) throw new Error("Categorie niet gevonden.");

  const transactionIds = [...new Set(input.transactionIds?.filter(Boolean) ?? [])];
  if (transactionIds.length > 0) {
    const result = await query(
      `update transactions
       set category_id = $1,
           kind = $2,
           rule_applied = $3
       where id = any($4)
         and kind <> 'interne_overboeking'`,
      [category.id, category.kind, "Bulk gecorrigeerd", transactionIds],
    );
    return result.rowCount ?? 0;
  }

  if (!input.filters) return 0;

  const where = buildTransactionWhere(input.filters);
  const filterSql = where.sql ? `${where.sql} and t.kind <> 'interne_overboeking'` : "where t.kind <> 'interne_overboeking'";
  const result = await query(
    `with matched as (
       select t.id
       from transactions t
       join accounts a on a.id = t.account_id
       left join categories c on c.id = t.category_id
       ${filterSql}
     )
     update transactions t
     set category_id = $${where.values.length + 1},
         kind = $${where.values.length + 2},
         rule_applied = $${where.values.length + 3}
     from matched
     where t.id = matched.id`,
    [...where.values, category.id, category.kind, "Bulk gecorrigeerd"],
  );
  return result.rowCount ?? 0;
}

export async function getCategorizationRulesFromDatabase(): Promise<CategorizationRule[]> {
  const result = await query<RuleRow>(
    `select
	       r.id,
	       r.pattern,
	       r.match_scope,
	       r.category_id,
       r.kind,
       r.active,
       r.created_at,
       count(t.id) filter (
	         where case r.match_scope
	           when 'counterparty' then lower(coalesce(t.counterparty, '')) like '%' || lower(r.pattern) || '%'
	           when 'description' then lower(coalesce(t.description, '')) like '%' || lower(r.pattern) || '%'
	           when 'counter_account' then lower(coalesce(t.counter_account, '')) like '%' || lower(r.pattern) || '%'
	           when 'counterparty_description' then lower(concat_ws(' ', t.counterparty, t.description)) like '%' || lower(r.pattern) || '%'
	           when 'counterparty_counter_account' then lower(concat_ws(' ', t.counterparty, t.counter_account)) like '%' || lower(r.pattern) || '%'
	           when 'description_counter_account' then lower(concat_ws(' ', t.description, t.counter_account)) like '%' || lower(r.pattern) || '%'
	           else lower(concat_ws(' ', t.counterparty, t.description, t.counter_account)) like '%' || lower(r.pattern) || '%'
	         end
           and t.kind <> 'interne_overboeking'
           and (
             (r.kind = 'inkomen' and t.amount > 0)
             or (r.kind <> 'inkomen' and t.amount < 0)
           )
       ) as match_count
     from categorization_rules r
     left join transactions t on true
	     group by r.id, r.pattern, r.match_scope, r.category_id, r.kind, r.active, r.created_at
     order by r.active desc, r.created_at desc`,
  );
  return result.rows.map(mapCategorizationRule);
}

export async function getCategorizationRulesLightFromDatabase(): Promise<CategorizationRule[]> {
  const result = await query<RuleRow>(
    `select
       id,
       pattern,
       match_scope,
       category_id,
       kind,
       active,
       created_at,
       0::text as match_count
     from categorization_rules
     order by active desc, created_at desc`,
  );
  return result.rows.map(mapCategorizationRule);
}

export async function updateAccountBalance(input: { accountId: string; accountIban: string; balance: number; balanceDate: string }) {
  const result = await query(
    `with checkpoint as (
       select now() as checked_at
     ), updated as (
       update accounts
       set balance = $1,
           manual_balance = $1,
           balance_date = $2::date,
           balance_checked_at = checkpoint.checked_at,
           balance_source = 'manual',
           opening_balance = $1 - coalesce((
             select sum(amount)
             from transactions
             where account_id = accounts.id
               and (booked_at < $2::date or (booked_at = $2::date and created_at <= checkpoint.checked_at))
           ), 0),
           opening_balance_date = $2::date
       from checkpoint
       where id = $3 and iban = $4
       returning accounts.id, checkpoint.checked_at
     )
     insert into account_balance_observations (id, account_id, observed_on, observed_at, balance, source)
     select 'balance_' || md5(id || '|' || $2 || '|manual'), id, $2::date, checked_at, $1, 'manual'
     from updated
     on conflict (account_id, observed_on, source)
     do update set balance = excluded.balance, observed_at = excluded.observed_at`,
    [input.balance, input.balanceDate, input.accountId, input.accountIban],
  );
  if (result.rowCount !== 1) throw new Error("Rekening niet gevonden of IBAN komt niet overeen.");
}

export async function updateAccountDetails(input: { accountId: string; accountIban: string; name: string; type: Account["type"]; ownAccount: boolean }) {
  const result = await query(
    `update accounts
     set name = $1,
         type = $2,
         own_account = $3
     where id = $4
       and iban = $5`,
    [input.name, input.type, input.ownAccount, input.accountId, input.accountIban],
  );
  if (result.rowCount !== 1) throw new Error("Rekening niet gevonden of IBAN komt niet overeen.");
}

export async function createAccountRecord(input: {
  iban: string;
  name: string;
  bank: string;
  type: Account["type"];
  balance: number;
  balanceDate: string;
  ownAccount: boolean;
}) {
  const iban = normalizeAccountIban(input.iban);
  const result = await query<{ id: string }>(
    `insert into accounts (id, name, iban, bank, type, balance, manual_balance, balance_date, balance_checked_at, balance_source, own_account, last_import_at)
     values ($1, $2, $3, $4, $5, $6, $6, $7, now(), 'manual', $8, now())
     on conflict (iban) do update
     set name = excluded.name,
         bank = excluded.bank,
         type = excluded.type,
         balance = excluded.balance,
         manual_balance = excluded.manual_balance,
         balance_date = excluded.balance_date,
         balance_checked_at = excluded.balance_checked_at,
         balance_source = 'manual',
         own_account = excluded.own_account,
         archived_at = null
     returning id`,
    [stableId("acct", iban.replace(/\s/g, "")), input.name, iban, input.bank, input.type, input.balance, input.balanceDate, input.ownAccount],
  );
  const accountId = result.rows[0].id;
  await query(
    `insert into account_balance_observations (id, account_id, observed_on, balance, source)
     values ('balance_' || md5($1 || '|' || $2 || '|manual'), $1, $2::date, $3, 'manual')
     on conflict (account_id, observed_on, source)
     do update set balance = excluded.balance, observed_at = now()`,
    [accountId, input.balanceDate, input.balance],
  );
  const alias = normalizeAccountAlias(iban);
  if (alias) {
    await query(
      `insert into account_aliases (id, account_id, alias, label)
       values ($1, $2, $3, $4)
       on conflict (alias) do update
       set account_id = excluded.account_id,
           label = excluded.label`,
      [stableId("alias", alias), accountId, alias, "IBAN"],
    );
  }
  return accountId;
}

export async function upsertBudget(input: { month: string; categoryId: string; planned: number; rollover: boolean; note?: string | null; exceptionAccepted?: boolean; metadataProvided?: boolean }) {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query("delete from hidden_budget_items where month = $1 and category_id = $2", [input.month, input.categoryId]);
    await client.query(
      `insert into budgets (id, month, category_id, planned_amount, rollover, note, exception_accepted)
       values ($1, $2, $3, $4, $5, $6, $7)
       on conflict (month, category_id)
       do update set planned_amount = excluded.planned_amount,
                     rollover = excluded.rollover,
                     note = case when $8 then excluded.note else budgets.note end,
                     exception_accepted = case when $8 then excluded.exception_accepted else budgets.exception_accepted end`,
      [stableId("budget", `${input.month}|${input.categoryId}`), input.month, input.categoryId, input.planned, input.rollover, input.note || null, input.exceptionAccepted ?? false, input.metadataProvided ?? false],
    );
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function upsertAnnualBudget(input: { year: number; categoryId: string; planned: number }) {
  await query(
    `insert into annual_budgets (id, year, category_id, planned_amount)
     values ($1, $2, $3, $4)
     on conflict (year, category_id)
     do update set planned_amount = excluded.planned_amount, updated_at = now()`,
    [stableId("annual_budget", `${input.year}|${input.categoryId}`), input.year, input.categoryId, input.planned],
  );
}

export async function deleteAnnualBudgetRecord(input: { year: number; categoryId: string }) {
  await query("delete from annual_budgets where year = $1 and category_id = $2", [input.year, input.categoryId]);
}

export async function upsertBudgetPlan(inputs: Array<{ month: string; categoryId: string; planned: number; rollover: boolean }>) {
  if (!inputs.length) return 0;
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("begin");
    for (const input of inputs) {
      await client.query("delete from hidden_budget_items where month = $1 and category_id = $2", [input.month, input.categoryId]);
      await client.query(
        `insert into budgets (id, month, category_id, planned_amount, rollover)
         values ($1, $2, $3, $4, $5)
         on conflict (month, category_id)
         do update set planned_amount = excluded.planned_amount, rollover = excluded.rollover`,
        [stableId("budget", `${input.month}|${input.categoryId}`), input.month, input.categoryId, input.planned, input.rollover],
      );
    }
    await client.query("commit");
    return inputs.length;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteBudgetRecord(input: { month: string; categoryId: string }) {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query("delete from budgets where month = $1 and category_id = $2", [input.month, input.categoryId]);
    await client.query(
      `insert into hidden_budget_items (month, category_id)
       values ($1, $2)
       on conflict (month, category_id) do update set created_at = now()`,
      [input.month, input.categoryId],
    );
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function copyBudgetPlan(input: { sourceMonth: string; targetMonth: string }) {
  const result = await query<{ category_id: string }>(
    `insert into budgets (id, month, category_id, planned_amount, actual_amount, rollover)
     select
       'budget_' || md5($2 || '|' || category_id),
       $2,
       category_id,
       planned_amount,
       0,
       rollover
     from budgets
     join categories on categories.id = budgets.category_id
     where budgets.month = $1
       and planned_amount > 0
       and categories.valid_to is null
     on conflict (month, category_id)
     do update set planned_amount = excluded.planned_amount,
                   rollover = excluded.rollover
     where budgets.planned_amount is distinct from excluded.planned_amount
        or budgets.rollover is distinct from excluded.rollover
     returning category_id`,
    [input.sourceMonth, input.targetMonth],
  );

  return { copied: result.rowCount ?? 0 };
}

export async function upsertPot(input: { id?: string; accountId?: string; name: string; targetAmount?: number; currentAmount?: number; targetDate?: string; monthlyReservation?: number }) {
  const id = input.id || stableId("pot", `${input.accountId ?? "no-account"}|${input.name.toLowerCase()}`);
  await query(
    `insert into pots (id, account_id, name, target_amount, current_amount, target_date, monthly_reservation)
     values ($1, $2, $3, $4, $5, $6, $7)
     on conflict (id)
     do update set account_id = excluded.account_id, name = excluded.name, target_amount = excluded.target_amount, current_amount = excluded.current_amount, target_date = excluded.target_date, monthly_reservation = excluded.monthly_reservation`,
    [id, input.accountId ?? null, input.name, input.targetAmount ?? null, input.currentAmount ?? null, input.targetDate || null, input.monthlyReservation ?? null],
  );
}

export async function deletePotRecord(potId: string) {
  await query("delete from pots where id = $1", [potId]);
}

export async function upsertFixedExpense(input: { id?: string; supplier: string; categoryId: string; amount: number; frequency: FixedExpense["frequency"]; previousAmount?: number; nextDueOn?: string }) {
  const id = input.id || stableId("fixed", input.supplier.toLowerCase());
  await query(
    `insert into fixed_expenses (id, supplier, category_id, amount, previous_amount, frequency, valid_from, next_due_on)
     values ($1, $2, $3, $4, $5, $6, current_date, $7)
     on conflict (id)
     do update set supplier = excluded.supplier, category_id = excluded.category_id, previous_amount = fixed_expenses.amount, amount = excluded.amount, frequency = excluded.frequency, next_due_on = excluded.next_due_on, valid_to = null`,
    [id, input.supplier, input.categoryId, input.amount, input.previousAmount ?? null, input.frequency, input.nextDueOn || null],
  );
}

export async function upsertRecurringIncome(input: { id?: string; label: string; amount: number; frequency: RecurringIncome["frequency"]; nextExpectedOn: string }) {
  const id = input.id || stableId("income", input.label.toLowerCase());
  await query(
    `insert into recurring_incomes (id, label, amount, frequency, next_expected_on)
     values ($1, $2, $3, $4, $5::date)
     on conflict (id)
     do update set label = excluded.label,
                   amount = excluded.amount,
                   frequency = excluded.frequency,
                   next_expected_on = excluded.next_expected_on,
                   valid_to = null,
                   updated_at = now()`,
    [id, input.label, input.amount, input.frequency, input.nextExpectedOn],
  );
}

export async function archiveRecurringIncome(recurringIncomeId: string) {
  await query("update recurring_incomes set valid_to = current_date, updated_at = now() where id = $1", [recurringIncomeId]);
}

export async function classifyFixedExpenseTransactions(input: { supplier: string; categoryId: string }) {
  const categoryResult = await query<CategoryRow>("select id, name, parent, kind, valid_to from categories where id = $1", [input.categoryId]);
  const category = categoryResult.rows[0];
  if (!category || category.valid_to) return 0;

  const ruleId = stableId("rule", `${input.supplier}|${category.id}`);
  await query(
    `insert into categorization_rules (id, pattern, category_id, kind, active)
     values ($1, $2, $3, $4, true)
     on conflict (id) do update set pattern = excluded.pattern, category_id = excluded.category_id, kind = excluded.kind, active = true`,
    [ruleId, input.supplier, category.id, category.kind],
  );

  const result = await query(
    `update transactions
     set category_id = $1,
         kind = $2,
         rule_applied = $3
     where amount < 0
       and kind <> 'interne_overboeking'
       and regexp_replace(regexp_replace(lower(coalesce(counterparty, '')), '[^a-z0-9]+', '', 'g'), '(nederland)?(bv|nv)$', '')
         = regexp_replace(regexp_replace(lower($4), '[^a-z0-9]+', '', 'g'), '(nederland)?(bv|nv)$', '')`,
    [category.id, category.kind, `Vaste last: ${input.supplier}`, input.supplier],
  );
  return result.rowCount ?? 0;
}

export async function archiveFixedExpense(fixedExpenseId: string) {
  await query("update fixed_expenses set valid_to = current_date where id = $1", [fixedExpenseId]);
}

export async function getPotsFromDatabase(): Promise<SavingsPot[]> {
  const result = await query<PotRow>(
    `with pot_movements as (
       select
         savings_account.id as account_id,
         case
           when extracted.pot_key = 'bezine' then 'benzine'
           else extracted.pot_key
         end as pot_key,
         count(*)::int as movement_count,
         coalesce(sum(
           case
             when t.amount < 0 then abs(t.amount)
             when t.amount > 0 then -abs(t.amount)
             else 0
           end
         ), 0) as movement_balance,
         min(t.booked_at) as first_movement_at,
         max(t.booked_at) as last_movement_at
       from transactions t
       join accounts payment_account
         on payment_account.id = t.account_id
        and payment_account.type = 'betaalrekening'
       join transactions savings_transaction
         on savings_transaction.internal_transfer_group = t.internal_transfer_group
        and savings_transaction.id <> t.id
       join accounts savings_account
         on savings_account.id = savings_transaction.account_id
        and savings_account.type = 'spaarrekening'
        and savings_account.archived_at is null
       cross join lateral (
         select lower(nullif(trim(regexp_replace(substring(t.description from '(?i)(?:naar|van):\\s*([^"]+)'), '\\s*"+\\s*$', '')), '')) as pot_key
       ) extracted
       where t.category_id in ('sparen', 'potje-opname', 'ontsparen')
         and t.internal_transfer_group is not null
         and extracted.pot_key is not null
       group by savings_account.id, case when extracted.pot_key = 'bezine' then 'benzine' else extracted.pot_key end
     )
     select
       p.id,
       p.account_id,
       p.name,
       p.target_amount,
       p.current_amount,
       p.target_date,
       p.monthly_reservation,
       coalesce(m.movement_count, 0) as movement_count,
       coalesce(m.movement_balance, 0)::text as movement_balance,
       to_char(m.first_movement_at, 'YYYY-MM-DD') as first_movement_at,
       to_char(m.last_movement_at, 'YYYY-MM-DD') as last_movement_at
     from pots p
     left join pot_movements m
       on m.account_id = p.account_id
      and m.pot_key = lower(p.name)
     order by p.account_id nulls last, p.name`,
  );
  return result.rows.map(mapPot);
}

export async function getAccountAliasesFromDatabase(): Promise<AccountAlias[]> {
  const result = await query<AccountAliasRow>("select id, account_id, alias, label from account_aliases order by account_id, alias");
  return result.rows.map((row) => ({ id: row.id, accountId: row.account_id, alias: row.alias, label: row.label ?? undefined }));
}

export async function getMonthClosureFromDatabase(month: string): Promise<MonthClosure> {
  const result = await query<{ month: string; closed_at: string | null; note: string | null; updated_at: string }>(
    `select month,
            to_char(closed_at, 'YYYY-MM-DD"T"HH24:MI:SSOF') as closed_at,
            note,
            to_char(updated_at, 'YYYY-MM-DD"T"HH24:MI:SSOF') as updated_at
     from month_closures
     where month = $1`,
    [month],
  );
  const row = result.rows[0];
  return {
    month,
    closedAt: row?.closed_at ?? undefined,
    note: row?.note ?? undefined,
    updatedAt: row?.updated_at ?? new Date().toISOString(),
  };
}

export async function upsertMonthClosure(input: { month: string; closed: boolean; note?: string }) {
  await query(
    `insert into month_closures (month, closed_at, note, updated_at)
     values ($1, case when $2::boolean then now() else null end, nullif($3, ''), now())
     on conflict (month) do update set
       closed_at = case when excluded.closed_at is null then null else coalesce(month_closures.closed_at, excluded.closed_at) end,
       note = excluded.note,
       updated_at = now()`,
    [input.month, input.closed, input.note ?? ""],
  );
}

export async function addAccountAlias(input: { accountId: string; alias: string; label?: string }) {
  const alias = normalizeAccountAlias(input.alias);
  if (!alias) throw new Error("Alias is leeg.");
  await query(
    `insert into account_aliases (id, account_id, alias, label)
     values ($1, $2, $3, $4)
     on conflict (alias) do update
     set account_id = excluded.account_id,
         label = excluded.label`,
    [stableId("alias", alias), input.accountId, alias, input.label ?? null],
  );
}

export async function toggleAccountImportExclusion(accountId: string): Promise<AccountImportExclusionResult | undefined> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("begin");

    const accountResult = await client.query<{ id: string; excluded_from_import: boolean }>(
      `update accounts
       set excluded_from_import = not excluded_from_import,
           last_import_at = case when not excluded_from_import then null else last_import_at end
       where id = $1
         and archived_at is null
       returning id, excluded_from_import`,
      [accountId],
    );
    const account = accountResult.rows[0];
    if (!account) {
      await client.query("rollback");
      return undefined;
    }

    let deletedTransactions = 0;
    if (account.excluded_from_import) {
      const transferGroupsResult = await client.query<{ internal_transfer_group: string }>(
        `select distinct internal_transfer_group
         from transactions
         where account_id = $1
           and import_id is not null
           and internal_transfer_group is not null`,
        [accountId],
      );
      const transferGroups = transferGroupsResult.rows.map((row) => row.internal_transfer_group);
      const relatedAccountIds = transferGroups.length
        ? (
            await client.query<{ account_id: string }>(
              `select distinct account_id
               from transactions
               where internal_transfer_group = any($1::text[])
                 and account_id <> $2`,
              [transferGroups, accountId],
            )
          ).rows.map((row) => row.account_id)
        : [];

      await client.query(
        `update categorization_rules
         set created_from_transaction_id = null
         where created_from_transaction_id in (
           select id
           from transactions
           where account_id = $1
             and import_id is not null
         )`,
        [accountId],
      );

      const deleted = await client.query<{ id: string }>(
        `delete from transactions
         where account_id = $1
           and import_id is not null
         returning id`,
        [accountId],
      );
      deletedTransactions = deleted.rowCount ?? 0;

      await resetOrphanedInternalTransfers(client);
      await reconcileInternalTransfers(client);
      await resetOrphanedInternalTransfers(client);
      await reclassifyUnbalancedInternalBankCosts(client);
      await applyActiveRules(client);
      await syncSavingsPotsFromTransactionsWithClient(client);
      await refreshImportAccountBalances(client, [accountId, ...relatedAccountIds]);
      await refreshManualAccountBalances(client);
    }

    await client.query("commit");
    return { excluded: account.excluded_from_import, deletedTransactions };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function mergeAccountRecords(input: { sourceAccountId: string; targetAccountId: string }) {
  if (input.sourceAccountId === input.targetAccountId) return 0;
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("begin");
    const transactionResult = await client.query(
      "update transactions set account_id = $1 where account_id = $2",
      [input.targetAccountId, input.sourceAccountId],
    );
    await client.query("update account_aliases set account_id = $1 where account_id = $2", [input.targetAccountId, input.sourceAccountId]);
    await client.query("update accounts set archived_at = now() where id = $1", [input.sourceAccountId]);
    await client.query("commit");
    return transactionResult.rowCount ?? 0;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function syncSavingsPotsFromTransactions() {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("begin");
    const synced = await syncSavingsPotsFromTransactionsWithClient(client);
    await client.query("commit");
    return synced;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

async function syncSavingsPotsFromTransactionsWithClient(client: PoolClient) {
  const result = await client.query<{ synced: number }>(
    `with pot_transactions as (
       select
         savings_account.id as account_id,
         case
           when lower(extracted.pot_name) = 'bezine' then 'Benzine'
           when lower(extracted.pot_name) = 'vrij spaargeld' then 'Vrij Spaargeld'
           when lower(extracted.pot_name) = 'weekgeld per maand' then 'Weekgeld per Maand'
           else extracted.pot_name
         end as pot_name,
         to_char(t.booked_at, 'YYYY-MM') as month,
         case
           when t.amount < 0 then abs(t.amount)
           when t.amount > 0 then -abs(t.amount)
           else 0
         end as movement
       from transactions t
       join accounts a on a.id = t.account_id
       join transactions savings_transaction
         on savings_transaction.internal_transfer_group = t.internal_transfer_group
        and savings_transaction.id <> t.id
       join accounts savings_account
         on savings_account.id = savings_transaction.account_id
        and savings_account.type = 'spaarrekening'
        and savings_account.archived_at is null
       cross join lateral (
         select nullif(trim(regexp_replace(substring(t.description from '(?i)(?:naar|van):\\s*([^"]+)'), '\\s*"+\\s*$', '')), '') as pot_name
       ) extracted
       where a.type = 'betaalrekening'
         and t.category_id in ('sparen', 'potje-opname', 'ontsparen')
         and t.internal_transfer_group is not null
         and extracted.pot_name is not null
         and length(extracted.pot_name) between 2 and 80
     ),
     pot_totals as (
       select
         account_id,
         min(pot_name) as pot_name,
         sum(movement) as current_amount,
         avg(nullif(monthly_in, 0)) as monthly_reservation
       from (
         select
           account_id,
           pot_name,
           lower(pot_name) as pot_key,
           month,
           sum(movement) as movement,
           sum(movement) filter (where movement > 0) as monthly_in
         from pot_transactions
         group by account_id, lower(pot_name), pot_name, month
       ) monthly
       group by account_id, pot_key
     ),
     existing_pots as (
      select distinct on (account_id, lower(name))
         id,
         account_id,
         lower(name) as pot_key
       from pots
       where account_id is not null
       order by account_id, lower(name), current_amount desc nulls last, created_at asc
     ),
     upserted as (
       insert into pots (id, account_id, name, target_amount, current_amount, target_date, monthly_reservation)
       select
         coalesce(existing_pots.id, 'pot_' || substr(md5(pot_totals.account_id || '|' || lower(pot_totals.pot_name)), 1, 24)),
         pot_totals.account_id,
         pot_totals.pot_name,
         null,
         null,
         null,
         null
       from pot_totals
       left join existing_pots
         on existing_pots.account_id = pot_totals.account_id
        and existing_pots.pot_key = lower(pot_totals.pot_name)
       where pot_totals.pot_name <> ''
       on conflict (id) do update
       set account_id = excluded.account_id,
           name = excluded.name
       returning id
     )
     select count(*)::int as synced from upserted`,
  );
  await deduplicateSavingsPots(client);
  return Number(result.rows[0]?.synced ?? 0);
}

async function deduplicateSavingsPots(client: PoolClient) {
  await client.query(
    `with ranked as (
       select
         id,
         first_value(id) over (
           partition by account_id, lower(name)
           order by current_amount desc nulls last, monthly_reservation desc nulls last, created_at asc, id asc
         ) as keep_id
       from pots
       where account_id is not null
     ),
     aggregated as (
       select
         keep_id as id,
         max(target_amount) filter (where target_amount is not null) as target_amount,
         max(current_amount) filter (where current_amount is not null) as current_amount,
         max(monthly_reservation) filter (where monthly_reservation is not null) as monthly_reservation,
         min(target_date) filter (where target_date is not null) as target_date
       from ranked
       join pots on pots.id = ranked.id
       group by keep_id
     )
     update pots
     set target_amount = coalesce(greatest(pots.target_amount, aggregated.target_amount), pots.target_amount, aggregated.target_amount),
         current_amount = coalesce(greatest(pots.current_amount, aggregated.current_amount), pots.current_amount, aggregated.current_amount),
         monthly_reservation = coalesce(greatest(pots.monthly_reservation, aggregated.monthly_reservation), pots.monthly_reservation, aggregated.monthly_reservation),
         target_date = coalesce(pots.target_date, aggregated.target_date)
     from aggregated
     where pots.id = aggregated.id`,
  );

  await client.query(
    `with ranked as (
       select
         id,
         first_value(id) over (
           partition by account_id, lower(name)
           order by current_amount desc nulls last, monthly_reservation desc nulls last, created_at asc, id asc
         ) as keep_id
       from pots
       where account_id is not null
     )
     delete from pots
     using ranked
     where pots.id = ranked.id
       and ranked.id <> ranked.keep_id`,
  );
}

export async function getFixedExpensesFromDatabase(): Promise<FixedExpense[]> {
  const result = await query<FixedExpenseRow>(
    `select
       f.id,
       f.supplier,
       f.category_id,
       f.amount,
       f.previous_amount,
       f.frequency,
       to_char(f.next_due_on, 'YYYY-MM-DD') as next_due_on,
       array(
         select to_char(t.booked_at, 'YYYY-MM-DD')
         from transactions t
         where t.amount < 0
           and t.kind <> 'interne_overboeking'
           and regexp_replace(regexp_replace(lower(coalesce(t.counterparty, '')), '[^a-z0-9]+', '', 'g'), '(nederland)?(bv|nv)$', '')
             = regexp_replace(regexp_replace(lower(f.supplier), '[^a-z0-9]+', '', 'g'), '(nederland)?(bv|nv)$', '')
           and t.booked_at <= current_date
         order by t.booked_at desc, t.created_at desc
         limit 6
       ) as booked_dates
     from fixed_expenses f
     where f.valid_to is null
     order by f.supplier`,
  );
  const asOf = amsterdamDateString();
  return result.rows.map((row) => {
    const estimate = estimateFixedExpenseDate(row.booked_dates, row.frequency, asOf, row.supplier);
    return {
      id: row.id,
      supplier: row.supplier,
      categoryId: row.category_id,
      amount: Number(row.amount),
      previousAmount: row.previous_amount == null ? undefined : Number(row.previous_amount),
      frequency: row.frequency,
      nextDueOn: row.next_due_on ?? undefined,
      estimatedNextDueOn: estimate?.date,
      dueDateConfidence: estimate?.confidence,
      dueDateEvidenceCount: estimate?.evidenceCount,
      dueDateWeekendAdjusted: estimate?.weekendAdjusted,
      dueDateReason: estimate?.reason,
      manualDueDateExpired: row.next_due_on != null && row.next_due_on < asOf,
    };
  });
}

export async function getRecurringIncomesFromDatabase(): Promise<RecurringIncome[]> {
  const result = await query<RecurringIncomeRow>(
    `select id, label, amount::text, frequency, to_char(next_expected_on, 'YYYY-MM-DD') as next_expected_on
     from recurring_incomes
     where valid_to is null
     order by next_expected_on, label`,
  );
  return result.rows.map((row) => ({
    id: row.id,
    label: row.label,
    amount: Number(row.amount),
    frequency: row.frequency,
    nextExpectedOn: row.next_expected_on,
  }));
}

export async function getPlannedCashEventsFromDatabase(): Promise<PlannedCashEvent[]> {
  const result = await query<{ id: string; label: string; amount: string; direction: "income" | "expense"; due_on: string; account_id: string | null; account_name: string | null }>(
    `select p.id, p.label, p.amount::text, p.direction, to_char(p.due_on, 'YYYY-MM-DD') as due_on,
            p.account_id, a.name as account_name
     from planned_cash_events p
     left join accounts a on a.id = p.account_id
     where p.due_on >= current_date
     order by p.due_on, p.label`,
  );
  return result.rows.map((row) => ({ id: row.id, label: row.label, amount: Number(row.amount), direction: row.direction, dueOn: row.due_on, accountId: row.account_id ?? undefined, accountLabel: row.account_name ?? "Rekening nog niet bepaald" }));
}

export async function savePlannedCashEvent(input: { id?: string; label: string; amount: number; direction: "income" | "expense"; dueOn: string; accountId?: string }) {
  const id = input.id ?? stableId("planned_event", `${input.label}|${input.dueOn}|${Date.now()}`);
  await query(
    `insert into planned_cash_events (id, label, amount, direction, due_on, account_id)
     values ($1, $2, $3, $4, $5::date, $6)
     on conflict (id) do update set label = excluded.label, amount = excluded.amount, direction = excluded.direction,
       due_on = excluded.due_on, account_id = excluded.account_id, updated_at = now()`,
    [id, input.label, input.amount, input.direction, input.dueOn, input.accountId ?? null],
  );
  return id;
}

export async function deletePlannedCashEvent(id: string) {
  await query("delete from planned_cash_events where id = $1", [id]);
}

export async function getForecastEventSkipKeysFromDatabase(): Promise<Set<string>> {
  const result = await query<{ event_key: string }>("select event_key from forecast_event_skips where occurrence_date >= current_date - interval '1 day'");
  return new Set(result.rows.map((row) => row.event_key));
}

export async function getForecastEventSkipsFromDatabase() {
  const result = await query<{ id: string; event_key: string; label: string; occurrence_date: string }>(
    `select id, event_key, label, to_char(occurrence_date, 'YYYY-MM-DD') as occurrence_date
     from forecast_event_skips
     where occurrence_date >= current_date - interval '1 day'
     order by occurrence_date, label`,
  );
  return result.rows.map((row) => ({ id: row.id, eventKey: row.event_key, label: row.label, occurrenceDate: row.occurrence_date }));
}

export async function skipForecastEvent(input: { eventKey: string; label: string; occurrenceDate: string }) {
  await query(
    `insert into forecast_event_skips (id, event_key, label, occurrence_date)
     values ($1, $2, $3, $4::date)
     on conflict (event_key) do update set label = excluded.label`,
    [stableId("forecast_skip", input.eventKey), input.eventKey, input.label, input.occurrenceDate],
  );
}

export async function restoreForecastEvent(eventKey: string) {
  await query("delete from forecast_event_skips where event_key = $1", [eventKey]);
}

export async function getForecastSourceAccountsFromDatabase() {
  const result = await query<{ source_key: string; account_id: string; account_name: string }>(
    `with ranked as (
       select regexp_replace(regexp_replace(lower(coalesce(nullif(t.counterparty, ''), nullif(t.description, ''))), '[^a-z0-9]+', '', 'g'), '(nederland)?(bv|nv)$', '') as source_key,
              a.id as account_id, a.name as account_name,
              row_number() over (partition by regexp_replace(regexp_replace(lower(coalesce(nullif(t.counterparty, ''), nullif(t.description, ''))), '[^a-z0-9]+', '', 'g'), '(nederland)?(bv|nv)$', '') order by t.booked_at desc, t.created_at desc) as rank
       from transactions t
       join accounts a on a.id = t.account_id
       where t.kind <> 'interne_overboeking'
     )
     select source_key, account_id, account_name from ranked where rank = 1`,
  );
  return new Map(result.rows.map((row) => [row.source_key, { accountId: row.account_id, accountLabel: row.account_name }]));
}

export async function getInferredRecurringIncomeCandidatesFromDatabase(): Promise<IncomeForecastSource[]> {
  const [historyResult, managedResult, ignoredResult] = await Promise.all([
    query<{ id: string; label: string; amount: string; booked_on: string; category_id: string | null }>(
      `select t.id,
              coalesce(nullif(t.counterparty, ''), nullif(t.description, ''), 'Inkomen') as label,
              t.amount::text,
              to_char(t.booked_at, 'YYYY-MM-DD') as booked_on,
              t.category_id
       from transactions t
       where t.amount > 0
         and t.kind = 'inkomen'
         and t.category_id = any($1::text[])
         and t.internal_transfer_group is null
         and t.booked_at >= current_date - interval '40 months'
       order by t.booked_at desc
       limit 160`,
      [STRUCTURAL_INCOME_CATEGORY_IDS],
    ),
    query<{ label: string }>("select label from recurring_incomes where valid_to is null"),
    query<{ suggestion_key: string }>("select suggestion_key from ignored_suggestions where suggestion_type = 'income_candidate'"),
  ]);
  const managed = new Set(managedResult.rows.map((row) => normalizedSupplierKey(row.label)));
  const ignored = new Set(ignoredResult.rows.map((row) => row.suggestion_key));
  return inferRecurringIncomes(historyResult.rows, amsterdamDateString())
    .filter((candidate) => !managed.has(normalizedSupplierKey(candidate.label)) && !ignored.has(candidate.candidateId));
}

export async function ignoreRecurringIncomeCandidate(input: { candidateId: string; label: string }) {
  await query(
    `insert into ignored_suggestions (id, suggestion_type, suggestion_key, label)
     values ($1, 'income_candidate', $2, $3)
     on conflict (suggestion_type, suggestion_key)
     do update set label = excluded.label, created_at = now()`,
    [stableId("ignored", `income_candidate|${input.candidateId}`), input.candidateId, input.label],
  );
}

export async function getFixedExpenseCandidatesFromDatabase(): Promise<FixedExpenseCandidate[]> {
  const result = await query<FixedExpenseCandidateRow>(
    `with normalized as (
       select
         coalesce(nullif(t.counterparty, ''), 'Onbekend') as supplier,
         regexp_replace(regexp_replace(lower(coalesce(nullif(t.counterparty, ''), 'Onbekend')), '[^a-z0-9]+', '', 'g'), '(nederland)?(bv|nv)$', '') as supplier_key,
         t.category_id,
         c.name as category_name,
         c.kind as category_kind,
         t.amount,
         t.booked_at,
         t.created_at,
         t.description
       from transactions t
       join categories c on c.id = t.category_id
       where t.amount < 0
         and t.kind <> 'interne_overboeking'
     ),
     recurring as (
       select
         (array_agg(n.supplier order by n.booked_at desc, n.created_at desc))[1] as supplier,
         n.supplier_key,
         (array_agg(n.category_id order by n.booked_at desc, n.created_at desc))[1] as category_id,
         (array_agg(n.category_name order by n.booked_at desc, n.created_at desc))[1] as category_name,
         (array_agg(n.category_kind order by n.booked_at desc, n.created_at desc))[1] as category_kind,
         count(*)::int as transaction_count,
         count(distinct to_char(n.booked_at, 'YYYY-MM'))::int as months_seen,
         min(abs(n.amount)) as min_amount,
         max(abs(n.amount)) as max_amount,
         avg(abs(n.amount)) as avg_amount,
         to_char(min(n.booked_at), 'YYYY-MM-DD') as first_seen,
         to_char(max(n.booked_at), 'YYYY-MM-DD') as last_seen,
         array_agg(abs(n.amount) order by n.booked_at desc, n.created_at desc) as amounts,
         array_agg(to_char(n.booked_at, 'YYYY-MM-DD') order by n.booked_at, n.created_at) as booked_dates,
         bool_or(lower(coalesce(n.description, '') || ' ' || coalesce(n.supplier, '')) ~ '(incasso|premie|abonnement|termijn|voorschot|pakket|verzekering|contributie|energie|water|mobiel|internet)') as has_fixed_pattern
       from normalized n
       group by n.supplier_key
     ),
     scored as (
       select
         r.*,
         case
           when r.min_amount = 0 then 999
           else r.max_amount / r.min_amount
         end as amount_spread,
         exists (
           select 1
           from fixed_expenses f
           where f.valid_to is null
             and regexp_replace(regexp_replace(lower(f.supplier), '[^a-z0-9]+', '', 'g'), '(nederland)?(bv|nv)$', '') = r.supplier_key
         ) as already_managed
       from recurring r
       where r.months_seen >= 3
     )
     select
       'candidate_' || substr(md5(supplier_key || '|' || category_id), 1, 24) as id,
       supplier,
       category_id,
       category_name,
       case
         when months_seen >= 5 then 'maandelijks'
         when months_seen >= 3 then 'kwartaal'
         else 'maandelijks'
       end as frequency,
       round(avg_amount, 2) as amount,
       case when array_length(amounts, 1) > 1 then amounts[2] else null end as previous_amount,
       transaction_count,
       months_seen,
       booked_dates,
       first_seen,
       last_seen,
       case
         when category_kind = 'vaste_last' and amount_spread <= 1.15 then 95
         when category_kind = 'vaste_last' then 82
         when has_fixed_pattern and amount_spread <= 1.15 then 85
         when has_fixed_pattern then 72
         when amount_spread <= 1.05 and months_seen >= 5 then 70
         else 45
       end as confidence,
       case
         when category_kind = 'vaste_last' and amount_spread <= 1.15 then 'Vaste-lastcategorie en stabiel bedrag'
         when category_kind = 'vaste_last' then 'Vaste-lastcategorie met wisselend bedrag'
         when has_fixed_pattern and amount_spread <= 1.15 then 'Terugkerende omschrijving en stabiel bedrag'
         when has_fixed_pattern then 'Terugkerende omschrijving'
         when amount_spread <= 1.05 and months_seen >= 5 then 'Stabiel maandelijks patroon'
         else 'Terugkerende betaling, controle nodig'
       end as reason,
       already_managed
     from scored
     where (
       category_kind = 'vaste_last'
       or has_fixed_pattern
       or (amount_spread <= 1.05 and months_seen >= 5)
     )
       and not exists (
         select 1
         from ignored_suggestions ignored
         where ignored.suggestion_type = 'fixed_expense_candidate'
           and ignored.suggestion_key = 'candidate_' || substr(md5(supplier_key || '|' || category_id), 1, 24)
       )
     order by already_managed, confidence desc, amount desc
     limit 80`,
  );

  return annotateFixedExpenseCandidateDuplicates(result.rows.map((row) => {
    const detectedFrequency = detectRecurringFrequency(row.booked_dates);
    return {
      id: row.id,
      supplier: row.supplier,
      categoryId: row.category_id,
      categoryName: row.category_name,
      frequency: detectedFrequency ?? row.frequency,
      amount: Number(row.amount),
      previousAmount: row.previous_amount == null ? undefined : Number(row.previous_amount),
      transactionCount: row.transaction_count,
      monthsSeen: row.months_seen,
      firstSeen: dateString(row.first_seen) ?? "",
      lastSeen: dateString(row.last_seen) ?? "",
      confidence: detectedFrequency === "vierwekelijks" ? Math.max(row.confidence, 90) : row.confidence,
      reason: detectedFrequency === "vierwekelijks" ? "Vierwekelijks patroon van 26–30 dagen" : row.reason,
      alreadyManaged: row.already_managed,
    };
  }));
}

export async function ignoreFixedExpenseCandidate(input: { candidateId: string; supplier: string; reason?: string }) {
  await query(
    `insert into ignored_suggestions (id, suggestion_type, suggestion_key, label, reason)
     values ($1, 'fixed_expense_candidate', $2, $3, $4)
     on conflict (suggestion_type, suggestion_key)
     do update set label = excluded.label,
                   reason = excluded.reason,
                   created_at = now()`,
    [stableId("ignored", `fixed_expense_candidate|${input.candidateId}`), input.candidateId, input.supplier, input.reason ?? null],
  );
}

function annotateFixedExpenseCandidateDuplicates(candidates: FixedExpenseCandidate[]): FixedExpenseCandidate[] {
  return candidates.map((candidate) => {
    const duplicateOf = candidates
      .filter((other) => other.id !== candidate.id && looksLikeSameFixedExpenseCandidate(candidate, other))
      .sort((a, b) => b.transactionCount - a.transactionCount)
      .slice(0, 3)
      .map((other) => ({ id: other.id, supplier: other.supplier, amount: other.amount }));
    return duplicateOf.length ? { ...candidate, duplicateOf } : candidate;
  });
}

function looksLikeSameFixedExpenseCandidate(a: FixedExpenseCandidate, b: FixedExpenseCandidate) {
  if (normalizedSupplierKey(a.supplier) === normalizedSupplierKey(b.supplier)) return true;
  if (a.categoryId !== b.categoryId) return false;
  const amountRatio = Math.abs(a.amount - b.amount) / Math.max(a.amount, b.amount, 1);
  if (amountRatio > 0.65) return false;
  const aTokens = normalizeSupplierTokens(a.supplier);
  const bTokens = normalizeSupplierTokens(b.supplier);
  if (!aTokens.length || !bTokens.length) return false;
  return aTokens.some((token) => bTokens.includes(token));
}

function normalizeSupplierTokens(value: string) {
  const stopWords = new Set([
    "bank",
    "betaalverzoek",
    "betalingen",
    "betalings",
    "mollie",
    "multisafepay",
    "payments",
    "stichting",
    "veenendaal",
  ]);
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .map((token) => token.replace(/\d+$/g, ""))
    .filter((token) => token.length >= 4 && !stopWords.has(token));
}

export async function importBankDataset(dataset: FinanceDataset): Promise<ImportResult> {
  if (!dataset.importInfo) {
    throw new Error("Dataset heeft geen importinformatie.");
  }

  const pool = getPool();
  const client = await pool.connect();
  const importId = `imp_${dataset.importInfo.fileHash.slice(0, 24)}`;
  let insertedTransactions = 0;
  let skippedExcludedTransactions = 0;

  try {
    await client.query("begin");

    for (const category of dataset.categories) {
      await client.query(
        `insert into categories (id, name, parent, kind)
         values ($1, $2, $3, $4)
         on conflict (id) do update set name = excluded.name, parent = excluded.parent, kind = excluded.kind`,
        [category.id, category.name, category.parent ?? null, category.kind],
      );
    }

    const importInsert = await client.query<{ id: string }>(
      `insert into imports (id, source_bank, filename, file_hash, transaction_count, account_count)
       values ($1, $2, $3, $4, $5, $6)
       on conflict (file_hash) do nothing
       returning id`,
      [importId, dataset.importInfo.sourceBank ?? "Bank", dataset.importInfo.filename, dataset.importInfo.fileHash, dataset.importInfo.transactionCount, dataset.importInfo.accountCount],
    );
    const duplicateFile = importInsert.rowCount === 0;
    const accountIdsByImportId = new Map<string, string>();
    const excludedAccountIds = new Set<string>();

    for (const account of dataset.accounts) {
      const alias = normalizeAccountAlias(account.iban);
      const aliasResult = await client.query<{ account_id: string; excluded_from_import: boolean; balance_source: Account["balanceSource"] }>(
        `select a.id as account_id, a.excluded_from_import, a.balance_source
         from account_aliases alias
         join accounts a on a.id = alias.account_id
         where alias.alias = $1
           and a.archived_at is null`,
        [alias],
      );
      const existingAccount = aliasResult.rows[0];
      const accountResult = existingAccount
        ? existingAccount.excluded_from_import
          ? existingAccount
          : (
              await client.query<{ account_id: string; excluded_from_import: boolean; balance_source: Account["balanceSource"] }>(
                `update accounts
                 set bank = $2,
                     type = $4,
                     own_account = true,
                     balance = case when balance_source = 'manual' then balance else $3 end,
                     balance_date = case when balance_source = 'manual' then balance_date else coalesce($5::date, balance_date) end,
                     balance_checked_at = case when balance_source = 'manual' then balance_checked_at else now() end,
                     balance_source = case when balance_source = 'manual' then balance_source else 'import' end,
                     last_import_at = now()
                 where id = $1
                 returning id as account_id, excluded_from_import, balance_source`,
                [existingAccount.account_id, account.bank, account.balance, account.type, account.balanceDate ?? null],
              )
            ).rows[0]
        : (
            await client.query<{ account_id: string; excluded_from_import: boolean; balance_source: Account["balanceSource"] }>(
              `insert into accounts (id, name, iban, bank, type, balance, balance_date, balance_checked_at, balance_source, own_account, last_import_at)
               values ($1, $2, $3, $4, $5, $6, coalesce($8::date, current_date), now(), 'import', $7, now())
               on conflict (iban) do update
               set bank = case when accounts.excluded_from_import then accounts.bank else excluded.bank end,
                   type = case when accounts.excluded_from_import then accounts.type else excluded.type end,
                   own_account = true,
                   balance = case when accounts.excluded_from_import or accounts.balance_source = 'manual' then accounts.balance else excluded.balance end,
                   balance_date = case when accounts.excluded_from_import or accounts.balance_source = 'manual' then accounts.balance_date else excluded.balance_date end,
                   balance_checked_at = case when accounts.excluded_from_import or accounts.balance_source = 'manual' then accounts.balance_checked_at else excluded.balance_checked_at end,
                   balance_source = case when accounts.excluded_from_import or accounts.balance_source = 'manual' then accounts.balance_source else excluded.balance_source end,
                   last_import_at = case when accounts.excluded_from_import then accounts.last_import_at else now() end
               returning id as account_id, excluded_from_import, balance_source`,
              [account.id, account.name, account.iban, account.bank, account.type, account.balance, account.ownAccount, account.balanceDate ?? null],
            )
          ).rows[0];

      accountIdsByImportId.set(account.id, accountResult.account_id);
      if (accountResult.excluded_from_import) {
        excludedAccountIds.add(accountResult.account_id);
        continue;
      }

      if (account.balanceDate && accountResult.balance_source === "import") {
        await client.query(
          `insert into account_balance_observations (id, account_id, observed_on, balance, source, import_id)
           values ('balance_' || md5($1 || '|' || $2 || '|import'), $1, $2::date, $3, 'import', $4)
           on conflict (account_id, observed_on, source)
           do update set balance = excluded.balance, observed_at = now(), import_id = excluded.import_id`,
          [accountResult.account_id, account.balanceDate, account.balance, importId],
        );
      }

      await client.query(
        `insert into account_aliases (id, account_id, alias, label)
         values ($1, $2, $3, 'Importrekening')
         on conflict (alias) do update set account_id = excluded.account_id`,
        [stableId("alias", alias), accountResult.account_id, alias],
      );
    }

    for (const transaction of dataset.transactions) {
      const accountId = accountIdsByImportId.get(transaction.accountId) ?? transaction.accountId;
      if (excludedAccountIds.has(accountId)) {
        skippedExcludedTransactions += 1;
        continue;
      }

      const insert = await client.query(
        `insert into transactions (id, account_id, import_id, booked_at, counterparty, counter_account, description, amount, category_id, kind, transaction_hash, internal_transfer_group, rule_applied)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $1, $11, $12)
         on conflict (transaction_hash) do nothing`,
        [
          transaction.id,
          accountId,
          importId,
          transaction.date,
          transaction.counterparty,
          transaction.counterAccount ?? null,
          transaction.description,
          transaction.amount,
          transaction.categoryId,
          transaction.kind,
          transaction.internalTransferGroup ?? null,
          transaction.ruleApplied ?? null,
        ],
      );
      insertedTransactions += insert.rowCount ?? 0;
    }

    if (insertedTransactions > 0) {
      await reconcileInternalTransfers(client);
      await reconcileNamedInternalTransfers(client);
      await classifyKnownNamedInternalTransfers(client);
      await resetOrphanedInternalTransfers(client);
      await reclassifyUnbalancedInternalBankCosts(client);
      await applyActiveRules(client);
      await applyHistoricalCategoryMatches(client);
      await reconcileInternalTransfers(client);
      await reconcileNamedInternalTransfers(client);
      await classifyKnownNamedInternalTransfers(client);
      await resetOrphanedInternalTransfers(client);
      await reclassifyUnbalancedInternalBankCosts(client);
      await syncSavingsPotsFromTransactionsWithClient(client);
    }
    await refreshManualAccountBalances(client);

    await client.query("commit");
    return {
      importId,
      filename: dataset.importInfo.filename,
      accountCount: dataset.importInfo.accountCount,
      transactionCount: dataset.importInfo.transactionCount,
      insertedTransactions,
      skippedTransactions: dataset.importInfo.transactionCount - insertedTransactions,
      skippedExcludedTransactions,
      duplicateFile,
    };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

async function refreshManualAccountBalances(client: PoolClient) {
  await client.query(
    `update accounts
     set balance = coalesce(manual_balance, balance) + coalesce((
       select sum(t.amount)
       from transactions t
       where t.account_id = accounts.id
         and (
           t.booked_at > accounts.balance_date
           or (
             t.booked_at = accounts.balance_date
             and t.created_at > accounts.balance_checked_at
           )
         )
     ), 0)
     where balance_source = 'manual'
       and balance_date is not null`,
  );
}

async function refreshImportAccountBalances(client: PoolClient, accountIds: string[]) {
  if (!accountIds.length) return;
  await client.query(
    `update accounts
     set balance = coalesce(opening_balance, 0) + coalesce((
           select sum(t.amount)
           from transactions t
           where t.account_id = accounts.id
         ), 0),
         balance_date = coalesce((
           select max(t.booked_at)
           from transactions t
           where t.account_id = accounts.id
         ), balance_date),
         balance_checked_at = now(),
         last_import_at = (
           select max(i.imported_at)
           from transactions t
           join imports i on i.id = t.import_id
           where t.account_id = accounts.id
         )
     where balance_source = 'import'
       and id = any($1::text[])`,
    [accountIds],
  );
}

export async function importRabobankDataset(dataset: FinanceDataset): Promise<ImportResult> {
  return importBankDataset(dataset);
}

export async function undoImport(importId: string) {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("begin");
    const importResult = await client.query<ImportHistoryRow>(
      `select id, filename, source_bank, transaction_count, account_count, imported_at
       from imports
       where id = $1`,
      [importId],
    );
    const importRow = importResult.rows[0];
    if (!importRow) {
      await client.query("rollback");
      return undefined;
    }
    const affectedAccounts = await client.query<{ account_id: string }>(
      `select distinct account_id
       from transactions
       where import_id = $1`,
      [importId],
    );
    const affectedAccountIds = affectedAccounts.rows.map((row) => row.account_id);

    await client.query(
      `update categorization_rules
       set created_from_transaction_id = null
       where created_from_transaction_id in (
         select id from transactions where import_id = $1
       )`,
      [importId],
    );
    const deletedTransactions = await client.query<{ id: string }>(
      `delete from transactions
       where import_id = $1
       returning id`,
      [importId],
    );
    await client.query("delete from imports where id = $1", [importId]);
    await syncSavingsPotsFromTransactionsWithClient(client);
    await refreshImportAccountBalances(client, affectedAccountIds);
    await refreshManualAccountBalances(client);

    await client.query("commit");
    return {
      importId,
      filename: importRow.filename,
      deletedTransactions: deletedTransactions.rowCount ?? 0,
    };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function saveCategoryRecord(input: { id?: string; name: string; parent?: string; kind: Category["kind"] }) {
  const id = input.id || stableId("category", `${input.parent ?? ""}|${input.name}`.toLowerCase());
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("begin");
    const existing = await client.query<CategoryRow>("select id, name, parent, kind, valid_to from categories where id = $1", [id]);
    const previousName = existing.rows[0]?.name;
    const parent = input.parent && input.parent !== input.name ? input.parent : null;

    await client.query(
      `insert into categories (id, name, parent, kind)
       values ($1, $2, $3, $4)
       on conflict (id) do update set name = excluded.name, parent = excluded.parent, kind = excluded.kind, valid_to = null`,
      [id, input.name, parent, input.kind],
    );

    if (previousName && previousName !== input.name) {
      await client.query("update categories set parent = $1 where parent = $2", [input.name, previousName]);
    }

    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function archiveCategory(categoryId: string) {
  const protectedCategoryIds = new Set(["intern", "potje-opname", "ontsparen", "overig", "overig-inkomen"]);
  if (protectedCategoryIds.has(categoryId)) return;

  const usage = await query<{ name: string; total: string }>(
    `select
       c.name,
       (select count(*) from transactions where category_id = c.id)
       + (select count(*) from budgets where category_id = c.id)
       + (select count(*) from fixed_expenses where category_id = c.id)
       + (select count(*) from categorization_rules where category_id = c.id)
       + (select count(*) from categories child where child.parent = c.name and child.valid_to is null) as total
     from categories c
     where c.id = $1`,
    [categoryId],
  );
  const category = usage.rows[0];
  if (!category) return;

  if (Number(category.total) === 0) {
    await query("delete from categories where id = $1", [categoryId]);
  } else {
    await query("update categories set valid_to = current_date where id = $1", [categoryId]);
    await query("update categorization_rules set active = false where category_id = $1", [categoryId]);
  }
}

export async function saveCategorizationRule(input: { id?: string; pattern: string; categoryId: string; matchScope?: CategorizationRuleScope }) {
  const categoryResult = await query<CategoryRow>("select id, name, parent, kind, valid_to from categories where id = $1", [input.categoryId]);
  const category = categoryResult.rows[0];
  if (!category) throw new Error("Categorie niet gevonden.");
  if (category.valid_to) throw new Error("Gearchiveerde categorieen kunnen geen actieve mappingregel krijgen.");

  const matchScope = input.matchScope ?? "all";
  const pattern = normalizeRulePattern(input.pattern);
  const id = input.id || stableId("rule", `${matchScope}|${pattern}|${input.categoryId}`);
  await query(
    `insert into categorization_rules (id, pattern, match_scope, category_id, kind, active)
     values ($1, $2, $3, $4, $5, true)
     on conflict (id) do update set pattern = excluded.pattern, match_scope = excluded.match_scope, category_id = excluded.category_id, kind = excluded.kind, active = true`,
    [id, pattern, matchScope, category.id, category.kind],
  );
}

export async function archiveCategorizationRule(ruleId: string) {
  await query("delete from categorization_rules where id = $1", [ruleId]);
}

export async function applyAllCategorizationRules() {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("begin");
    await ensureDefaultCategories(client);
    await reconcileInternalTransfers(client);
    await reconcileNamedInternalTransfers(client);
    await classifyKnownNamedInternalTransfers(client);
    await reclassifyUnbalancedInternalBankCosts(client);
    const updated = await applyActiveRules(client);
    const historicallyMatched = await applyHistoricalCategoryMatches(client);
    await reconcileInternalTransfers(client);
    await reconcileNamedInternalTransfers(client);
    await classifyKnownNamedInternalTransfers(client);
    await reclassifyUnbalancedInternalBankCosts(client);
    await client.query("commit");
    return updated + historicallyMatched;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function installMarketMappingPreset() {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("begin");
    await ensureDefaultCategories(client);

    for (const category of marketCategories) {
      await client.query(
        `insert into categories (id, name, parent, kind)
         values ($1, $2, $3, $4)
         on conflict (id) do update set name = excluded.name, parent = excluded.parent, kind = excluded.kind, valid_to = null`,
        [category.id, category.name, category.parent ?? null, category.kind],
      );
    }

    await client.query("delete from categorization_rules");

    const uniqueRules = new Set<string>();
    for (const rule of marketMappingRules) {
      uniqueRules.add(rule.id);
      await client.query(
        `insert into categorization_rules (id, pattern, match_scope, category_id, kind, active)
         values ($1, $2, $3, $4, $5, true)
         on conflict (id) do update set pattern = excluded.pattern, match_scope = excluded.match_scope, category_id = excluded.category_id, kind = excluded.kind, active = true`,
        [rule.id, rule.pattern, rule.matchScope ?? "counterparty_description", rule.categoryId, rule.kind],
      );
    }

    await client.query(
      `update transactions
       set category_id = null,
           kind = case when amount > 0 then 'inkomen' else 'variabele_uitgave' end,
           rule_applied = null
       where kind <> 'interne_overboeking'
         and internal_transfer_group is null`,
    );

    await reconcileInternalTransfers(client);
    await reclassifyUnbalancedInternalBankCosts(client);
    const updated = await applyActiveRules(client);
    await reconcileInternalTransfers(client);
    await reclassifyUnbalancedInternalBankCosts(client);

    await client.query("commit");
    return { categories: marketCategories.length, rules: uniqueRules.size, updated };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function repairInternalTransfers() {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("begin");
    await ensureDefaultCategories(client);
    const updated = await reconcileInternalTransfers(client);
    const namedUpdated = await reconcileNamedInternalTransfers(client);
    const namedFallbackUpdated = await classifyKnownNamedInternalTransfers(client);
    const reclassified = await reclassifyUnbalancedInternalBankCosts(client);
    await client.query("commit");
    return updated + namedUpdated + namedFallbackUpdated + reclassified;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

async function applyActiveRules(client: PoolClient) {
  const rules = await client.query<{ pattern: string; match_scope: CategorizationRuleScope; category_id: string; kind: Transaction["kind"] }>(
    "select pattern, match_scope, category_id, kind from categorization_rules where active = true order by length(pattern), created_at, id",
  );

  let updated = 0;
  for (const rule of rules.rows) {
    const result = await client.query(
      `update transactions
       set category_id = $1, kind = $2, rule_applied = $3
       where kind <> 'interne_overboeking'
         and internal_transfer_group is null
         and (
           ($2 = 'inkomen' and amount > 0)
           or ($2 <> 'inkomen' and amount < 0)
         )
         and ${ruleMatchSql("transactions", "$4", "$5")}`,
      [rule.category_id, rule.kind, `Regel: ${rule.pattern}`, rule.pattern, rule.match_scope],
    );
    updated += result.rowCount ?? 0;
  }
  return updated;
}

async function applyHistoricalCategoryMatches(client: PoolClient) {
  const result = await client.query(
    `with open_transactions as (
       select
         t.id,
         nullif(trim(t.counter_account), '') as counter_account,
         regexp_replace(lower(coalesce(t.counterparty, '')), '[^a-z0-9]+', '', 'g') as counterparty_key,
         sign(t.amount) as amount_sign
       from transactions t
       where t.category_id is null
         and t.kind <> 'interne_overboeking'
         and t.internal_transfer_group is null
     ), matched_history as (
       select
         target.id,
         history.category_id,
         category.kind,
         case
           when target.counter_account is not null and nullif(trim(history.counter_account), '') = target.counter_account then 'tegenrekening'
           else 'tegenpartij'
         end as match_source,
         case
           when target.counter_account is not null and nullif(trim(history.counter_account), '') = target.counter_account then 1
           else 2
         end as source_priority
       from open_transactions target
       join transactions history
         on history.id <> target.id
        and history.category_id is not null
        and history.category_id not in ('overig', 'overig-inkomen')
        and history.kind <> 'interne_overboeking'
        and sign(history.amount) = target.amount_sign
        and (
          (target.counter_account is not null and nullif(trim(history.counter_account), '') = target.counter_account)
          or (
            target.counterparty_key <> ''
            and regexp_replace(lower(coalesce(history.counterparty, '')), '[^a-z0-9]+', '', 'g') = target.counterparty_key
          )
        )
       join categories category on category.id = history.category_id and category.valid_to is null
     ), best_source as (
       select id, min(source_priority) as source_priority
       from matched_history
       group by id
     ), evidence as (
       select
         matched.id,
         matched.category_id,
         matched.kind,
         matched.match_source,
         count(*)::int as evidence_count
       from matched_history matched
       join best_source on best_source.id = matched.id and best_source.source_priority = matched.source_priority
       group by matched.id, matched.category_id, matched.kind, matched.match_source
     ), ranked as (
       select
         evidence.*,
         sum(evidence_count) over (partition by id) as total_evidence,
         row_number() over (partition by id order by evidence_count desc, category_id) as category_rank
       from evidence
     ), unambiguous as (
       select id, category_id, kind, match_source
       from ranked
       where category_rank = 1
         and evidence_count = total_evidence
     )
     update transactions target_transaction
     set category_id = unambiguous.category_id,
         kind = unambiguous.kind,
         rule_applied = 'Historische match: ' || unambiguous.match_source
     from unambiguous
     where target_transaction.id = unambiguous.id`,
  );
  return result.rowCount ?? 0;
}

async function reconcileInternalTransfers(client: PoolClient) {
  const result = await client.query(
    `with candidates as (
       select
         t1.id as first_id,
         t2.id as second_id,
         'int_' || substr(md5(t1.booked_at::text || '|' || abs(t1.amount)::text || '|' || least(t1.account_id, t2.account_id) || '|' || greatest(t1.account_id, t2.account_id)), 1, 24) as transfer_group
       from transactions t1
       join transactions t2
         on t1.id < t2.id
        and t1.booked_at = t2.booked_at
        and abs(t1.amount) = abs(t2.amount)
        and t1.amount = -t2.amount
        and t1.account_id <> t2.account_id
       join accounts a1 on a1.id = t1.account_id and a1.own_account = true and a1.archived_at is null
       join accounts a2 on a2.id = t2.account_id and a2.own_account = true and a2.archived_at is null
       where a1.excluded_from_import = false
         and a2.excluded_from_import = false
     ),
     candidate_transactions as (
       select t.id,
              c.transfer_group,
              t.amount,
              account.type as account_type,
              other_account.type as other_account_type
       from candidates c
       join transactions t on t.id in (c.first_id, c.second_id)
       join accounts account on account.id = t.account_id
       join transactions other_transaction on other_transaction.id in (c.first_id, c.second_id) and other_transaction.id <> t.id
       join accounts other_account on other_account.id = other_transaction.account_id
     ),
     marked as (
       update transactions t
       set category_id = case
             when candidate_transactions.account_type = 'betaalrekening'
              and candidate_transactions.other_account_type = 'spaarrekening'
              and candidate_transactions.amount < 0 then 'sparen'
             when candidate_transactions.account_type = 'betaalrekening'
              and candidate_transactions.other_account_type = 'spaarrekening'
              and candidate_transactions.amount > 0 then 'potje-opname'
             else 'intern'
           end,
           kind = case
             when candidate_transactions.account_type = 'betaalrekening'
              and candidate_transactions.other_account_type = 'spaarrekening'
              and candidate_transactions.amount < 0 then 'reservering'
             when candidate_transactions.account_type = 'betaalrekening'
              and candidate_transactions.other_account_type = 'spaarrekening'
              and candidate_transactions.amount > 0 then 'interne_overboeking'
             else 'interne_overboeking'
           end,
           internal_transfer_group = candidate_transactions.transfer_group,
           rule_applied = case
             when candidate_transactions.account_type = 'betaalrekening'
              and candidate_transactions.other_account_type = 'spaarrekening'
              and candidate_transactions.amount < 0 then 'Sparen naar eigen spaarrekening'
             when candidate_transactions.account_type = 'betaalrekening'
              and candidate_transactions.other_account_type = 'spaarrekening'
              and candidate_transactions.amount > 0 then 'Uit spaarrekening'
             when candidate_transactions.account_type = 'spaarrekening'
              and candidate_transactions.other_account_type = 'betaalrekening' then 'Spaarrekeningzijde van sparen'
             else 'Kruispost tussen eigen rekeningen'
           end
       from candidate_transactions
       where t.id = candidate_transactions.id
         and (
           t.category_id is distinct from case
             when candidate_transactions.account_type = 'betaalrekening'
              and candidate_transactions.other_account_type = 'spaarrekening'
              and candidate_transactions.amount < 0 then 'sparen'
             when candidate_transactions.account_type = 'betaalrekening'
              and candidate_transactions.other_account_type = 'spaarrekening'
              and candidate_transactions.amount > 0 then 'potje-opname'
             else 'intern'
           end
           or t.kind is distinct from case
             when candidate_transactions.account_type = 'betaalrekening'
              and candidate_transactions.other_account_type = 'spaarrekening'
              and candidate_transactions.amount < 0 then 'reservering'
             when candidate_transactions.account_type = 'betaalrekening'
              and candidate_transactions.other_account_type = 'spaarrekening'
              and candidate_transactions.amount > 0 then 'interne_overboeking'
             else 'interne_overboeking'
           end
           or t.internal_transfer_group is distinct from candidate_transactions.transfer_group
           or t.rule_applied is distinct from case
             when candidate_transactions.account_type = 'betaalrekening'
              and candidate_transactions.other_account_type = 'spaarrekening'
              and candidate_transactions.amount < 0 then 'Sparen naar eigen spaarrekening'
             when candidate_transactions.account_type = 'betaalrekening'
              and candidate_transactions.other_account_type = 'spaarrekening'
              and candidate_transactions.amount > 0 then 'Uit spaarrekening'
             when candidate_transactions.account_type = 'spaarrekening'
              and candidate_transactions.other_account_type = 'betaalrekening' then 'Spaarrekeningzijde van sparen'
             else 'Kruispost tussen eigen rekeningen'
           end
         )
       returning t.id
     )
     select count(*)::int as updated from marked`,
  );
  return Number(result.rows[0]?.updated ?? 0);
}

async function reconcileNamedInternalTransfers(client: PoolClient) {
  const result = await client.query(
    `with prepared as (
       select
         t.id,
         t.account_id,
         t.booked_at,
         t.amount,
         t.created_at,
         a.type as account_type,
         coalesce(
           nullif(trim(substring(t.description from '(?i)(?:naar|van):\\s*([^"]+)')), ''),
           nullif(trim(t.counterparty), '')
         ) as transfer_label
       from transactions t
       join accounts a on a.id = t.account_id and a.own_account = true and a.archived_at is null and a.excluded_from_import = false
       where t.internal_transfer_group is null
         and t.category_id is null
         and coalesce(t.counter_account, '') = ''
     ),
     normalized as (
       select *,
              regexp_replace(lower(coalesce(transfer_label, '')), '[^a-z0-9]', '', 'g') as transfer_key
       from prepared
     ),
     paired as (
       select
         positive.id as positive_id,
         negative.id as negative_id,
         'int_named_' || substr(md5(least(positive.id, negative.id) || '|' || greatest(positive.id, negative.id)), 1, 24) as transfer_group
       from (
         select *,
                row_number() over (
                  partition by booked_at, abs(amount), account_id, transfer_key
                  order by created_at, id
                ) as pair_index
         from normalized
         where amount > 0
           and transfer_key <> ''
       ) positive
       join (
         select *,
                row_number() over (
                  partition by booked_at, abs(amount), account_id, transfer_key
                  order by created_at, id
                ) as pair_index
         from normalized
         where amount < 0
           and transfer_key <> ''
       ) negative
         on positive.booked_at = negative.booked_at
        and abs(positive.amount) = abs(negative.amount)
        and positive.account_id <> negative.account_id
        and positive.transfer_key = negative.transfer_key
        and positive.pair_index = negative.pair_index
     ),
     candidate_transactions as (
       select t.id,
              p.transfer_group,
              t.amount,
              account.type as account_type,
              other_account.type as other_account_type
       from paired p
       join transactions t on t.id in (p.positive_id, p.negative_id)
       join accounts account on account.id = t.account_id
       join transactions other_transaction on other_transaction.id in (p.positive_id, p.negative_id) and other_transaction.id <> t.id
       join accounts other_account on other_account.id = other_transaction.account_id
     ),
     marked as (
       update transactions t
       set category_id = case
             when candidate_transactions.account_type = 'betaalrekening'
              and candidate_transactions.other_account_type = 'spaarrekening'
              and candidate_transactions.amount < 0 then 'sparen'
             when candidate_transactions.account_type = 'betaalrekening'
              and candidate_transactions.other_account_type = 'spaarrekening'
              and candidate_transactions.amount > 0 then 'potje-opname'
             else 'intern'
           end,
           kind = case
             when candidate_transactions.account_type = 'betaalrekening'
              and candidate_transactions.other_account_type = 'spaarrekening'
              and candidate_transactions.amount < 0 then 'reservering'
             when candidate_transactions.account_type = 'betaalrekening'
              and candidate_transactions.other_account_type = 'spaarrekening'
              and candidate_transactions.amount > 0 then 'interne_overboeking'
             else 'interne_overboeking'
           end,
           internal_transfer_group = candidate_transactions.transfer_group,
           rule_applied = case
             when candidate_transactions.account_type = 'betaalrekening'
              and candidate_transactions.other_account_type = 'spaarrekening'
              and candidate_transactions.amount < 0 then 'Sparen naar eigen spaarrekening'
             when candidate_transactions.account_type = 'betaalrekening'
              and candidate_transactions.other_account_type = 'spaarrekening'
              and candidate_transactions.amount > 0 then 'Uit spaarrekening'
             when candidate_transactions.account_type = 'spaarrekening'
              and candidate_transactions.other_account_type = 'betaalrekening' then 'Spaarrekeningzijde van sparen'
             else 'Kruispost tussen eigen rekeningen'
           end
       from candidate_transactions
       where t.id = candidate_transactions.id
       returning t.id
     )
     select count(*)::int as updated from marked`,
  );
  return Number(result.rows[0]?.updated ?? 0);
}

async function classifyKnownNamedInternalTransfers(client: PoolClient) {
  const result = await client.query(
    `with known_names(name_key) as (
       values
         ('vrijspaargeld'),
         ('weekgeld'),
         ('weekgeldpermaand'),
         ('vrijtebestedenpermaand'),
         ('sparen'),
         ('huis'),
         ('vakantie'),
         ('benzine'),
         ('kleding'),
         ('huiswntuin'),
         ('vrijtebesteden'),
         ('hypotheek'),
         ('kinderbijslag')
       union
       select regexp_replace(lower(p.name), '[^a-z0-9]', '', 'g')
       from pots p
       join accounts a on a.id = p.account_id
       where a.type = 'spaarrekening' and a.archived_at is null
     ),
     candidates as (
       select
         t.id,
         t.amount,
         a.type as account_type,
         regexp_replace(lower(coalesce(
           nullif(trim(substring(t.description from '(?i)(?:naar|van):\\s*([^"]+)')), ''),
           nullif(trim(t.counterparty), '')
         )), '[^a-z0-9]', '', 'g') as transfer_key
       from transactions t
       join accounts a on a.id = t.account_id and a.own_account = true and a.archived_at is null and a.excluded_from_import = false
       where t.internal_transfer_group is null
         and t.category_id is null
         and coalesce(t.counter_account, '') = ''
     ),
     marked as (
       update transactions t
       set category_id = case
             when candidates.account_type = 'betaalrekening' and candidates.amount < 0 then 'sparen'
             when candidates.account_type = 'betaalrekening' and candidates.amount > 0 then 'potje-opname'
             else 'intern'
           end,
           kind = case
             when candidates.account_type = 'betaalrekening' and candidates.amount < 0 then 'reservering'
             else 'interne_overboeking'
           end,
           rule_applied = case
             when candidates.account_type = 'betaalrekening' and candidates.amount < 0 then 'Interne potreservering'
             when candidates.account_type = 'betaalrekening' and candidates.amount > 0 then 'Interne potopname'
             else 'Interne potrekeningzijde'
           end
       from candidates
       join known_names on known_names.name_key = candidates.transfer_key
       where t.id = candidates.id
       returning t.id
     )
     select count(*)::int as updated from marked`,
  );
  return Number(result.rows[0]?.updated ?? 0);
}

async function resetOrphanedInternalTransfers(client: PoolClient) {
  const result = await client.query(
    `with orphaned as (
       select internal_transfer_group
       from transactions
       where internal_transfer_group is not null
       group by internal_transfer_group
       having count(*) <> 2
          or abs(coalesce(sum(amount), 0)) >= 0.005
     ),
     reset as (
       update transactions t
       set category_id = null,
           kind = case when t.amount > 0 then 'inkomen' else 'variabele_uitgave' end,
           internal_transfer_group = null,
           rule_applied = null
       from orphaned
       where t.internal_transfer_group = orphaned.internal_transfer_group
       returning t.id
     )
     select count(*)::int as updated from reset`,
  );
  return Number(result.rows[0]?.updated ?? 0);
}

async function ensureDefaultCategories(client: PoolClient) {
  for (const category of defaultCategories) {
    await client.query(
      `insert into categories (id, name, parent, kind)
       values ($1, $2, $3, $4)
       on conflict (id) do update set name = excluded.name, parent = excluded.parent, kind = excluded.kind, valid_to = null`,
      [category.id, category.name, category.parent ?? null, category.kind],
    );
  }
}

async function reclassifyUnbalancedInternalBankCosts(client: PoolClient) {
  const result = await client.query(
    `with unbalanced as (
       select internal_transfer_group
       from transactions
       where kind = 'interne_overboeking'
         and internal_transfer_group is not null
       group by internal_transfer_group
       having count(*) <> 2 or abs(coalesce(sum(amount), 0)) >= 0.005
     ),
     marked as (
       update transactions t
       set category_id = 'bankkosten',
           kind = 'vaste_last',
           internal_transfer_group = null,
           rule_applied = 'Rabobank kosten'
       from unbalanced
       where t.internal_transfer_group = unbalanced.internal_transfer_group
         and (
           lower(coalesce(t.counterparty, '') || ' ' || coalesce(t.description, '')) like '%kosten%rabo%'
           or lower(coalesce(t.counterparty, '') || ' ' || coalesce(t.description, '')) like '%rabo%kosten%'
         )
       returning t.id
     )
     select count(*)::int as updated from marked`,
  );
  return Number(result.rows[0]?.updated ?? 0);
}

interface AccountRow {
  id: string;
  name: string;
  iban: string;
  bank: string;
  type: Account["type"];
  balance: string;
  opening_balance: string;
  opening_balance_date: Date | string | null;
  balance_date: Date | string | null;
  balance_checked_at: Date | string | null;
  balance_source: Account["balanceSource"];
  own_account: boolean;
  excluded_from_import: boolean;
  last_import_at: Date | null;
}

interface DashboardMonthlyRow {
  month: string;
  type: Account["type"];
  delta: string;
  income: string;
  expenses: string;
  spendable_expenses: string;
  savings: string;
  investments: string;
  withdrawals: string;
}

interface DashboardCategoryInsightRow {
  month: string;
  category_id: string | null;
  category_name: string;
  kind: Transaction["kind"] | "sparen" | "ontsparen" | "bijschrijving";
  amount: string;
}

interface AccountAliasRow {
  id: string;
  account_id: string;
  alias: string;
  label: string | null;
}

interface CategoryRow {
  id: string;
  name: string;
  parent: string | null;
  kind: Category["kind"];
  valid_to: Date | string | null;
}

interface RuleRow {
  id: string;
  pattern: string;
  match_scope: CategorizationRuleScope;
  category_id: string;
  kind: Transaction["kind"];
  active: boolean;
  match_count: string;
  created_at: Date | string;
}

interface ImportMappingPresetRow {
  id: string;
  name: string;
  source_bank: string;
  mapping: Record<string, string>;
  last_used_at: Date | string;
}

interface ImportHistoryRow {
  id: string;
  filename: string;
  source_bank: string;
  transaction_count: number;
  account_count: number;
  imported_at: Date | string;
}

interface ImportAccountControlRow {
  account_id: string;
  account_name: string;
  iban: string;
  type: Account["type"];
  balance: string;
  calculated_balance: string;
  balance_difference: string;
  transaction_count: number;
  last_import_at: Date | string | null;
}

interface TransactionRow {
  id: string;
  account_id: string;
  account_name?: string;
  booked_at: Date | string;
  counterparty: string | null;
  counter_account: string | null;
  description: string;
  amount: string;
  category_id: string | null;
  kind: Transaction["kind"];
  internal_transfer_group: string | null;
  rule_applied: string | null;
  evidence_count?: number | string | null;
  average_amount?: number | string | null;
  source_file?: string | null;
  suggested_category_id?: string | null;
  suggestion_score?: number | string | null;
  suggestion_reason?: string | null;
}

interface ImportRow {
  filename: string;
  file_hash: string;
  transaction_count: number;
  account_count: number;
}

interface BudgetRow {
  id: string;
  month: string;
  category_id: string;
  planned_amount: string;
  previous_planned_amount: string | null;
  previous_actual_amount: string | null;
  actual_amount: string;
  rollover: boolean;
  note: string | null;
  exception_accepted: boolean;
}

interface AnnualBudgetRow {
  id: string;
  year: number;
  category_id: string;
  planned_amount: string;
  actual_amount: string;
}

interface PotRow {
  id: string;
  account_id: string | null;
  name: string;
  target_amount: string | null;
  current_amount: string | null;
  target_date: string | null;
  monthly_reservation: string | null;
  movement_count?: number;
  movement_balance?: string | null;
  first_movement_at?: string | null;
  last_movement_at?: string | null;
}

interface PotMovementRow {
  id: string;
  booked_at: Date | string;
  payment_account_id: string;
  payment_account_name: string;
  description: string;
  amount: string;
  direction: "inleg" | "opname";
}

interface FixedExpenseRow {
  id: string;
  supplier: string;
  category_id: string;
  amount: string;
  previous_amount: string | null;
  frequency: FixedExpense["frequency"];
  next_due_on: string | null;
  booked_dates: string[];
}

interface RecurringIncomeRow {
  id: string;
  label: string;
  amount: string;
  frequency: RecurringIncome["frequency"];
  next_expected_on: string;
}

interface FixedExpenseCandidateRow {
  id: string;
  supplier: string;
  category_id: string;
  category_name: string;
  frequency: FixedExpense["frequency"];
  amount: string;
  previous_amount: string | null;
  transaction_count: number;
  months_seen: number;
  booked_dates: string[];
  first_seen: Date | string | null;
  last_seen: Date | string | null;
  confidence: number;
  reason: string;
  already_managed: boolean;
}

interface AuditLogRow {
  id: string;
  actor_user_id: string | null;
  actor_name: string | null;
  actor_email: string | null;
  event_type: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown>;
  created_at: Date | string;
}

function mapAccount(row: AccountRow): Account {
  return {
    id: row.id,
    name: row.name,
    iban: row.iban,
    bank: row.bank,
    type: row.type,
    balance: Number(row.balance),
    openingBalance: Number(row.opening_balance),
    openingBalanceDate: dateString(row.opening_balance_date),
    balanceDate: dateString(row.balance_date),
    balanceCheckedAt: dateTimeString(row.balance_checked_at),
    balanceSource: row.balance_source,
    ownAccount: row.own_account,
    excluded_from_import: row.excluded_from_import ?? false,
    lastImportAt: row.last_import_at?.toISOString() ?? new Date(0).toISOString(),
  };
}

function mapCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    parent: row.parent ?? undefined,
    kind: row.kind,
    validTo: dateString(row.valid_to),
  };
}

function ruleMatchSql(tableName: string, patternPlaceholder: string, scopePlaceholder: string) {
  const normalizedCounterAccountMatch = `regexp_replace(lower(coalesce(${tableName}.counter_account, '')), '[^a-z0-9]', '', 'g') like '%' || regexp_replace(lower(${patternPlaceholder}), '[^a-z0-9]', '', 'g') || '%'`;
  return `case ${scopePlaceholder}
    when 'counterparty' then lower(coalesce(${tableName}.counterparty, '')) like '%' || lower(${patternPlaceholder}) || '%'
    when 'description' then lower(coalesce(${tableName}.description, '')) like '%' || lower(${patternPlaceholder}) || '%'
    when 'counter_account' then (lower(coalesce(${tableName}.counter_account, '')) like '%' || lower(${patternPlaceholder}) || '%' or ${normalizedCounterAccountMatch})
    when 'counterparty_description' then lower(concat_ws(' ', ${tableName}.counterparty, ${tableName}.description)) like '%' || lower(${patternPlaceholder}) || '%'
    when 'counterparty_counter_account' then (lower(concat_ws(' ', ${tableName}.counterparty, ${tableName}.counter_account)) like '%' || lower(${patternPlaceholder}) || '%' or ${normalizedCounterAccountMatch})
    when 'description_counter_account' then (lower(concat_ws(' ', ${tableName}.description, ${tableName}.counter_account)) like '%' || lower(${patternPlaceholder}) || '%' or ${normalizedCounterAccountMatch})
    else (lower(concat_ws(' ', ${tableName}.counterparty, ${tableName}.description, ${tableName}.counter_account)) like '%' || lower(${patternPlaceholder}) || '%' or ${normalizedCounterAccountMatch})
  end`;
}

function normalizeRulePattern(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function inferRulePattern(transaction: TransactionRow) {
  const counterparty = normalizeRulePattern(transaction.counterparty ?? "");
  if (counterparty) {
    const withoutTrailingNumbers = normalizeRulePattern(counterparty.replace(/\s+\d{2,}$/g, ""));
    if (withoutTrailingNumbers.length >= 3) return withoutTrailingNumbers;
    return counterparty;
  }
  return normalizeRulePattern(transaction.description);
}

function mapCategorizationRule(row: RuleRow): CategorizationRule {
  return {
    id: row.id,
    pattern: row.pattern,
    matchScope: row.match_scope,
    categoryId: row.category_id,
    kind: row.kind,
    active: row.active,
    matchCount: Number(row.match_count),
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  };
}

function buildDashboardBalanceSeries(rows: DashboardMonthlyRow[], currentTotal: number, currentPayment: number, currentSavings: number): DashboardSummary["balanceSeries"] {
  const byMonth = new Map<string, DashboardSummary["balanceSeries"][number] & { paymentDelta: number; savingsDelta: number }>();
  for (const row of rows) {
    const month = byMonth.get(row.month) ?? {
      month: row.month,
      totalBalance: 0,
      paymentBalance: 0,
      savingsBalance: 0,
      income: 0,
      expenses: 0,
      spendableExpenses: 0,
      savings: 0,
      investments: 0,
      withdrawals: 0,
      cashNet: 0,
      spendableNet: 0,
      paymentDelta: 0,
      savingsDelta: 0,
    };
    const delta = Number(row.delta);
    if (row.type === "spaarrekening") month.savingsDelta += delta;
    if (row.type === "betaalrekening") month.paymentDelta += delta;
    month.income += Number(row.income);
    month.expenses += Number(row.expenses);
    month.spendableExpenses += Number(row.spendable_expenses);
    month.savings += Number(row.savings);
    month.investments += Number(row.investments);
    month.withdrawals += Number(row.withdrawals);
    month.cashNet = month.income - month.expenses;
    month.spendableNet = getSpendableNet({
      income: month.income,
      spendableExpenses: month.spendableExpenses,
      savings: month.savings,
      investments: month.investments,
      withdrawals: month.withdrawals,
    });
    byMonth.set(row.month, month);
  }

  const descending = Array.from(byMonth.values()).sort((a, b) => b.month.localeCompare(a.month));
  let futurePaymentDelta = 0;
  let futureSavingsDelta = 0;
  for (const row of descending) {
    row.paymentBalance = roundMoney(currentPayment - futurePaymentDelta);
    row.savingsBalance = roundMoney(currentSavings - futureSavingsDelta);
    row.totalBalance = roundMoney(currentTotal - futurePaymentDelta - futureSavingsDelta);
    futurePaymentDelta += row.paymentDelta;
    futureSavingsDelta += row.savingsDelta;
  }

  return descending
    .sort((a, b) => a.month.localeCompare(b.month))
    .map(({ paymentDelta, savingsDelta, ...row }) => ({
      ...row,
      income: roundMoney(row.income),
      expenses: roundMoney(row.expenses),
      spendableExpenses: roundMoney(row.spendableExpenses),
      savings: roundMoney(row.savings),
      investments: roundMoney(row.investments),
      withdrawals: roundMoney(row.withdrawals),
      cashNet: roundMoney(row.cashNet),
      spendableNet: roundMoney(row.spendableNet),
    }));
}

function getSpendableNet(totals: { income: number; spendableExpenses: number; savings: number; investments: number; withdrawals: number }) {
  return totals.income + totals.withdrawals - totals.spendableExpenses - totals.savings - totals.investments;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function mapPot(row: PotRow): SavingsPot {
  return {
    id: row.id,
    accountId: row.account_id ?? undefined,
    name: row.name,
    targetAmount: row.target_amount === null ? undefined : Number(row.target_amount),
    currentAmount: row.current_amount === null ? undefined : Number(row.current_amount),
    targetDate: row.target_date ?? undefined,
    monthlyReservation: row.monthly_reservation === null ? undefined : Number(row.monthly_reservation),
    movementCount: row.movement_count ?? undefined,
    movementBalance: row.movement_balance === null || row.movement_balance === undefined ? undefined : Number(row.movement_balance),
    firstMovementAt: row.first_movement_at ?? undefined,
    lastMovementAt: row.last_movement_at ?? undefined,
  };
}

function mapTransaction(row: TransactionRow): Transaction {
  const bookedAt = row.booked_at instanceof Date ? row.booked_at.toISOString().slice(0, 10) : String(row.booked_at).slice(0, 10);
  const evidenceCount = Number(row.evidence_count ?? 0);
  const averageAmount = Number(row.average_amount ?? 0);
  const deviation = evidenceCount >= 3 && averageAmount > 0 && Math.abs(Math.abs(Number(row.amount)) - averageAmount) / averageAmount >= 0.4;
  return {
    id: row.id,
    date: bookedAt,
    accountId: row.account_id,
    accountName: row.account_name,
    counterparty: row.counterparty ?? "Onbekend",
    counterAccount: row.counter_account ?? undefined,
    description: row.description,
    amount: Number(row.amount),
    categoryId: row.category_id ?? undefined,
    kind: row.kind,
    internalTransferGroup: row.internal_transfer_group ?? undefined,
    ruleApplied: row.rule_applied ?? undefined,
    sourceFile: row.source_file ?? undefined,
    recurrencePattern: evidenceCount >= 2 ? (deviation ? "afwijking" : "terugkerend") : undefined,
    recurrenceConfidence: evidenceCount >= 5 ? "high" : evidenceCount >= 3 ? "medium" : evidenceCount >= 2 ? "low" : undefined,
    recurrenceEvidenceCount: evidenceCount || undefined,
    suggestedCategoryId: row.suggested_category_id ?? undefined,
    categorySuggestionScore: row.suggestion_score == null ? undefined : Number(row.suggestion_score),
    categorySuggestionReason: row.suggestion_reason ?? undefined,
  };
}

function stableId(prefix: string, value: string) {
  return `${prefix}_${createHash("sha256").update(value).digest("hex").slice(0, 24)}`;
}

function counterAccountKey(value: string) {
  const secret = process.env.COUNTER_ACCOUNT_KEY_SECRET || getDatabaseUrl();
  return createHmac("sha256", secret).update(value).digest("hex").slice(0, 24);
}

function normalizeAccountIban(value: string) {
  const normalized = value.replace(/\s/g, "").toUpperCase();
  return normalized.replace(/(.{4})/g, "$1 ").trim();
}

function normalizeAccountAlias(value: string) {
  return value.replace(/\s/g, "").toUpperCase();
}

function dateString(value: Date | string | null) {
  if (!value) return undefined;
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
}

function dateTimeString(value: Date | string | null) {
  if (!value) return undefined;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function buildTransactionWhere(filters: TransactionSearchFilters) {
  const conditions: string[] = [];
  const values: unknown[] = [];

  function add(value: unknown) {
    values.push(value);
    return `$${values.length}`;
  }

  const queryText = filters.query?.trim();
  if (queryText) {
    const placeholder = add(`%${queryText.toLowerCase()}%`);
    conditions.push(`lower(concat_ws(' ', t.counterparty, t.counter_account, t.description, a.name, c.name, t.amount::text)) like ${placeholder}`);
  }

  if (filters.month && /^\d{4}-\d{2}$/.test(filters.month)) {
    const start = `${filters.month}-01`;
    const end = nextMonthStart(filters.month);
    conditions.push(`t.booked_at >= ${add(start)}::date`);
    conditions.push(`t.booked_at < ${add(end)}::date`);
  }

  if (filters.accountId && filters.accountId !== "alle") conditions.push(`t.account_id = ${add(filters.accountId)}`);
  if (filters.counterAccount && filters.counterAccount !== "alle") {
    conditions.push(`t.counter_account = ${add(filters.counterAccount)}`);
  }
  if (filters.categoryId === "geen") {
    conditions.push("t.category_id is null");
  } else if (filters.categoryId && filters.categoryId !== "alle") {
    conditions.push(`t.category_id = ${add(filters.categoryId)}`);
  }

  if (filters.kind === "uitgaven") {
    conditions.push("t.amount < 0");
    conditions.push("t.kind <> 'interne_overboeking'");
    conditions.push("t.category_id is distinct from 'sparen'");
    conditions.push("t.category_id is distinct from 'potje-opname'");
    conditions.push("t.category_id is distinct from 'ontsparen'");
    conditions.push("t.category_id is distinct from 'beleggen'");
  } else if (filters.kind && filters.kind !== "alle") {
    conditions.push(`t.kind = ${add(filters.kind)}`);
  }

  if (filters.minAmount != null) conditions.push(`abs(t.amount) >= ${add(filters.minAmount)}`);
  if (filters.maxAmount != null) conditions.push(`abs(t.amount) <= ${add(filters.maxAmount)}`);

  if (filters.review) {
    conditions.push("t.kind <> 'interne_overboeking'");
    conditions.push("(t.category_id is null or t.category_id in ('overig', 'overig-inkomen') or t.rule_applied is null)");
  }

  if (filters.pattern === "terugkerend") conditions.push("recurrence.evidence_count >= 2");
  if (filters.pattern === "afwijking") conditions.push("recurrence.evidence_count >= 3 and recurrence.average_amount > 0 and abs(abs(t.amount) - recurrence.average_amount) / recurrence.average_amount >= 0.4");
  if (filters.confidence === "high") conditions.push("recurrence.evidence_count >= 5");
  if (filters.confidence === "medium") conditions.push("recurrence.evidence_count between 3 and 4");
  if (filters.confidence === "low") conditions.push("recurrence.evidence_count = 2");

  return {
    sql: conditions.length ? `where ${conditions.join(" and ")}` : "",
    values,
  };
}

function transactionRecurrenceJoin() {
  return `left join (
    select regexp_replace(lower(coalesce(nullif(rt.counterparty, ''), nullif(rt.counter_account, ''), rt.description)), '[^a-z0-9]+', '', 'g') as recurrence_key,
           sign(rt.amount) as recurrence_sign,
           rt.kind as recurrence_kind,
           count(distinct to_char(rt.booked_at, 'YYYY-MM'))::int as evidence_count,
           avg(abs(rt.amount))::numeric as average_amount
    from transactions rt
    group by recurrence_key, recurrence_sign, recurrence_kind
  ) recurrence
    on recurrence.recurrence_key = regexp_replace(lower(coalesce(nullif(t.counterparty, ''), nullif(t.counter_account, ''), t.description)), '[^a-z0-9]+', '', 'g')
   and recurrence.recurrence_sign = sign(t.amount)
   and recurrence.recurrence_kind = t.kind`;
}

function transactionCategorySuggestionJoin() {
  return `left join lateral (
    with matched_history as (
      select
        ht.category_id,
        case
          when nullif(trim(t.counter_account), '') is not null and nullif(trim(ht.counter_account), '') = nullif(trim(t.counter_account), '') then 1
          else 2
        end as source_priority
      from transactions ht
      where ht.id <> t.id
        and ht.category_id is not null
        and ht.category_id not in ('overig', 'overig-inkomen')
        and ht.kind <> 'interne_overboeking'
        and sign(ht.amount) = sign(t.amount)
        and (
          (nullif(trim(t.counter_account), '') is not null and nullif(trim(ht.counter_account), '') = nullif(trim(t.counter_account), ''))
          or (
            regexp_replace(lower(coalesce(t.counterparty, '')), '[^a-z0-9]+', '', 'g') <> ''
            and regexp_replace(lower(coalesce(ht.counterparty, '')), '[^a-z0-9]+', '', 'g') = regexp_replace(lower(coalesce(t.counterparty, '')), '[^a-z0-9]+', '', 'g')
          )
        )
    ), preferred_history as (
      select *
      from matched_history
      where source_priority = (select min(source_priority) from matched_history)
    )
    select ranked.category_id as suggested_category_id,
           round(100.0 * ranked.evidence_count / nullif(sum(ranked.evidence_count) over (), 0))::int as suggestion_score,
           case when ranked.source_priority = 1 then 'Eerdere transacties met dezelfde tegenrekening' else 'Eerdere transacties van dezelfde tegenpartij' end as suggestion_reason
    from (
      select category_id, source_priority, count(*)::int as evidence_count
      from preferred_history
      group by category_id, source_priority
    ) ranked
    order by ranked.evidence_count desc, ranked.category_id
    limit 1
  ) category_suggestion on true`;
}

function transactionOrderBy(filters: TransactionSearchFilters) {
  const direction = filters.sortDirection === "asc" ? "asc" : "desc";
  const column: Record<TransactionSortField, string> = {
    date: "t.booked_at",
    amount: "t.amount",
    counterparty: "lower(coalesce(t.counterparty, t.description))",
    account: "lower(a.name)",
    category: "lower(coalesce(c.name, ''))",
  };
  return `${column[filters.sortBy ?? "date"]} ${direction}`;
}

function nextMonthStart(month: string) {
  const year = Number(month.slice(0, 4));
  const monthNumber = Number(month.slice(5, 7));
  const next = monthNumber === 12 ? { year: year + 1, month: 1 } : { year, month: monthNumber + 1 };
  return `${next.year}-${String(next.month).padStart(2, "0")}-01`;
}

export interface SavedFilter {
  id: string;
  name: string;
  filters: Record<string, string>;
  createdAt: string;
}

export type TransactionOptionalColumn = "account" | "counterAccount" | "status" | "correction";
export const DEFAULT_TRANSACTION_COLUMNS: TransactionOptionalColumn[] = ["account", "counterAccount", "status", "correction"];

export async function getTransactionColumnsFromDatabase(userId: string): Promise<TransactionOptionalColumn[]> {
  const result = await query<{ transaction_columns: unknown }>("select transaction_columns from user_ui_preferences where user_id = $1", [userId]);
  const value = result.rows[0]?.transaction_columns;
  if (!Array.isArray(value)) return DEFAULT_TRANSACTION_COLUMNS;
  return value.filter((column): column is TransactionOptionalColumn => DEFAULT_TRANSACTION_COLUMNS.includes(column as TransactionOptionalColumn));
}

export async function saveTransactionColumnsToDatabase(userId: string, columns: TransactionOptionalColumn[]) {
  await query(
    `insert into user_ui_preferences (user_id, transaction_columns)
     values ($1, $2::jsonb)
     on conflict (user_id) do update set transaction_columns = excluded.transaction_columns, updated_at = now()`,
    [userId, JSON.stringify(columns)],
  );
}

export async function getSavedFiltersFromDatabase(userId: string): Promise<SavedFilter[]> {
  const result = await query<{ id: string; name: string; filters: Record<string, string>; created_at: Date | string }>(
    `SELECT id, name, filters, created_at FROM saved_filters WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId],
  );
  if (!result?.rows) return [];
  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    filters: row.filters,
    createdAt: String(row.created_at),
  }));
}

export async function saveFilterToDatabase(input: { userId: string; name: string; filters: Record<string, string> }): Promise<string> {
  const id = `filter_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
  await query(
    `INSERT INTO saved_filters (id, user_id, name, filters) VALUES ($1, $2, $3, $4)`,
    [id, input.userId, input.name, JSON.stringify(input.filters)],
  );
  return id;
}

export async function deleteSavedFilter(input: { filterId: string; userId: string }): Promise<void> {
  await query(
    `DELETE FROM saved_filters WHERE id = $1 AND user_id = $2`,
    [input.filterId, input.userId],
  );
}
