import { AlertTriangle, CheckCircle2, FileSpreadsheet } from "lucide-react";
import { FieldHint, FieldLabel, PageHeader, Select, StatusBadge } from "@/components/ui";
import { BankImportConfirmForm } from "@/components/finance/bank-import-confirm-form";
import { inspectBankCsv, type ImportField } from "@/modules/finance/bank-import";
import { detectBankFormat, parseBankFile } from "@/modules/finance/bank-import-camt";
import { countExistingTransactions, getImportMappingPresets, getPendingImport } from "@/modules/finance/repository";
import { formatCurrency } from "@/lib/format";

const fields: Array<{ id: ImportField; label: string; required?: boolean }> = [
  { id: "account", label: "Rekening/IBAN", required: true },
  { id: "date", label: "Datum", required: true },
  { id: "amount", label: "Bedrag", required: true },
  { id: "description", label: "Omschrijving" },
  { id: "counterparty", label: "Tegenpartij" },
  { id: "counterAccount", label: "Tegenrekening" },
  { id: "balance", label: "Saldo na transactie" },
  { id: "sequence", label: "Transactie-id/volgnummer" },
];

export default async function ImportPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pendingImport = await getPendingImport(id);
  if (!pendingImport) {
    return (
      <>
        <PageHeader eyebrow="Toevoegen" title="Controle verlopen" description="Kies het bankbestand opnieuw." />
      </>
    );
  }

  const presetId = stringOption(pendingImport.options.mappingPresetId);
  const presets = await getImportMappingPresets();
  const preset = presetId ? presets.find((candidate) => candidate.id === presetId) : undefined;
  const presetMapping = preset?.mapping as Partial<Record<ImportField, string>> | undefined;
  const previews = await Promise.all(pendingImport.files.map(async (file) => {
    const buffer = Buffer.from(file.contentBase64, "base64");
    const format: "camt053" | "mt940" | "csv" = detectBankFormat(buffer.toString("utf-8")) ?? "csv";
    const inspection = format === "csv" ? inspectBankCsv(buffer, file.filename) : undefined;
    let parsed;
    let existing = 0;
    let error: string | undefined;
    try {
      parsed = parseBankFile(buffer, {
        filename: file.filename,
        accountName: stringOption(pendingImport.options.accountName),
        accountIdentifier: stringOption(pendingImport.options.accountIdentifier),
        accountType: accountTypeOption(pendingImport.options.accountType),
        sourceBank: stringOption(pendingImport.options.sourceBank),
        columnMapping: presetMapping,
      });
      existing = parsed ? await countExistingTransactions(parsed.transactions.map((transaction) => transaction.id)) : 0;
    } catch (caught) {
      error = caught instanceof Error ? caught.message : "Onbekend importformaat.";
    }
    return { file, format, inspection, parsed, existing, error };
  }));

  const totalTransactions = previews.reduce((sum, preview) => sum + (preview.parsed?.transactions.length ?? 0), 0);
  const totalExisting = previews.reduce((sum, preview) => sum + preview.existing, 0);
  const totalAccounts = previews.reduce((sum, preview) => sum + (preview.parsed?.accounts.length ?? 0), 0);
  const requiresMapping = previews.some((preview) => preview.format === "csv" && (preview.inspection?.requiresMapping || preview.error));
  const headers = previews.find((preview) => preview.inspection?.headers.length)?.inspection?.headers ?? [];
  const detectedMapping = presetMapping ?? previews.find((preview) => preview.inspection)?.inspection?.detectedMapping ?? {};

  return (
    <>
      <PageHeader
        eyebrow="Stap 2 van 2"
        title="Klopt alles?"
        description="Controleer de aantallen en sla de betalingen daarna op."
      />

      <section className="mb-3 grid gap-3 sm:grid-cols-5">
        <SummaryCard label="Bestanden" value={String(previews.length)} />
        <SummaryCard label="Rekeningen" value={String(totalAccounts)} />
        <SummaryCard label="Transacties" value={String(totalTransactions)} />
        <SummaryCard label="Nieuw" value={String(Math.max(totalTransactions - totalExisting, 0))} />
        <SummaryCard label="Al bekend" value={String(totalExisting)} />
      </section>

      {totalExisting > 0 ? (
        <p className="mb-3 text-sm text-[var(--color-text-muted)]">
          Van de {totalTransactions} transacties in je bestanden zijn er {totalExisting} al bekend.
          {totalExisting === totalTransactions ? " Er worden geen nieuwe transacties toegevoegd." : " Alleen nieuwe transacties worden toegevoegd."}
        </p>
      ) : null}

      <BankImportConfirmForm>
        <input type="hidden" name="pendingImportId" value={pendingImport.id} />
        {requiresMapping ? (
          <div className="mb-4 rounded-md border border-border bg-[var(--color-warning-subtle)] p-3">
            <StatusBadge tone="warning"><AlertTriangle aria-hidden="true" size={12} /> Kies de juiste kolommen</StatusBadge>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {fields.map((field) => (
                <div key={field.id}>
                  <FieldLabel htmlFor={`mapping-${field.id}`}>{field.label}{field.required ? " *" : ""}</FieldLabel>
                  <Select id={`mapping-${field.id}`} name={`mapping.${field.id}`} defaultValue={detectedMapping[field.id] ?? ""} required={field.required}>
                    <option value="">Niet gebruiken</option>
                    {headers.map((header) => <option key={header} value={header}>{header}</option>)}
                  </Select>
                </div>
              ))}
            </div>
            <FieldHint>Koppel iedere naam uit je bestand aan het juiste veld.</FieldHint>
            {preset ? <FieldHint>Ingevuld met je bewaarde indeling: {preset.name}.</FieldHint> : null}
          </div>
        ) : (
          <div className="mb-4 rounded-md border border-border bg-[var(--color-success-subtle)] p-3 text-xs text-emerald-800">
            <CheckCircle2 aria-hidden="true" size={14} className="mr-1 inline" /> Alle verplichte kolommen zijn automatisch herkend.
          </div>
        )}

        <div className="grid gap-3">
          {previews.map((preview) => {
            const dateRange = preview.parsed?.transactions.length
              ? `${preview.parsed.transactions.at(-1)?.date} t/m ${preview.parsed.transactions[0]?.date}`
              : "Onbekend";
            const total = preview.parsed?.transactions.reduce((sum, transaction) => sum + transaction.amount, 0) ?? 0;
            return (
              <article key={preview.file.filename} className="rounded-md border border-border p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-brand"><FileSpreadsheet aria-hidden="true" size={15} className="mr-1 inline" /> {preview.file.filename}</h2>
                    <p className="mt-1 text-xs text-[var(--color-text-muted)]">{dateRange}</p>
                  </div>
                  <StatusBadge tone={preview.error ? "warning" : "success"}>{preview.error ? "Niet herkend" : `${preview.parsed?.importInfo?.sourceBank ?? "Bank"} · ${formatLabel(preview.format)}`}</StatusBadge>
                </div>
                {preview.error ? (
                  <p className="mt-3 text-xs text-amber-900">{preview.error}</p>
                ) : (
                  <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-4">
                    <Info label="Rekeningen" value={String(preview.parsed?.accounts.length ?? 0)} />
                    <Info label="Transacties" value={String(preview.parsed?.transactions.length ?? 0)} />
                    <Info label="Al bekend" value={String(preview.existing)} />
                    <Info label="Netto" value={formatCurrency(total)} />
                  </dl>
                )}
              </article>
            );
          })}
        </div>

      </BankImportConfirmForm>
    </>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-white p-3 shadow-[var(--shadow-sm)]">
      <p className="text-[0.68rem] font-bold uppercase tracking-wide text-[var(--color-text-subtle)]">{label}</p>
      <p className="mt-1 text-lg font-semibold text-brand">{value}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-[var(--color-surface)] p-2">
      <dt className="text-[var(--color-text-subtle)]">{label}</dt>
      <dd className="mt-1 font-semibold text-[var(--color-text)]">{value}</dd>
    </div>
  );
}

function stringOption(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function accountTypeOption(value: unknown) {
  return value === "betaalrekening" || value === "spaarrekening" || value === "beleggingsrekening" || value === "schuld" ? value : undefined;
}

function formatLabel(format: "camt053" | "mt940" | "csv") {
  if (format === "camt053") return "CAMT.053";
  if (format === "mt940") return "MT940";
  return "CSV";
}
