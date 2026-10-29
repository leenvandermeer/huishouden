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
  const transactionCount = importControl.accountRows.reduce((sum, row) => sum + row.transactionCount, 0);
  const lastImport = importControl.latestImports[0];
  const label = "text-[0.62rem] uppercase tracking-[0.22em] text-[var(--color-text-muted)]";
  return (
    <>
      <PageHeader
        eyebrow="Bankimport"
        title="Importeer van iedere bank"
        description={canMutate ? "Upload CSV, CAMT.053 of MT940. Bank en bestandsindeling worden zoveel mogelijk automatisch herkend." : "Je kunt eerdere imports bekijken, maar geen bestand toevoegen."}
        stats={[
          { label: "Transacties", value: transactionCount.toLocaleString("nl-NL"), detail: `Op ${importControl.accountRows.length} rekening${importControl.accountRows.length === 1 ? "" : "en"}`, lead: true },
          { label: "Te controleren", value: String(importControl.reviewCount), detail: importControl.reviewCount ? "Categorie onzeker" : "Alles gecontroleerd", tone: importControl.reviewCount ? "risk" : undefined },
          { label: "Saldo-afwijkingen", value: String(balanceIssueCount), detail: balanceIssueCount ? "Bankstand wijkt af" : "Saldi sluiten aan", tone: balanceIssueCount ? "risk" : undefined },
          { label: "Laatste import", value: lastImport ? formatDate(lastImport.importedAt) : "—", detail: lastImport ? `${lastImport.transactionCount} transacties` : "Nog geen imports" },
        ]}
      />
      {!canMutate ? <div className="mb-8"><ReadonlyNotice>Importeren en terugdraaien is alleen beschikbaar voor eigenaar of beheerder.</ReadonlyNotice></div> : null}
      {status ? (
        <section className="mb-8 border border-border bg-[var(--color-panel-strong)] p-5 text-sm text-[var(--color-text)] md:p-6">
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
            <div className="mt-5 grid gap-x-6 gap-y-4 border-t border-border pt-5 grid-cols-2 sm:grid-cols-6">
              <ResultPill label="Bestanden" value={files ?? "0"} />
              <ResultPill label="Rekeningen" value={accounts ?? "0"} />
              <ResultPill label="Nieuw" value={inserted ?? "0"} />
              <ResultPill label="Duplicaat" value={skipped ?? "0"} />
              <ResultPill label="Uitgesloten" value={excluded ?? "0"} />
              <ResultPill label="Te controleren" value={review ?? "0"} />
              <div className="col-span-2 flex flex-wrap gap-2 sm:col-span-6">
                <ButtonLink href="/categoriseren" variant="secondary">Controleer categorieën</ButtonLink>
                <ButtonLink href="/rekeningen" variant="secondary">Controleer saldi</ButtonLink>
                <ButtonLink href="/transacties?categoryId=geen" variant="secondary">Posten zonder categorie</ButtonLink>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      <div className="section-head">
        <h2>Bestand toevoegen</h2>
        <p>Exporteer transacties bij je bank en upload het bestand hier. Je hoeft vooraf geen bank of formaat te kiezen.</p>
      </div>
      <section className="mb-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_23rem]">
        {canMutate ? (
        <form action="/api/import/bank/preview" method="post" encType="multipart/form-data" className="border border-border bg-[var(--color-panel-strong)]">
          <div className="border-b border-border p-5 md:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <StatusBadge tone="success"><Sparkles aria-hidden="true" size={12} /> Automatische herkenning</StatusBadge>
                <h2 className="mt-3 text-lg font-normal text-[var(--color-text)]">Eén upload voor al je banken</h2>
              </div>
              <Landmark aria-hidden="true" className="text-[var(--color-text-muted)]" size={28} strokeWidth={1.25} />
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <FormatCard icon={<FileSpreadsheet size={17} strokeWidth={1.5} />} title="CSV" detail="Rabobank of generieke kolommen" />
              <FormatCard icon={<FileCode2 size={17} strokeWidth={1.5} />} title="CAMT.053" detail="ISO 20022 XML-bankafschrift" />
              <FormatCard icon={<FileText size={17} strokeWidth={1.5} />} title="MT940" detail="SWIFT-bankafschrift" />
            </div>
          </div>

          <div className="p-5 md:p-6">
            <div className="border border-dashed border-[var(--color-text-subtle)] bg-[var(--color-surface)] p-6 text-center transition hover:border-[var(--color-text)] md:p-8">
              <FileUp aria-hidden="true" size={24} strokeWidth={1.25} className="mx-auto text-[var(--color-text-muted)]" />
              <span className="mt-3 block text-base font-normal text-[var(--color-text)]">Kies één of meerdere bankbestanden</span>
              <span className="mt-1 block text-xs text-[var(--color-text-muted)]">CSV, XML, STA of MT940 · maximaal 15 MB per bestand</span>
              <BankFilePicker />
            </div>

            <details className="mt-5 border border-border bg-[var(--color-surface)]">
              <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-[var(--color-text)]">Extra hulp voor een afwijkend CSV-bestand</summary>
              <div className="grid gap-4 border-t border-border p-4 sm:grid-cols-2">
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

            <div className="mt-5 flex flex-col gap-4 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]"><ShieldCheck aria-hidden="true" size={15} strokeWidth={1.5} className="text-[var(--color-success)]" /> Eerst een preview; er wordt nog niets opgeslagen.</p>
              <Button type="submit" variant="primary"><ListChecks aria-hidden="true" size={15} /> Bestand controleren <ArrowRight aria-hidden="true" size={14} /></Button>
            </div>
          </div>
        </form>
        ) : (
          <section className="border border-border bg-[var(--color-panel-strong)] p-5 md:p-6">
            <ReadonlyNotice>Alleen een eigenaar of beheerder kan een bestand toevoegen.</ReadonlyNotice>
          </section>
        )}
        <aside className="grid content-start gap-4">
          <section className="border border-border bg-[var(--color-panel-strong)] p-5 md:p-6">
            <p className={label}>Zo werkt het</p>
            <ol className="mt-5 space-y-5">
              <ImportStep number="1" title="Upload" detail="Kies bestanden van één of meerdere banken." />
              <ImportStep number="2" title="Controleer" detail="Bekijk formaat, rekening, aantallen en duplicaten." />
              <ImportStep number="3" title="Bevestig" detail="Pas daarna worden nieuwe transacties opgeslagen." />
            </ol>
          </section>
          <section className="border border-border bg-[var(--color-surface)] p-5 md:p-6">
            <h2 className="flex items-center gap-2 text-sm font-medium text-[var(--color-text)]"><Combine aria-hidden="true" size={16} strokeWidth={1.5} className="text-[var(--color-text-muted)]" /> Bankonafhankelijk</h2>
            <p className="mt-2 text-xs leading-5 text-[var(--color-text-muted)]">Werkt voor banken die CSV, CAMT.053 of MT940 aanbieden, bijvoorbeeld Rabobank, ING, ABN AMRO, ASN/SNS en bunq. Generieke CSV kun je eenmalig mappen en bewaren.</p>
          </section>
          {dataset.importInfo ? <p className="px-1 text-[0.68rem] text-[var(--color-text-subtle)]">Laatste import: {dataset.importInfo.filename} · {dataset.importInfo.transactionCount} transacties</p> : null}
        </aside>
      </section>

      <div className="section-head">
        <h2>Importcontrole</h2>
        <p>Per rekening de geïmporteerde transacties naast de bankstand, zodat je ziet of alles aansluit.</p>
      </div>
      <section className="mb-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 border border-border bg-[var(--color-panel-strong)] p-5 md:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
            <p className={label}>Rekeningen</p>
            <StatusBadge tone={importControl.reviewCount ? "warning" : "success"}>{importControl.reviewCount} te controleren</StatusBadge>
          </div>
          <div className="grid gap-4 md:hidden">
            {importControl.accountRows.map((row) => (
              <ImportControlCard key={row.accountId} row={row} />
            ))}
            {importControl.accountRows.length === 0 ? (
              <p className="border border-dashed border-border bg-[var(--color-surface)] p-5 text-center text-xs text-[var(--color-text-muted)]">Nog geen rekeningen geimporteerd.</p>
            ) : null}
          </div>
          <div className="hidden md:block">
          <div className="table-responsive">
            <table className="w-full min-w-[60rem] text-left text-xs">
              <thead className="border-b border-border text-[0.62rem] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                <tr>
                  <th className="py-3 pr-3 font-normal">Rekening</th>
                  <th className="px-3 py-3 font-normal">Type</th>
                  <th className="px-3 py-3 text-right font-normal">Transacties</th>
                  <th className="px-3 py-3 text-right font-normal">Bankstand</th>
                  <th className="px-3 py-3 text-right font-normal">Berekend saldo</th>
                  <th className="px-3 py-3 text-right font-normal">Verschil</th>
                  <th className="py-3 pl-3 font-normal">Laatste import</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {importControl.accountRows.map((row) => (
                  <tr key={row.accountId}>
                    <td className="py-3 pr-3">
                      <strong className="block font-medium text-[var(--color-text)]">{row.accountName}</strong>
                      <span className="text-[var(--color-text-subtle)]">{row.iban}</span>
                    </td>
                    <td className="px-3 py-3"><StatusBadge tone={accountTypeTone(row.type)}>{accountTypeLabel(row.type)}</StatusBadge></td>
                    <td className="px-3 py-3 text-right tabular-nums">{row.transactionCount}</td>
                    <td className="money-value px-3 py-3 text-right tabular-nums">{formatCurrency(row.balance)}</td>
                    <td className="money-value px-3 py-3 text-right tabular-nums">{formatCurrency(row.calculatedBalance)}</td>
                    <td className={`money-value px-3 py-3 text-right tabular-nums ${Math.abs(row.balanceDifference) >= 0.01 ? "text-[var(--color-warning)]" : "text-[var(--color-success)]"}`}>{formatCurrency(row.balanceDifference)}</td>
                    <td className="py-3 pl-3 text-[var(--color-text-muted)]">{row.lastImportAt ? formatDate(row.lastImportAt) : "Nog niet"}</td>
                  </tr>
                ))}
                {importControl.accountRows.length === 0 ? (
                  <tr><td colSpan={7} className="py-6 text-center text-[var(--color-text-muted)]">Nog geen rekeningen geimporteerd.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
          </div>
        </div>
        <aside className="border border-border bg-[var(--color-panel-strong)] p-5 md:p-6">
          <p className={label}>Laatste imports</p>
          <div className="mt-5 divide-y divide-border">
            {importControl.latestImports.map((item) => (
              <div key={item.id} className="py-4 text-xs first:pt-0 last:pb-0">
                <strong className="block truncate font-medium text-[var(--color-text)]">{item.filename}</strong>
                <span className="text-[var(--color-text-muted)]">{item.sourceBank} - {item.transactionCount} transacties - {formatDate(item.importedAt)}</span>
                {canMutate ? (
                <form action={rollbackImport} className="mt-3 grid gap-2">
                  <input type="hidden" name="importId" value={item.id} />
                  <label className="flex items-center gap-2 text-[0.68rem] text-[var(--color-text-muted)]">
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
    <div>
      <p className="text-[0.62rem] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">{label}</p>
      <p className="money-value mt-1 text-2xl font-light text-[var(--color-text)]">{value}</p>
    </div>
  );
}

function FormatCard({ icon, title, detail }: { icon: React.ReactNode; title: string; detail: string }) {
  return (
    <div className="flex items-center gap-3 border border-border bg-[var(--color-surface)] p-4">
      <span className="shrink-0 text-[var(--color-text-muted)]" aria-hidden="true">{icon}</span>
      <span className="min-w-0"><strong className="block text-sm font-medium text-[var(--color-text)]">{title}</strong><span className="block truncate text-[0.68rem] text-[var(--color-text-muted)]">{detail}</span></span>
    </div>
  );
}

function ImportStep({ number, title, detail }: { number: string; title: string; detail: string }) {
  return <li className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3"><span className="grid h-8 w-8 place-items-center rounded-full border border-border text-xs font-light text-[var(--color-text)]">{number}</span><span><strong className="block text-sm font-medium text-[var(--color-text)]">{title}</strong><span className="mt-0.5 block text-xs leading-5 text-[var(--color-text-muted)]">{detail}</span></span></li>;
}

function ImportControlCard({ row }: { row: Awaited<ReturnType<typeof getImportControlSummary>>["accountRows"][number] }) {
  const hasBalanceIssue = Math.abs(row.balanceDifference) >= 0.01;
  return (
    <article className="border border-border bg-[var(--color-surface)] p-4 text-xs">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <strong className="block truncate text-sm font-medium text-[var(--color-text)]">{row.accountName}</strong>
          <span className="block truncate text-[var(--color-text-subtle)]">{row.iban}</span>
        </div>
        <StatusBadge tone={accountTypeTone(row.type)}>{accountTypeLabel(row.type)}</StatusBadge>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-4">
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
  const valueClass = tone === "success" ? "text-[var(--color-success)]" : tone === "warning" ? "text-[var(--color-warning)]" : "text-[var(--color-text)]";
  return (
    <div>
      <span className="block text-[0.62rem] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">{label}</span>
      <strong className={`money-value mt-1 block truncate font-normal tabular-nums ${valueClass}`}>{value}</strong>
    </div>
  );
}
