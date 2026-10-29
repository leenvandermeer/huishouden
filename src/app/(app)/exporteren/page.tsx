import { Download, FileJson, RotateCcw, Table } from "lucide-react";
import { Button, ButtonLink, FieldHint, FieldLabel, Input, PageHeader, StatusBadge, type StatItem } from "@/components/ui";
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
        <section className="border border-border bg-[var(--color-panel-strong)] p-5 md:p-6">
          <StatusBadge tone="warning">Alleen-lezen</StatusBadge>
          <p className="mt-3 text-sm text-[var(--color-text-muted)]">Vraag een eigenaar of beheerder om een JSON back-up of CSV export te maken.</p>
        </section>
      </>
    );
  }
  const [snapshot, readiness] = await Promise.all([getExportSnapshot("json"), getBackupReadiness()]);
  const rows = Object.entries(snapshot.manifest.tables);
  const canRestore = user.role === "owner";
  const totalRows = rows.reduce((sum, [, info]) => sum + info.rows, 0);

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
        stats={[
          backupStat("Laatste back-up", readiness.lastBackupAt ? formatDate(readiness.lastBackupAt) : "Nog niet gemaakt", readiness.backupStatus),
          backupStat("Laatste dry-run", readiness.lastDryRunAt ? formatDate(readiness.lastDryRunAt) : "Nog niet getest", readiness.rehearsalStatus),
          backupStat("Laatste herstel", readiness.lastRestoreAt ? formatDate(readiness.lastRestoreAt) : "Nog nooit nodig", readiness.lastRestoreAt ? "good" : "attention"),
          { label: "Rijen in back-up", value: totalRows.toLocaleString("nl-NL"), detail: `${rows.length} tabellen` },
        ]}
      />

      <section className="mb-12 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="min-w-0">
          <div className="section-head">
            <h2>Manifest</h2>
            <p>Aantallen per tabel in een volledige back-up.</p>
          </div>
          <div className="table-responsive">
            <table className="w-full min-w-[32rem] border-collapse border-t border-[var(--color-text)] text-left text-sm">
              <thead className="border-b border-border text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
                <tr>
                  <th className="px-1 py-3 font-normal">Tabel</th>
                  <th className="px-1 py-3 text-right font-normal">Rijen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map(([table, info]) => (
                  <tr key={table}>
                    <td className="px-1 py-2.5 text-[var(--color-text)]">{table}</td>
                    <td className="money-value px-1 py-2.5 text-right text-[var(--color-text-muted)]">{info.rows.toLocaleString("nl-NL")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="self-start border border-border bg-[var(--color-panel-strong)] p-5 md:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className={CARD_LABEL}>Wat zit erin?</h2>
            <StatusBadge tone="success">Manifest v1</StatusBadge>
          </div>
          <ul className="mt-4 space-y-2 border-t border-border pt-4 text-sm leading-6 text-[var(--color-text-muted)]">
            <li>Rekeningen, categorieen, transacties, budgetten, spaarrekeningmutaties en vaste lasten.</li>
            <li>Importhistorie, categorisatieregels en auditlog.</li>
            <li>Exportdatum, schema-versie en aantallen per tabel.</li>
          </ul>
          <ButtonLink href="/api/export?format=json" variant="primary" className="mt-5 w-full">
            <Download aria-hidden="true" size={14} /> Download volledige back-up
          </ButtonLink>
        </aside>
      </section>

      <section className="mb-12">
        <div className="section-head">
          <h2>Restore vanuit JSON back-up</h2>
          <p>Controleer een back-up eerst met een dry-run voordat je gegevens vervangt.</p>
        </div>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          {canRestore ? (
          <form action="/api/restore" method="post" encType="multipart/form-data" className="border border-border border-t-[var(--color-text)] bg-[var(--color-panel-strong)] p-5 md:p-6">
            {restoreStatus ? (
              <div className="mb-4 border border-border bg-[var(--color-surface)] p-4 text-xs leading-5 text-[var(--color-text-muted)]">
                {restoreStatus === "dry-run-ok" ? <StatusBadge tone="success">Dry-run akkoord</StatusBadge> : null}
                {restoreStatus === "hersteld" ? <StatusBadge tone="success">Restore uitgevoerd</StatusBadge> : null}
                {restoreStatus === "fout" ? <StatusBadge tone="warning">Restore fout</StatusBadge> : null}
                {restoreStatus === "geen-rechten" ? <StatusBadge tone="warning">Geen rechten</StatusBadge> : null}
                {restoreRows ? <p className="mt-2">Back-up bevat {restoreRows} rijen. Exportdatum: {restoreExportedAt ?? "onbekend"}.</p> : null}
                {restoreOverwrite ? <p className="mt-2"><strong>Conflictpreview:</strong> {restoreNew ?? "0"} nieuw, {restoreOverwrite} wordt overschreven en {restoreRemove ?? "0"} verdwijnt. Selectie: {restoredSections ?? "volledig"}.</p> : null}
                {restoreMessage ? <p className="mt-2 text-[var(--color-warning)]">{restoreMessage}</p> : null}
              </div>
            ) : null}
            <FieldLabel htmlFor="backupFile">JSON back-upbestand</FieldLabel>
            <Input id="backupFile" name="backupFile" type="file" accept="application/json,.json" required />
            <div className="mt-4">
              <FieldLabel htmlFor="restoreSection">Wat wil je herstellen?</FieldLabel>
              <select id="restoreSection" name="sections" defaultValue="all" className="min-h-10 w-full rounded-md border border-border bg-[var(--color-panel-strong)] px-3 text-sm text-[var(--color-text)]">
                {Object.entries(RESTORE_SECTIONS).map(([value, section]) => <option key={value} value={value}>{section.label}</option>)}
              </select>
            </div>
            <FieldHint>Dry-run valideert checksums en toont hoeveel rijen nieuw zijn, worden overschreven of verdwijnen. Alleen exact hetzelfde bestand én dezelfde selectie kan daarna binnen 30 minuten worden hersteld.</FieldHint>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button type="submit" name="mode" value="dry-run" variant="secondary">
                <FileJson aria-hidden="true" size={14} /> Dry-run controleren
              </Button>
              <Button type="submit" name="mode" value="restore" variant="danger">
                <RotateCcw aria-hidden="true" size={14} /> Restore uitvoeren
              </Button>
            </div>
          </form>
          ) : (
            <div className="border border-border border-t-[var(--color-text)] bg-[var(--color-panel-strong)] p-5 md:p-6">
              {restoreStatus ? (
                <div className="mb-4 border border-border bg-[var(--color-surface)] p-4 text-xs leading-5 text-[var(--color-text-muted)]">
                  {restoreStatus === "geen-rechten" ? <StatusBadge tone="warning">Geen rechten</StatusBadge> : null}
                  {restoreMessage ? <p className="mt-2 text-[var(--color-warning)]">{restoreMessage}</p> : null}
                </div>
              ) : null}
              <StatusBadge tone="warning">Alleen eigenaar</StatusBadge>
              <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">Export downloaden mag als beheerder; restore is beperkt tot eigenaar omdat dit finance-data vervangt.</p>
            </div>
          )}
          <aside className="self-start border border-border bg-[var(--color-surface)] p-5 text-sm leading-6 text-[var(--color-text-muted)] md:p-6">
            <h3 className={CARD_LABEL}>Wat gebeurt er?</h3>
            <ul className="mt-4 space-y-2 border-t border-border pt-4">
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

const CARD_LABEL = "text-[0.62rem] font-normal uppercase tracking-[0.22em] text-[var(--color-text-muted)]";

function backupStat(label: string, value: string, status: "good" | "attention" | "missing"): StatItem {
  const statusLabel = status === "good" ? "In orde" : status === "attention" ? "Controleren" : "Actie nodig";
  return { label, value, detail: statusLabel, tone: status === "missing" ? "risk" : undefined };
}
