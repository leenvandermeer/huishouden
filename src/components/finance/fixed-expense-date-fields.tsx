"use client";

import { useState } from "react";
import { FieldLabel, Input, Select } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { dueDateConfidenceLabel, type DueDateConfidence } from "@/modules/finance/fixed-expense-date";

interface FixedExpenseDateFieldsProps {
  idPrefix: string;
  form?: string;
  manualDate?: string;
  estimatedDate?: string;
  confidence?: DueDateConfidence;
  evidenceCount?: number;
  expired?: boolean;
  compact?: boolean;
}

export function FixedExpenseDateFields({ idPrefix, form, manualDate, estimatedDate, confidence, evidenceCount = 0, expired = false, compact = false }: FixedExpenseDateFieldsProps) {
  const [mode, setMode] = useState<"automatic" | "manual">(manualDate ? "manual" : "automatic");
  const [date, setDate] = useState(manualDate ?? "");
  const modeId = `${idPrefix}-date-mode`;
  const dateId = `${idPrefix}-due-date`;

  return (
    <div className={compact ? "grid gap-1.5" : "grid gap-2"}>
      {!compact ? <FieldLabel htmlFor={modeId}>Datum bepalen</FieldLabel> : null}
      <Select id={modeId} name="dueDateMode" form={form} value={mode} onChange={(event) => setMode(event.target.value as "automatic" | "manual")} aria-label={compact ? "Datum bepalen" : undefined}>
        <option value="automatic">Automatisch schatten</option>
        <option value="manual">Zelf datum kiezen</option>
      </Select>

      {mode === "manual" ? (
        <>
          {!compact ? <FieldLabel htmlFor={dateId}>Volgende afschrijving</FieldLabel> : null}
          <Input id={dateId} name="nextDueOn" form={form} type="date" value={date} onChange={(event) => setDate(event.target.value)} required aria-label={compact ? "Volgende afschrijving" : undefined} />
          {expired && date === manualDate ? <p className="text-[0.68rem] font-semibold text-[var(--color-warning)]">Datum verlopen — kies een nieuwe datum of schakel terug naar automatisch.</p> : <p className="text-[0.68rem] text-[var(--color-text-subtle)]">Zelf ingevuld</p>}
        </>
      ) : (
        <p className="text-[0.68rem] leading-4 text-[var(--color-text-subtle)]">
          {estimatedDate
            ? `Schatting: ${formatDate(estimatedDate)} · ${dueDateConfidenceLabel(confidence)} zekerheid · gebaseerd op ${evidenceCount} afschrijving${evidenceCount === 1 ? "" : "en"}`
            : "Na opslaan schatten we de datum zodra eerdere afschrijvingen beschikbaar zijn."}
        </p>
      )}
    </div>
  );
}
