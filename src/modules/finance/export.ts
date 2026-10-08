import { query } from "@/server/db/pool";
import { encodeExcelCsv } from "@/lib/csv";
import { FINANCIAL_CONTRACT_VERSION } from "./financial-contract";
import { CSV_PRODUCT_VERSION } from "./csv-product-contract";
import { BACKUP_CHECKSUM_ALGORITHM, backupDataChecksum, checksumJson } from "./backup-integrity";

type ExportFormat = "json" | "csv";

interface ExportRow extends Record<string, unknown> {}

interface ExportManifest {
  exportedAt: string;
  format: ExportFormat;
  schemaVersion: "1";
  calculationVersion: typeof FINANCIAL_CONTRACT_VERSION;
  application: "vdmeer-huishouden";
  checksumAlgorithm: typeof BACKUP_CHECKSUM_ALGORITHM;
  checksum: string;
  tables: Record<string, { rows: number; checksum: string }>;
}

const tableQueries = {
  accounts: "select id, name, iban, bank, type, balance, manual_balance, opening_balance, opening_balance_date, balance_date, balance_checked_at, balance_source, own_account, last_import_at, created_at, archived_at from accounts order by name",
  account_balance_observations: "select id, account_id, observed_on, observed_at, balance, source, import_id from account_balance_observations order by account_id, observed_on, observed_at",
  categories: "select id, name, parent, kind, valid_from, valid_to, created_at from categories order by parent nulls first, name",
  transactions:
    "select id, account_id, import_id, booked_at, counterparty, counter_account, description, amount, category_id, kind, transaction_hash, internal_transfer_group, rule_applied, created_at from transactions order by booked_at desc, created_at desc",
  budgets: "select id, month, category_id, planned_amount, actual_amount, rollover, note, exception_accepted, created_at from budgets order by month desc, category_id",
  annual_budgets: "select id, year, category_id, planned_amount, created_at, updated_at from annual_budgets order by year desc, category_id",
  hidden_budget_items: "select month, category_id, created_at from hidden_budget_items order by month desc, category_id",
  pots: "select id, account_id, name, target_amount, current_amount, target_date, monthly_reservation, created_at from pots order by account_id nulls last, name",
  fixed_expenses: "select id, supplier, category_id, amount, previous_amount, frequency, next_due_on, valid_from, valid_to, created_at from fixed_expenses order by supplier",
  recurring_incomes: "select id, label, amount, frequency, next_expected_on, valid_from, valid_to, created_at, updated_at from recurring_incomes order by label",
  planned_cash_events: "select id, label, amount, direction, due_on, account_id, created_at, updated_at from planned_cash_events order by due_on, label",
  forecast_event_skips: "select id, event_key, label, occurrence_date, created_at from forecast_event_skips order by occurrence_date, label",
  report_signal_statuses: "select period_type, period, signal_id, status, updated_by, updated_at from report_signal_statuses order by period_type, period desc, signal_id",
  ignored_suggestions: "select id, suggestion_type, suggestion_key, label, reason, created_at from ignored_suggestions order by created_at desc",
  categorization_rules: "select id, pattern, match_scope, category_id, kind, created_from_transaction_id, active, created_at from categorization_rules order by active desc, created_at desc",
  imports: "select id, source_bank, filename, file_hash, transaction_count, account_count, imported_at from imports order by imported_at desc",
  audit_log: "select id, actor_user_id, event_type, entity_type, entity_id, details, created_at from audit_log order by created_at desc",
} as const;

export async function getExportSnapshot(format: ExportFormat) {
  const data = Object.fromEntries(
    await Promise.all(
      Object.entries(tableQueries).map(async ([table, sql]) => {
        const result = await query(sql);
        return [table, result.rows.map(normalizeRow)];
      }),
    ),
  ) as Record<keyof typeof tableQueries, ExportRow[]>;

  const manifest: ExportManifest = {
    exportedAt: new Date().toISOString(),
    format,
    schemaVersion: "1",
    calculationVersion: FINANCIAL_CONTRACT_VERSION,
    application: "vdmeer-huishouden",
    checksumAlgorithm: BACKUP_CHECKSUM_ALGORITHM,
    checksum: backupDataChecksum(data),
    tables: Object.fromEntries(Object.entries(data).map(([table, rows]) => [table, { rows: rows.length, checksum: checksumJson(rows) }])),
  };

  return { manifest, data };
}

export function toExportJson(snapshot: Awaited<ReturnType<typeof getExportSnapshot>>) {
  return JSON.stringify(snapshot, null, 2);
}

export function toTransactionCsv(snapshot: Awaited<ReturnType<typeof getExportSnapshot>>) {
  const manifestRows = [
    ["# application", snapshot.manifest.application],
    ["# exported_at", snapshot.manifest.exportedAt],
    ["# schema_version", snapshot.manifest.schemaVersion],
    ["# calculation_contract", snapshot.manifest.calculationVersion],
    ["# csv_product_version", CSV_PRODUCT_VERSION],
    ["# transactions", String(snapshot.manifest.tables.transactions.rows)],
  ];
  const headers = ["id", "account_id", "booked_at", "counterparty", "counter_account", "description", "amount", "category_id", "kind", "internal_transfer_group", "rule_applied"];
  const rows = snapshot.data.transactions.map((row) => headers.map((header) => normalizeCsvValue(row[header])));
  return encodeExcelCsv([...manifestRows, headers, ...rows]);
}

function normalizeRow(row: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => {
      if (value instanceof Date) return [key, value.toISOString()];
      return [key, value];
    }),
  );
}

function normalizeCsvValue(value: unknown) {
  if (value == null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  return JSON.stringify(value);
}
