import { query } from "@/server/db/pool";

export interface BackupReadiness {
  lastBackupAt?: string;
  lastDryRunAt?: string;
  lastRestoreAt?: string;
  backupStatus: "good" | "attention" | "missing";
  rehearsalStatus: "good" | "attention" | "missing";
}

export async function getBackupReadiness(): Promise<BackupReadiness> {
  const result = await query<{ event_type: string; created_at: Date | string }>(
    `select distinct on (event_type) event_type, created_at
     from audit_log
     where event_type in ('export.created', 'restore.validated', 'restore.executed')
     order by event_type, created_at desc`,
  );
  const dates = new Map(result.rows.map((row) => [row.event_type, toIso(row.created_at)]));
  const lastBackupAt = dates.get("export.created");
  const lastDryRunAt = dates.get("restore.validated");
  const lastRestoreAt = dates.get("restore.executed");
  return {
    lastBackupAt,
    lastDryRunAt,
    lastRestoreAt,
    backupStatus: ageStatus(lastBackupAt, 7, 30),
    rehearsalStatus: ageStatus(lastDryRunAt, 90, 180),
  };
}

function ageStatus(value: string | undefined, goodDays: number, attentionDays: number): BackupReadiness["backupStatus"] {
  if (!value) return "missing";
  const ageDays = (Date.now() - Date.parse(value)) / 86_400_000;
  return ageDays <= goodDays ? "good" : ageDays <= attentionDays ? "attention" : "missing";
}

function toIso(value: Date | string) {
  return value instanceof Date ? value.toISOString() : String(value);
}
