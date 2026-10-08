import { appUrl } from "@/lib/http/redirect-url";
import { assertUploadedFilesWithinLimit, noStoreRedirect } from "@/lib/http/security";
import { getCurrentUser } from "@/modules/auth/service";
import { parseRestoreSections, previewRestoreSnapshot, restoreSnapshot, restoreVerificationChecksum } from "@/modules/finance/restore";
import { writeAuditLog } from "@/modules/finance/repository";
import { query } from "@/server/db/pool";
import { randomUUID } from "node:crypto";

const maxRestoreBytes = 25 * 1024 * 1024;

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const redirectUrl = appUrl("/exporteren", request);
  if (!user) return noStoreRedirect(appUrl("/inloggen", request));
  if (user.role !== "owner") {
    redirectUrl.searchParams.set("restore", "geen-rechten");
    return noStoreRedirect(redirectUrl);
  }

  try {
    const formData = await request.formData();
    const file = formData.get("backupFile");
    const mode = formData.get("mode") === "restore" ? "restore" : "dry-run";
    const sections = parseRestoreSections(formData.getAll("sections"));
    if (!(file instanceof File) || file.size === 0) throw new Error("Kies eerst een JSON back-upbestand.");
    assertUploadedFilesWithinLimit([file], { maxFileBytes: maxRestoreBytes, maxTotalBytes: maxRestoreBytes });

    const rawJson = await file.text();
    const preview = await previewRestoreSnapshot(rawJson, sections);
    const verificationChecksum = restoreVerificationChecksum(preview.checksum, sections);
    if (mode === "restore") {
      const verified = await query<{ id: string }>(
        `update restore_dry_runs
         set used_at = now()
         where id = (
           select id from restore_dry_runs
           where user_id = $1 and backup_checksum = $2 and used_at is null and expires_at > now()
           order by verified_at desc limit 1
         )
         returning id`,
        [user.id, verificationChecksum],
      );
      if (!verified.rows[0]) throw new Error("Voer eerst een dry-run uit met exact dit back-upbestand. De controle blijft 30 minuten geldig.");
    } else {
      await query(
        `insert into restore_dry_runs (id, user_id, backup_checksum, expires_at)
         values ($1, $2, $3, now() + interval '30 minutes')`,
        [`rdr_${randomUUID()}`, user.id, verificationChecksum],
      );
    }
    const summary = mode === "restore" ? await restoreSnapshot(rawJson, sections) : preview;

    await writeAuditLog({
      actorUserId: user.id,
      eventType: mode === "restore" ? "restore.executed" : "restore.validated",
      entityType: "restore",
      entityId: file.name,
      details: {
        fileName: file.name,
        totalRows: summary.totalRows,
        exportedAt: summary.exportedAt,
        schemaVersion: summary.schemaVersion,
        checksum: summary.checksum,
        integrity: summary.integrity,
        selectedSections: summary.selectedSections,
        tables: summary.tables,
      },
    });

    redirectUrl.searchParams.set("restore", mode === "restore" ? "hersteld" : "dry-run-ok");
    redirectUrl.searchParams.set("rows", String(summary.totalRows));
    redirectUrl.searchParams.set("exportedAt", summary.exportedAt.slice(0, 10));
    const selectedTables = Object.values(summary.tables).filter((table) => table.selected);
    redirectUrl.searchParams.set("new", String(selectedTables.reduce((sum, table) => sum + table.newRows, 0)));
    redirectUrl.searchParams.set("overwrite", String(selectedTables.reduce((sum, table) => sum + table.overwrittenRows, 0)));
    redirectUrl.searchParams.set("remove", String(selectedTables.reduce((sum, table) => sum + table.removedRows, 0)));
    redirectUrl.searchParams.set("sections", summary.selectedSections.join(","));
  } catch (error) {
    redirectUrl.searchParams.set("restore", "fout");
    redirectUrl.searchParams.set("message", error instanceof Error ? error.message : "Restore is mislukt.");
  }

  return noStoreRedirect(redirectUrl);
}
