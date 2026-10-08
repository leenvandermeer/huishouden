import { Clock3, ShieldCheck } from "lucide-react";
import { PageHeader, StatusBadge } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { requireMutableUser } from "@/modules/auth/service";
import { getAuditLog } from "@/modules/finance/repository";

export default async function AuditPage() {
  await requireMutableUser();
  const entries = await getAuditLog(150);

  return (
    <>
      <PageHeader
        eyebrow="Geschiedenis"
        title="Eerdere wijzigingen"
        description="Bekijk wat er is aangepast en door wie."
      />

      <section className="rounded-[var(--radius-lg)] border border-border bg-white shadow-[var(--shadow-sm)]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2">
          <h2 className="text-xs font-semibold text-brand">Laatste {entries.length} gebeurtenissen</h2>
          <StatusBadge tone="success"><ShieldCheck aria-hidden="true" size={12} /> Gegevenslog</StatusBadge>
        </div>
        <div className="table-responsive">
          <table className="w-full min-w-[64rem] border-collapse text-left text-xs">
            <thead className="border-b border-border bg-[var(--color-surface)] text-[var(--color-text-subtle)]">
              <tr>
                <th className="px-3 py-2">Datum</th>
                <th className="px-3 py-2">Gebruiker</th>
                <th className="px-3 py-2">Actie</th>
                <th className="px-3 py-2">Object</th>
                <th className="px-3 py-2">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-[var(--color-surface)]">
                  <td className="px-3 py-2">
                    <span className="flex items-center gap-1.5">
                      <Clock3 aria-hidden="true" size={13} className="text-[var(--color-text-subtle)]" />
                      {formatDate(entry.createdAt)}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <strong className="block">{entry.actorName ?? "Systeem"}</strong>
                    {entry.actorEmail ? <span className="text-[var(--color-text-subtle)]">{entry.actorEmail}</span> : null}
                  </td>
                  <td className="px-3 py-2"><StatusBadge tone="info">{auditActionLabel(entry.eventType)}</StatusBadge></td>
                  <td className="px-3 py-2">
                    <strong>{auditObjectLabel(entry.entityType)}</strong>
                    {entry.entityId ? <span className="ml-1 text-[var(--color-text-subtle)]">{entry.entityId}</span> : null}
                  </td>
                  <td className="max-w-[24rem] truncate px-3 py-2 text-[var(--color-text-muted)]">{formatAuditDetails(entry.details)}</td>
                </tr>
              ))}
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-xs text-[var(--color-text-muted)]">Nog geen auditregels vastgelegd.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function formatAuditDetails(details: Record<string, unknown>) {
  const redacted = Object.fromEntries(
    Object.entries(details).map(([key, value]) => [key, isSensitiveAuditKey(key) ? "[afgeschermd]" : value]),
  );
  const entries = Object.entries(redacted).filter(([, value]) => value !== null && value !== undefined && typeof value !== "object");
  return entries.length ? entries.slice(0, 4).map(([key, value]) => `${detailLabel(key)}: ${String(value)}`).join(" · ") : "Geen aanvullende details";
}

function auditActionLabel(value: string) {
  const labels: Record<string, string> = { "export.created": "Back-up gedownload", "export.wealth": "Vermogen geëxporteerd", "export.today_calculation": "Vandaag geëxporteerd", "export.forward_schedule": "Planning geëxporteerd", "restore.validated": "Back-up gecontroleerd", "restore.executed": "Back-up hersteld" };
  return labels[value] ?? value.replaceAll(".", " ");
}

function auditObjectLabel(value: string) {
  const labels: Record<string, string> = { export: "Export", restore: "Herstel", account: "Rekening", transaction: "Transactie", user: "Gebruiker" };
  return labels[value] ?? value;
}

function detailLabel(value: string) {
  const labels: Record<string, string> = { format: "Formaat", totalRows: "Rijen", exportedAt: "Exportdatum", schemaVersion: "Schemaversie", rows: "Rijen", asOf: "Peildatum", horizonDays: "Dagen", integrity: "Integriteit" };
  return labels[value] ?? value.replaceAll("_", " ");
}

function isSensitiveAuditKey(key: string) {
  return /iban|email|password|token|hash|file/i.test(key);
}
