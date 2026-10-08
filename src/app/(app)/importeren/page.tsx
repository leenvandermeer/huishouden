import { ArrowRight, Combine, FileCode2, FileSpreadsheet, FileText, FileUp, Landmark, ListChecks, RotateCcw, ShieldCheck, Sparkles } from "lucide-react";
import { Button, ButtonLink, FieldHint, FieldLabel, Input, PageHeader, Select, StatusBadge } from "@/components/ui";
import { ReadonlyNotice } from "@/components/finance/readonly-notice";
import { BankFilePicker } from "@/components/finance/bank-file-picker";
import { rollbackImport } from "@/modules/finance/actions";
import { getFinanceMetadata } from "@/modules/finance/data-source";
import { getImportControlSummary, getImportMappingPresets } from "@/modules/finance/repository";
import { formatCurrency, formatDate } from "@/lib/format";
import { requireUser } from "@/modules/auth/service";
import { accountTypeLabel } from "@/modules/finance/wealth";

export default async function ImportPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const params = (await searchParams) ?? {};
  const [user, dataset, importControl, presets] = await Promise.all([
    requireUser(),
    getFinanceMetadata(),
    getImportControlSummary(),
    getImportMappingPresets(),
  ]);
  const canMutate = user.role !== "readonly";
  const status = typeof params.status === "string" ? params.status : undefined;
  const inserted = typeof params.inserted === "string" ? params.inserted : undefined;
  const skipped = typeof params.skipped === "string" ? params.skipped : undefined;
  const excluded = typeof params.excluded === "string" ? params.excluded : undefined;
  const files = typeof params.files === "string" ? params.files : undefined;
  const accounts = typeof params.accounts === "string" ? params.accounts : undefined;
  const review = typeof params.review === "string" ? params.review : undefined;
  const deleted = typeof params.deleted === "string" ? params.deleted : undefined;
  const message = typeof params.message === "string" ? params.message : undefined;
  const balanceIssueCount = importControl.accountRows.filter((row) => Math.abs(row.balanceDifference) >= 0.01).length;
  return (
    <>
      <PageHeader
        eyebrow="Bankimport"
        title="Importeer van iedere bank"
        description={canMutate ? "Upload CSV, CAMT.053 of MT940. Bank en bestandsindeling worden zoveel mogelijk automatisch herkend." : "Je kunt eerdere imports bekijken, maar geen bestand toevoegen."}
      />
      {!canMutate ? <div className="mb-3"><ReadonlyNotice>Importeren en terugdraaien is alleen beschikbaar voor eigenaar of beheerder.</ReadonlyNotice></div> : null}
      {status ? (
        <section className="mb-3 rounded-[var(--radius-lg)] border border-border bg-[var(--color-brand-subtle)] p-4 text-sm text-brand">
          {status === "geimporteerd" ? `Import opgeslagen: ${inserted} nieuwe transacties, ${skipped} overgeslagen.` : null}
          {status === "geen-nieuwe-transacties" ? `Geen nieuwe transacties gevonden. Overgeslagen: ${skipped}.` : null}
          {status === "geen-bestanden" ? "Kies minimaal één bankbestand om te importeren." : null}
          {status === "geen-transacties" ? "Er zijn geen herkenbare transacties gevonden in de gekozen bestanden." : null}
          {status === "formaatfout" ? message ?? "Het gekozen bestand heeft geen ondersteund bankformaat." : null}
          {status === "preview-verlopen" ? "De importpreview is verlopen. Upload de bestanden opnieuw." : null}
          {status === "import-bezig" ? "Er wordt al een bankimport verwerkt. Wacht tot die klaar is en bekijk daarna de laatste imports hieronder." : null}
          {status === "geen-rechten" ? "Je hebt alleen-lezen toegang en mag geen import uitvoeren." : null}
          {status === "bevestig-terugdraaien" ? "Vink eerst bevestigen aan voordat je een import terugdraait." : null}
          {status === "import-niet-gevonden" ? "Deze import is niet gevonden of al teruggedraaid." : null}
          {status === "import-teruggedraaid" ? `Import teruggedraaid: ${deleted ?? "0"} transacties verwijderd.` : null}
          {status === "geimporteerd" || status === "geen-nieuwe-transacties" ? (
            <div className="mt-3 grid gap-2 sm:grid-cols-6">
              <ResultPill label="Bestanden" value={files ?? "0"} />
              <ResultPill label="Rekeningen" value={accounts ?? "0"} />
              <ResultPill label="Nieuw" value={inserted ?? "0"} />
              <ResultPill label="Duplicaat" value={skipped ?? "0"} />
              <ResultPill label="Uitgesloten" value={excluded ?? "0"} />
              <ResultPill label="Te controleren" value={review ?? "0"} />
              <div className="flex flex-wrap gap-2 sm:col-span-6">
                <ButtonLink href="/categoriseren" variant="secondary">Controleer categorieën</ButtonLink>
                <ButtonLink href="/rekeningen" variant="secondary">Controleer saldi</ButtonLink>
                <ButtonLink href="/transacties?categoryId=geen" variant="secondary">Posten zonder categorie</ButtonLink>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}
      <section className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_23rem]">
        {canMutate ? (
        <form action="/api/import/bank/preview" method="post" encType="multipart/form-data" className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-white shadow-[var(--shadow-sm)]">
          <div className="border-b border-border bg-[var(--color-surface)] p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <StatusBadge tone="success"><Sparkles aria-hidden="true" size={12} /> Automatische herkenning</StatusBadge>
                <h2 className="mt-2 text-xl font-semibold text-brand">Eén upload voor al je banken</h2>
                <p className="mt-1 max-w-2xl text-sm text-[var(--color-text-muted)]">Exporteer transacties bij je bank en upload het bestand hier. Je hoeft vooraf geen bank of formaat te kiezen.</p>
              </div>
              <Landmark aria-hidden="true" className="text-[var(--color-brand-accent)]" size={34} />
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <FormatCard icon={<FileSpreadsheet size={17} />} title="CSV" detail="Rabobank of generieke kolommen" />
              <FormatCard icon={<FileCode2 size={17} />} title="CAMT.053" detail="ISO 20022 XML-bankafschrift" />
              <FormatCard icon={<FileText size={17} />} title="MT940" detail="SWIFT-bankafschrift" />
            </div>
          </div>

          <div className="p-4 sm:p-5">
            <div className="rounded-[var(--radius-lg)] border-2 border-dashed border-[var(--color-brand-accent)] bg-[var(--color-brand-subtle)] p-5 text-center transition hover:border-brand">
              <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-white text-brand shadow-[var(--shadow-sm)]"><FileUp aria-hidden="true" size={20} /></span>
              <span className="mt-3 block text-base font-semibold text-brand">Kies één of meerdere bankbestanden</span>
              <span className="mt-1 block text-xs text-[var(--color-text-muted)]">CSV, XML, STA of MT940 · maximaal 15 MB per bestand</span>
              <BankFilePicker />
            </div>

            <details className="mt-4 rounded-md border border-border bg-[var(--color-surface)]">
              <summary className="cursor-pointer px-3 py-2.5 text-sm font-semibold text-brand">Extra hulp voor een afwijkend CSV-bestand</summary>
              <div className="grid gap-4 border-t border-border p-3 sm:grid-cols-2">
                <div>
                  <FieldLabel htmlFor="sourceBank">Banknaam</FieldLabel>
                  <Input id="sourceBank" name="sourceBank" placeholder="Bijvoorbeeld ASN Bank" />
                  <FieldHint>Alleen invullen als de banknaam niet in het bestand staat.</FieldHint>
                </div>
                <div>
                  <FieldLabel htmlFor="accountType">Rekeningtype</FieldLabel>
                  <Select id="accountType" name="accountType" defaultValue="">
                    <option value="">Automatisch herkennen</option>
                    <option value="betaalrekening">Betaalrekening</option>
                    <option value="spaarrekening">Spaarrekening</option>
                    <option value="beleggingsrekening">Beleggingsrekening</option>
                    <option value="schuld">Schuld</option>
                  </Select>
                </div>
                <div>
                  <FieldLabel htmlFor="accountName">Rekeningnaam</FieldLabel>
                  <Input id="accountName" name="accountName" placeholder="Bijvoorbeeld Gezamenlijke rekening" />
                </div>
                <div>
                  <FieldLabel htmlFor="accountIdentifier">Rekeningnummer of IBAN</FieldLabel>
                  <Input id="accountIdentifier" name="accountIdentifier" placeholder="Alleen als dit in CSV ontbreekt" />
                </div>
                <div className="sm:col-span-2">
                  <FieldLabel htmlFor="mappingPresetId">Eerder bewaarde CSV-indeling</FieldLabel>
                  <Select id="mappingPresetId" name="mappingPresetId" defaultValue="">
                    <option value="">Automatisch herkennen</option>
                    {presets.map((preset) => <option key={preset.id} value={preset.id}>{preset.name}</option>)}
                  </Select>
                </div>
              </div>
            </details>

            <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]"><ShieldCheck aria-hidden="true" size={15} className="text-emerald-700" /> Eerst een preview; er wordt nog niets opgeslagen.</p>
              <Button type="submit" variant="primary"><ListChecks aria-hidden="true" size={15} /> Bestand controleren <ArrowRight aria-hidden="true" size={14} /></Button>
            </div>
          </div>
        </form>
        ) : (
          <section className="rounded-[var(--radius-lg)] border border-border bg-white p-4">
            <ReadonlyNotice>Alleen een eigenaar of beheerder kan een bestand toevoegen.</ReadonlyNotice>
          </section>
        )}
        <aside className="space-y-3">
          <section className="rounded-[var(--radius-lg)] border border-border bg-white p-4 shadow-[var(--shadow-sm)]">
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-[var(--color-brand-accent)]">Zo werkt het</p>
            <ol className="mt-4 space-y-4">
              <ImportStep number="1" title="Upload" detail="Kies bestanden van één of meerdere banken." />
              <ImportStep number="2" title="Controleer" detail="Bekijk formaat, rekening, aantallen en duplicaten." />
              <ImportStep number="3" title="Bevestig" detail="Pas daarna worden nieuwe transacties opgeslagen." />
            </ol>
          </section>
          <section className="rounded-[var(--radius-lg)] border border-border bg-[var(--color-surface)] p-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-brand"><Combine aria-hidden="true" size={16} /> Bankonafhankelijk</h2>
            <p className="mt-2 text-xs leading-5 text-[var(--color-text-muted)]">Werkt voor banken die CSV, CAMT.053 of MT940 aanbieden, bijvoorbeeld Rabobank, ING, ABN AMRO, ASN/SNS en bunq. Generieke CSV kun je eenmalig mappen en bewaren.</p>
          </section>
          {dataset.importInfo ? <p className="px-1 text-[0.68rem] text-[var(--color-text-subtle)]">Laatste import: {dataset.importInfo.filename} · {dataset.importInfo.transactionCount} transacties</p> : null}
        </aside>
      </section>
      <section className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="rounded-[var(--radius-lg)] border border-border bg-white p-3 shadow-[var(--shadow-sm)]">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-brand">Importcontrole</h2>
            <StatusBadge tone={importControl.reviewCount ? "warning" : "success"}>{importControl.reviewCount} te controleren</StatusBadge>
          </div>
          <div className="mb-3 grid gap-2 sm:grid-cols-4">
            <ControlMetric label="Rekeningen" value={String(importControl.accountRows.length)} />
            <ControlMetric label="Transacties" value={String(importControl.accountRows.reduce((sum, row) => sum + row.transactionCount, 0))} />
            <ControlMetric label="Te controleren" value={String(importControl.reviewCount)} tone={importControl.reviewCount ? "warning" : "success"} />
            <ControlMetric label="Saldo-afwijkingen" value={String(balanceIssueCount)} tone={balanceIssueCount ? "warning" : "success"} />
          </div>
          <div className="grid gap-2 md:hidden">
            {importControl.accountRows.map((row) => (
              <ImportControlCard key={row.accountId} row={row} />
            ))}
            {importControl.accountRows.length === 0 ? (
              <p className="rounded-md border border-dashed border-border bg-[var(--color-surface)] p-4 text-center text-xs text-[var(--color-text-muted)]">Nog geen rekeningen geimporteerd.</p>
            ) : null}
          </div>
          <div className="table-responsive hidden md:block">
            <table className="w-full min-w-[60rem] text-left text-xs">
              <thead className="border-b border-border text-[var(--color-text-subtle)]">
                <tr>
                  <th className="py-2 pr-3">Rekening</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2 text-right">Transacties</th>
                  <th className="px-3 py-2 text-right">Bankstand</th>
                  <th className="px-3 py-2 text-right">Berekend saldo</th>
                  <th className="px-3 py-2 text-right">Verschil</th>
                  <th className="py-2 pl-3">Laatste import</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {importControl.accountRows.map((row) => (
                  <tr key={row.accountId}>
                    <td className="py-2 pr-3">
                      <strong className="block text-brand">{row.accountName}</strong>
                      <span className="text-[var(--color-text-subtle)]">{row.iban}</span>
                    </td>
                    <td className="px-3 py-2"><StatusBadge tone={accountTypeTone(row.type)}>{accountTypeLabel(row.type)}</StatusBadge></td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums">{row.transactionCount}</td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums">{formatCurrency(row.balance)}</td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums">{formatCurrency(row.calculatedBalance)}</td>
                    <td className={`px-3 py-2 text-right font-semibold tabular-nums ${Math.abs(row.balanceDifference) >= 0.01 ? "text-amber-700" : "text-emerald-700"}`}>{formatCurrency(row.balanceDifference)}</td>
                    <td className="py-2 pl-3 text-[var(--color-text-muted)]">{row.lastImportAt ? formatDate(row.lastImportAt) : "Nog niet"}</td>
                  </tr>
                ))}
                {importControl.accountRows.length === 0 ? (
                  <tr><td colSpan={7} className="py-6 text-center text-[var(--color-text-muted)]">Nog geen rekeningen geimporteerd.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
        <aside className="rounded-[var(--radius-lg)] border border-border bg-white p-3 shadow-[var(--shadow-sm)]">
          <h2 className="text-sm font-semibold text-brand">Laatste imports</h2>
          <div className="mt-3 grid gap-2">
            {importControl.latestImports.map((item) => (
              <div key={item.id} className="rounded-md bg-[var(--color-surface)] p-2 text-xs">
                <strong className="block truncate text-brand">{item.filename}</strong>
                <span className="text-[var(--color-text-muted)]">{item.sourceBank} - {item.transactionCount} transacties - {formatDate(item.importedAt)}</span>
                {canMutate ? (
                <form action={rollbackImport} className="mt-2 grid gap-2">
                  <input type="hidden" name="importId" value={item.id} />
                  <label className="flex items-center gap-2 text-[0.68rem] font-semibold text-[var(--color-text-muted)]">
                    <input name="confirmRollback" type="checkbox" /> Terugdraaien bevestigen
                  </label>
                  <Button type="submit" variant="ghost" size="sm">
                    <RotateCcw aria-hidden="true" size={13} /> Import terugdraaien
                  </Button>
                </form>
                ) : null}
              </div>
            ))}
            {importControl.latestImports.length === 0 ? <p className="text-xs text-[var(--color-text-muted)]">Nog geen imports opgeslagen.</p> : null}
          </div>
        </aside>
      </section>
    </>
  );
}

function ResultPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-white px-2.5 py-2">
      <p className="text-[0.62rem] font-bold uppercase tracking-wide text-[var(--color-text-subtle)]">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-brand">{value}</p>
    </div>
  );
}

function FormatCard({ icon, title, detail }: { icon: React.ReactNode; title: string; detail: string }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-border bg-white p-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-[var(--color-brand-subtle)] text-brand">{icon}</span>
      <span className="min-w-0"><strong className="block text-sm text-brand">{title}</strong><span className="block truncate text-[0.68rem] text-[var(--color-text-muted)]">{detail}</span></span>
    </div>
  );
}

function ImportStep({ number, title, detail }: { number: string; title: string; detail: string }) {
  return <li className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3"><span className="grid h-8 w-8 place-items-center rounded-full bg-brand text-xs font-bold text-white">{number}</span><span><strong className="block text-sm text-brand">{title}</strong><span className="mt-0.5 block text-xs leading-5 text-[var(--color-text-muted)]">{detail}</span></span></li>;
}

function ControlMetric({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "success" | "warning" }) {
  const valueClass = tone === "success" ? "text-emerald-700" : tone === "warning" ? "text-amber-700" : "text-brand";
  return (
    <div className="rounded-md bg-[var(--color-surface)] p-2 text-xs">
      <p className="text-[0.62rem] font-bold uppercase tracking-wide text-[var(--color-text-subtle)]">{label}</p>
      <p className={`mt-0.5 text-sm font-semibold ${valueClass}`}>{value}</p>
    </div>
  );
}

function ImportControlCard({ row }: { row: Awaited<ReturnType<typeof getImportControlSummary>>["accountRows"][number] }) {
  const hasBalanceIssue = Math.abs(row.balanceDifference) >= 0.01;
  return (
    <article className="rounded-md border border-border bg-white p-3 text-xs">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <strong className="block truncate text-sm text-brand">{row.accountName}</strong>
          <span className="block truncate text-[var(--color-text-subtle)]">{row.iban}</span>
        </div>
        <StatusBadge tone={accountTypeTone(row.type)}>{accountTypeLabel(row.type)}</StatusBadge>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <MobileCheckAmount label="Bankstand" value={formatCurrency(row.balance)} />
        <MobileCheckAmount label="Berekend saldo" value={formatCurrency(row.calculatedBalance)} />
        <MobileCheckAmount label="Saldoverschil" value={formatCurrency(row.balanceDifference)} tone={hasBalanceIssue ? "warning" : "success"} />
        <MobileCheckAmount label="Transacties" value={String(row.transactionCount)} />
      </div>
      <p className="mt-3 text-[0.68rem] text-[var(--color-text-subtle)]">Laatste import: {row.lastImportAt ? formatDate(row.lastImportAt) : "Nog niet"}</p>
    </article>
  );
}

function accountTypeTone(type: "betaalrekening" | "spaarrekening" | "beleggingsrekening" | "schuld"): "success" | "info" | "warning" | "error" {
  if (type === "spaarrekening") return "info";
  if (type === "beleggingsrekening") return "warning";
  if (type === "schuld") return "error";
  return "success";
}

function MobileCheckAmount({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "success" | "warning" }) {
  const valueClass = tone === "success" ? "text-emerald-700" : tone === "warning" ? "text-amber-800" : "text-brand";
  return (
    <div className="rounded-md bg-[var(--color-surface)] px-2.5 py-2">
      <span className="block text-[0.62rem] font-bold uppercase text-[var(--color-text-subtle)]">{label}</span>
      <strong className={`mt-0.5 block truncate tabular-nums ${valueClass}`}>{value}</strong>
    </div>
  );
}
