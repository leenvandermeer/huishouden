import { DatabaseBackup, Download, FileJson, RotateCcw, Table } from "lucide-react";
import { Button, ButtonLink, FieldHint, FieldLabel, Input, PageHeader, StatusBadge } from "@/components/ui";
import { requireUser } from "@/modules/auth/service";
import { getExportSnapshot } from "@/modules/finance/export";
import { getBackupReadiness } from "@/modules/finance/backup-readiness";
import { RESTORE_SECTIONS } from "@/modules/finance/restore";
import { formatDate } from "@/lib/format";

export default async function ExportPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser();
  const params = (await searchParams) ?? {};
  const restoreStatus = typeof params.restore === "string" ? params.restore : undefined;
  const restoreRows = typeof params.rows === "string" ? params.rows : undefined;
  const restoreExportedAt = typeof params.exportedAt === "string" ? params.exportedAt : undefined;
  const restoreMessage = typeof params.message === "string" ? params.message : undefined;
  const restoreNew = typeof params.new === "string" ? params.new : undefined;
  const restoreOverwrite = typeof params.overwrite === "string" ? params.overwrite : undefined;
  const restoreRemove = typeof params.remove === "string" ? params.remove : undefined;
  const restoredSections = typeof params.sections === "string" ? params.sections : undefined;
  if (user.role === "readonly") {
    return (
      <>
        <PageHeader eyebrow="Bewaren" title="Back-up downloaden" description="Alleen een eigenaar of beheerder kan dit doen." />
        <section className="rounded-[var(--radius-lg)] border border-border bg-white p-4">
          <StatusBadge tone="warning">Alleen-lezen</StatusBadge>
          <p className="mt-3 text-sm text-[var(--color-text-muted)]">Vraag een eigenaar of beheerder om een JSON back-up of CSV export te maken.</p>
        </section>
      </>
    );
  }
  const [snapshot, readiness] = await Promise.all([getExportSnapshot("json"), getBackupReadiness()]);
  const rows = Object.entries(snapshot.manifest.tables);
  const canRestore = user.role === "owner";

  return (
    <>
      <PageHeader
        eyebrow="Bewaren"
        title="Back-up downloaden"
        description="Bewaar een volledige kopie of download alleen je transacties."
        actions={
          <div className="flex flex-wrap gap-2">
            <ButtonLink href="/api/export?format=json" variant="primary">
              <FileJson aria-hidden="true" size={14} /> JSON back-up
            </ButtonLink>
            <ButtonLink href="/api/export?format=csv" variant="secondary">
              <Table aria-hidden="true" size={14} /> CSV transacties
            </ButtonLink>
          </div>
        }
      />

      <section className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="rounded-[var(--radius-lg)] border border-border bg-white shadow-[var(--shadow-sm)]">
          <div className="border-b border-border px-3 py-2">
            <h2 className="text-xs font-semibold text-brand">Manifest</h2>
          </div>
          <div className="table-responsive">
            <table className="w-full min-w-[32rem] border-collapse text-left text-xs">
              <thead className="border-b border-border bg-[var(--color-surface)] text-[var(--color-text-subtle)]">
                <tr>
                  <th className="px-3 py-2">Tabel</th>
                  <th className="px-3 py-2 text-right">Rijen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map(([table, info]) => (
                  <tr key={table}>
                    <td className="px-3 py-2 font-medium">{table}</td>
                    <td className="px-3 py-2 text-right">{info.rows}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="rounded-[var(--radius-lg)] border border-border bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-md bg-[var(--color-brand-subtle)] text-brand">
              <DatabaseBackup aria-hidden="true" size={18} />
            </span>
            <StatusBadge tone="success">Manifest v1</StatusBadge>
          </div>
          <h2 className="mt-3 text-sm font-semibold text-brand">Wat zit erin?</h2>
          <ul className="mt-3 space-y-2 text-xs leading-5 text-[var(--color-text-muted)]">
            <li>Rekeningen, categorieen, transacties, budgetten, spaarrekeningmutaties en vaste lasten.</li>
            <li>Importhistorie, categorisatieregels en auditlog.</li>
            <li>Exportdatum, schema-versie en aantallen per tabel.</li>
          </ul>
          <ButtonLink href="/api/export?format=json" variant="primary" className="mt-4 w-full">
            <Download aria-hidden="true" size={14} /> Download volledige back-up
          </ButtonLink>
        </aside>
      </section>

      <section className="mt-3 grid gap-3 sm:grid-cols-3" aria-label="Back-upcontrole">
        <BackupStatus title="Laatste volledige back-up" value={readiness.lastBackupAt ? formatDate(readiness.lastBackupAt) : "Nog niet gemaakt"} status={readiness.backupStatus} />
        <BackupStatus title="Laatste geslaagde dry-run" value={readiness.lastDryRunAt ? formatDate(readiness.lastDryRunAt) : "Nog niet getest"} status={readiness.rehearsalStatus} />
        <BackupStatus title="Laatste herstel" value={readiness.lastRestoreAt ? formatDate(readiness.lastRestoreAt) : "Nog nooit nodig geweest"} status={readiness.lastRestoreAt ? "good" : "attention"} />
      </section>

      <section className="mt-3 rounded-[var(--radius-lg)] border border-border bg-white shadow-[var(--shadow-sm)]">
        <div className="border-b border-border px-3 py-2">
          <h2 className="text-xs font-semibold text-brand">Restore vanuit JSON back-up</h2>
        </div>
        <div className="grid gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_20rem]">
          {canRestore ? (
          <form action="/api/restore" method="post" encType="multipart/form-data" className="rounded-md border border-border bg-[var(--color-surface)] p-3">
            {restoreStatus ? (
              <div className="mb-3 rounded-md border border-border bg-white p-3 text-xs text-[var(--color-text-muted)]">
                {restoreStatus === "dry-run-ok" ? <StatusBadge tone="success">Dry-run akkoord</StatusBadge> : null}
                {restoreStatus === "hersteld" ? <StatusBadge tone="success">Restore uitgevoerd</StatusBadge> : null}
                {restoreStatus === "fout" ? <StatusBadge tone="warning">Restore fout</StatusBadge> : null}
                {restoreStatus === "geen-rechten" ? <StatusBadge tone="warning">Geen rechten</StatusBadge> : null}
                {restoreRows ? <p className="mt-2">Back-up bevat {restoreRows} rijen. Exportdatum: {restoreExportedAt ?? "onbekend"}.</p> : null}
                {restoreOverwrite ? <p className="mt-2"><strong>Conflictpreview:</strong> {restoreNew ?? "0"} nieuw, {restoreOverwrite} wordt overschreven en {restoreRemove ?? "0"} verdwijnt. Selectie: {restoredSections ?? "volledig"}.</p> : null}
                {restoreMessage ? <p className="mt-2 text-amber-800">{restoreMessage}</p> : null}
              </div>
            ) : null}
            <FieldLabel htmlFor="backupFile">JSON back-upbestand</FieldLabel>
            <Input id="backupFile" name="backupFile" type="file" accept="application/json,.json" required />
            <div className="mt-3">
              <FieldLabel htmlFor="restoreSection">Wat wil je herstellen?</FieldLabel>
              <select id="restoreSection" name="sections" defaultValue="all" className="min-h-10 w-full rounded-md border border-border bg-white px-3 text-sm text-[var(--color-text)]">
                {Object.entries(RESTORE_SECTIONS).map(([value, section]) => <option key={value} value={value}>{section.label}</option>)}
              </select>
            </div>
            <FieldHint>Dry-run valideert checksums en toont hoeveel rijen nieuw zijn, worden overschreven of verdwijnen. Alleen exact hetzelfde bestand én dezelfde selectie kan daarna binnen 30 minuten worden hersteld.</FieldHint>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="submit" name="mode" value="dry-run" variant="secondary">
                <FileJson aria-hidden="true" size={14} /> Dry-run controleren
              </Button>
              <Button type="submit" name="mode" value="restore" variant="danger">
                <RotateCcw aria-hidden="true" size={14} /> Restore uitvoeren
              </Button>
            </div>
          </form>
          ) : (
            <div className="rounded-md border border-border bg-[var(--color-surface)] p-3">
              {restoreStatus ? (
                <div className="mb-3 rounded-md border border-border bg-white p-3 text-xs text-[var(--color-text-muted)]">
                  {restoreStatus === "geen-rechten" ? <StatusBadge tone="warning">Geen rechten</StatusBadge> : null}
                  {restoreMessage ? <p className="mt-2 text-amber-800">{restoreMessage}</p> : null}
                </div>
              ) : null}
              <StatusBadge tone="warning">Alleen eigenaar</StatusBadge>
              <p className="mt-2 text-xs leading-5 text-[var(--color-text-muted)]">Export downloaden mag als beheerder; restore is beperkt tot eigenaar omdat dit finance-data vervangt.</p>
            </div>
          )}
          <aside className="rounded-md border border-border bg-white p-3 text-xs leading-5 text-[var(--color-text-muted)]">
            <h3 className="font-semibold text-brand">Wat gebeurt er?</h3>
            <ul className="mt-2 space-y-1">
              <li>Alleen de gekozen gegevensgroep wordt vervangen; een volledige restore blijft beschikbaar.</li>
              <li>Gebruikers en actieve sessies blijven bestaan.</li>
              <li>De restore draait in een database-transactie.</li>
              <li>Dry-run en restore worden vastgelegd in het auditlog.</li>
            </ul>
          </aside>
        </div>
      </section>
    </>
  );
}

function BackupStatus({ title, value, status }: { title: string; value: string; status: "good" | "attention" | "missing" }) {
  return <article className="rounded-[var(--radius-lg)] border border-border bg-white p-3"><StatusBadge tone={status === "good" ? "success" : status === "attention" ? "info" : "warning"}>{status === "good" ? "In orde" : status === "attention" ? "Controleren" : "Actie nodig"}</StatusBadge><h2 className="mt-2 text-sm font-semibold text-brand">{title}</h2><p className="mt-1 text-xs text-[var(--color-text-muted)]">{value}</p></article>;
}
