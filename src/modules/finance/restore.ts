import type { PoolClient } from "pg";
import { getPool, query } from "@/server/db/pool";
import { BACKUP_CHECKSUM_ALGORITHM, backupDataChecksum, checksumJson } from "./backup-integrity";

const restoreTables = {
  accounts: ["id", "name", "iban", "bank", "type", "balance", "manual_balance", "opening_balance", "opening_balance_date", "balance_date", "balance_checked_at", "balance_source", "own_account", "last_import_at", "created_at", "archived_at"],
  account_balance_observations: ["id", "account_id", "observed_on", "observed_at", "balance", "source", "import_id"],
  categories: ["id", "name", "parent", "kind", "valid_from", "valid_to", "created_at"],
  imports: ["id", "source_bank", "filename", "file_hash", "transaction_count", "account_count", "imported_at"],
  transactions: ["id", "account_id", "import_id", "booked_at", "counterparty", "counter_account", "description", "amount", "category_id", "kind", "transaction_hash", "internal_transfer_group", "rule_applied", "created_at"],
  budgets: ["id", "month", "category_id", "planned_amount", "actual_amount", "rollover", "note", "exception_accepted", "created_at"],
  annual_budgets: ["id", "year", "category_id", "planned_amount", "created_at", "updated_at"],
  hidden_budget_items: ["month", "category_id", "created_at"],
  pots: ["id", "account_id", "name", "target_amount", "current_amount", "target_date", "monthly_reservation", "created_at"],
  fixed_expenses: ["id", "supplier", "category_id", "amount", "previous_amount", "frequency", "next_due_on", "valid_from", "valid_to", "created_at"],
  recurring_incomes: ["id", "label", "amount", "frequency", "next_expected_on", "valid_from", "valid_to", "created_at", "updated_at"],
  planned_cash_events: ["id", "label", "amount", "direction", "due_on", "account_id", "created_at", "updated_at"],
  forecast_event_skips: ["id", "event_key", "label", "occurrence_date", "created_at"],
  report_signal_statuses: ["period_type", "period", "signal_id", "status", "updated_by", "updated_at"],
  ignored_suggestions: ["id", "suggestion_type", "suggestion_key", "label", "reason", "created_at"],
  categorization_rules: ["id", "pattern", "match_scope", "category_id", "kind", "created_from_transaction_id", "active", "created_at"],
  audit_log: ["id", "actor_user_id", "event_type", "entity_type", "entity_id", "details", "created_at"],
} as const;

type RestoreTable = keyof typeof restoreTables;
type RestoreRow = Record<string, unknown>;

export const RESTORE_SECTIONS = {
  budgets: { label: "Budgetten", tables: ["budgets", "annual_budgets", "hidden_budget_items"] },
  planning: { label: "Planning en vaste lasten", tables: ["pots", "fixed_expenses", "recurring_incomes", "planned_cash_events", "forecast_event_skips"] },
  rules: { label: "Categorisatieregels", tables: ["categorization_rules", "ignored_suggestions"] },
  reports: { label: "Rapportstatussen", tables: ["report_signal_statuses"] },
  audit: { label: "Auditlog", tables: ["audit_log"] },
  all: { label: "Volledige back-up", tables: Object.keys(restoreTables) as RestoreTable[] },
} as const;

export type RestoreSection = keyof typeof RESTORE_SECTIONS;

const restoreKeys: Record<RestoreTable, readonly string[]> = {
  accounts: ["id"], account_balance_observations: ["id"], categories: ["id"], imports: ["id"], transactions: ["id"],
  budgets: ["month", "category_id"], annual_budgets: ["year", "category_id"], hidden_budget_items: ["month", "category_id"],
  pots: ["id"], fixed_expenses: ["id"], recurring_incomes: ["id"], planned_cash_events: ["id"], forecast_event_skips: ["id"],
  report_signal_statuses: ["period_type", "period", "signal_id"], ignored_suggestions: ["id"], categorization_rules: ["id"], audit_log: ["id"],
};

export interface RestoreSummary {
  application: string;
  schemaVersion: string;
  exportedAt: string;
  tables: Record<RestoreTable, { backupRows: number; currentRows: number; newRows: number; overwrittenRows: number; removedRows: number; selected: boolean }>;
  totalRows: number;
  selectedSections: RestoreSection[];
  checksum: string;
  integrity: "verified" | "legacy";
}

interface RestoreSnapshot {
  manifest: {
    application: string;
    schemaVersion: string;
    exportedAt: string;
    tables: Record<string, { rows: number; checksum?: string }>;
    checksumAlgorithm?: string;
    checksum?: string;
  };
  data: Record<string, RestoreRow[]>;
}

export function parseRestoreSections(values: FormDataEntryValue[]): RestoreSection[] {
  const sections = values.filter((value): value is RestoreSection => typeof value === "string" && value in RESTORE_SECTIONS);
  if (sections.includes("all")) return ["all"];
  return [...new Set(sections.length ? sections : ["all"])] as RestoreSection[];
}

export function restoreVerificationChecksum(checksum: string, sections: RestoreSection[]) {
  return checksumJson({ checksum, sections: [...sections].sort() });
}

export async function previewRestoreSnapshot(rawJson: string, selectedSections: RestoreSection[] = ["all"]): Promise<RestoreSummary> {
  const snapshot = parseRestoreSnapshot(rawJson);
  validateRestoreSnapshot(snapshot);
  return {
    application: snapshot.manifest.application,
    schemaVersion: snapshot.manifest.schemaVersion,
    exportedAt: snapshot.manifest.exportedAt,
    tables: await buildTableSummary(snapshot, selectedSections),
    totalRows: selectedTables(selectedSections).reduce((sum, table) => sum + snapshot.data[table].length, 0),
    selectedSections,
    checksum: snapshot.manifest.checksum ?? backupDataChecksum(snapshot.data),
    integrity: snapshot.manifest.checksum ? "verified" : "legacy",
  };
}

export async function restoreSnapshot(rawJson: string, selectedSections: RestoreSection[] = ["all"]): Promise<RestoreSummary> {
  const snapshot = parseRestoreSnapshot(rawJson);
  validateRestoreSnapshot(snapshot);
  const before = await buildTableSummary(snapshot, selectedSections);
  const tables = selectedTables(selectedSections);
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("begin");
    await deleteFinanceTables(client, tables);
    await insertFinanceTables(client, snapshot, tables);
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }

  return {
    application: snapshot.manifest.application,
    schemaVersion: snapshot.manifest.schemaVersion,
    exportedAt: snapshot.manifest.exportedAt,
    tables: before,
    totalRows: tables.reduce((sum, table) => sum + snapshot.data[table].length, 0),
    selectedSections,
    checksum: snapshot.manifest.checksum ?? backupDataChecksum(snapshot.data),
    integrity: snapshot.manifest.checksum ? "verified" : "legacy",
  };
}

function parseRestoreSnapshot(rawJson: string): RestoreSnapshot {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    throw new Error("Back-upbestand is geen geldige JSON.");
  }

  if (!parsed || typeof parsed !== "object") throw new Error("Back-upbestand heeft geen geldig objectformaat.");
  const candidate = parsed as Partial<RestoreSnapshot>;
  if (!candidate.manifest || typeof candidate.manifest !== "object") throw new Error("Manifest ontbreekt in back-upbestand.");
  if (!candidate.data || typeof candidate.data !== "object") throw new Error("Data ontbreekt in back-upbestand.");
  return candidate as RestoreSnapshot;
}

function validateRestoreSnapshot(snapshot: RestoreSnapshot) {
  if (snapshot.manifest.application !== "vdmeer-huishouden") throw new Error("Back-up hoort niet bij vdmeer-huishouden.");
  if (snapshot.manifest.schemaVersion !== "1") throw new Error(`Schema-versie ${snapshot.manifest.schemaVersion} wordt niet ondersteund.`);
  if (!snapshot.manifest.exportedAt) throw new Error("Exportdatum ontbreekt in manifest.");
  const originalChecksumMatches = !snapshot.manifest.checksum || snapshot.manifest.checksum === backupDataChecksum(snapshot.data);
  snapshot.data.hidden_budget_items ??= [];
  snapshot.data.ignored_suggestions ??= [];
  snapshot.data.recurring_incomes ??= [];
  snapshot.data.planned_cash_events ??= [];
  snapshot.data.forecast_event_skips ??= [];
  snapshot.data.report_signal_statuses ??= [];
  snapshot.data.annual_budgets ??= [];
  snapshot.data.account_balance_observations ??= [];
  for (const fixedExpense of snapshot.data.fixed_expenses ?? []) {
    fixedExpense.next_due_on ??= null;
  }
  for (const transaction of snapshot.data.transactions ?? []) {
    transaction.counter_account ??= null;
  }
  for (const budget of snapshot.data.budgets ?? []) {
    budget.note ??= null;
    budget.exception_accepted ??= false;
  }
  for (const rule of snapshot.data.categorization_rules ?? []) {
    rule.match_scope ??= "counterparty_description";
  }
  snapshot.manifest.tables ??= {};
  snapshot.manifest.tables.hidden_budget_items ??= { rows: snapshot.data.hidden_budget_items.length };
  snapshot.manifest.tables.ignored_suggestions ??= { rows: snapshot.data.ignored_suggestions.length };
  snapshot.manifest.tables.recurring_incomes ??= { rows: snapshot.data.recurring_incomes.length };
  snapshot.manifest.tables.planned_cash_events ??= { rows: snapshot.data.planned_cash_events.length };
  snapshot.manifest.tables.forecast_event_skips ??= { rows: snapshot.data.forecast_event_skips.length };
  snapshot.manifest.tables.report_signal_statuses ??= { rows: snapshot.data.report_signal_statuses.length };
  snapshot.manifest.tables.annual_budgets ??= { rows: snapshot.data.annual_budgets.length };
  snapshot.manifest.tables.account_balance_observations ??= { rows: snapshot.data.account_balance_observations.length };

  for (const table of restoreTableNames()) {
    const rows = snapshot.data[table];
    if (!Array.isArray(rows)) throw new Error(`Tabel ${table} ontbreekt in back-upbestand.`);
    const manifestRows = snapshot.manifest.tables?.[table]?.rows;
    if (manifestRows !== rows.length) throw new Error(`Manifest telt ${manifestRows ?? "geen"} rijen voor ${table}, maar data bevat ${rows.length}.`);
    const tableChecksum = snapshot.manifest.tables?.[table]?.checksum;
    if (tableChecksum && tableChecksum !== checksumJson(rows)) throw new Error(`Checksum van tabel ${table} klopt niet; het back-upbestand is gewijzigd of beschadigd.`);
  }
  if (snapshot.manifest.checksum) {
    if (snapshot.manifest.checksumAlgorithm !== BACKUP_CHECKSUM_ALGORITHM) throw new Error(`Checksum-algoritme ${snapshot.manifest.checksumAlgorithm ?? "onbekend"} wordt niet ondersteund.`);
    if (!originalChecksumMatches) throw new Error("Checksum van de volledige back-up klopt niet; het bestand is gewijzigd of beschadigd.");
  }
}

async function buildTableSummary(snapshot: RestoreSnapshot, sections: RestoreSection[]): Promise<RestoreSummary["tables"]> {
  const selected = new Set(selectedTables(sections));
  const entries = await Promise.all(
    restoreTableNames().map(async (table) => {
      const keys = restoreKeys[table];
      const result = await query<Record<string, unknown>>(`select ${keys.join(", ")} from ${table}`);
      const current = new Set(result.rows.map((row) => rowKey(keys, row)));
      const backup = new Set(snapshot.data[table].map((row) => rowKey(keys, row)));
      const overwrittenRows = [...backup].filter((key) => current.has(key)).length;
      return [table, {
        backupRows: backup.size,
        currentRows: current.size,
        newRows: [...backup].filter((key) => !current.has(key)).length,
        overwrittenRows,
        removedRows: [...current].filter((key) => !backup.has(key)).length,
        selected: selected.has(table),
      }] as const;
    }),
  );
  return Object.fromEntries(entries) as RestoreSummary["tables"];
}

async function deleteFinanceTables(client: PoolClient, selected: RestoreTable[]) {
  const selectedSet = new Set(selected);
  for (const table of ["audit_log", "report_signal_statuses", "forecast_event_skips", "planned_cash_events", "categorization_rules", "ignored_suggestions", "recurring_incomes", "fixed_expenses", "pots", "hidden_budget_items", "annual_budgets", "budgets", "account_balance_observations", "transactions", "imports", "categories", "accounts"] as RestoreTable[]) {
    if (selectedSet.has(table)) await client.query(`delete from ${table}`);
  }
}

async function insertFinanceTables(client: PoolClient, snapshot: RestoreSnapshot, selected: RestoreTable[]) {
  const selectedSet = new Set(selected);
  for (const table of ["accounts", "categories", "imports", "transactions", "account_balance_observations", "budgets", "annual_budgets", "hidden_budget_items", "pots", "fixed_expenses", "recurring_incomes", "planned_cash_events", "forecast_event_skips", "ignored_suggestions", "categorization_rules", "report_signal_statuses", "audit_log"] as RestoreTable[]) {
    if (!selectedSet.has(table)) continue;
    const columns = restoreTables[table];
    for (const row of snapshot.data[table]) {
      const values = columns.map((column) => normalizeRestoreValue(table, column, row[column]));
      const placeholders = values.map((_, index) => `$${index + 1}`).join(", ");
      await client.query(`insert into ${table} (${columns.join(", ")}) values (${placeholders})`, values);
    }
  }
}

function normalizeRestoreValue(table: RestoreTable, column: string, value: unknown) {
  if (table === "audit_log" && column === "details") return JSON.stringify(value ?? {});
  if (table === "audit_log" && column === "actor_user_id") return null;
  if (table === "pots" && column === "account_id") return value ?? null;
  if (table === "planned_cash_events" && column === "account_id") return value ?? null;
  if (table === "report_signal_statuses" && column === "updated_by") return null;
  return value ?? null;
}

function restoreTableNames() {
  return Object.keys(restoreTables) as RestoreTable[];
}

function selectedTables(sections: RestoreSection[]) {
  const tables = sections.flatMap((section) => [...RESTORE_SECTIONS[section].tables]);
  return [...new Set(tables)] as RestoreTable[];
}

function rowKey(columns: readonly string[], row: RestoreRow) {
  return columns.map((column) => String(row[column] ?? "")).join("\u001f");
}
