"use client";

import Link from "next/link";
import { Download, FlaskConical, Save, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { ButtonLink, FieldLabel, Input, PageHeader, Select, StatusBadge } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";
import type { ForwardPlanningModel } from "@/modules/finance/forward-planning";
import { buildScenarioComparison, type ScenarioType } from "@/modules/finance/scenario";

export function ScenarioClient({ planning, safeToSpend, safeThrough, canExport }: { planning: ForwardPlanningModel; safeToSpend: number; safeThrough: string; canExport: boolean }) {
  const [type, setType] = useState<ScenarioType>("one_off_expense");
  const [amountText, setAmountText] = useState("250");
  const [startDate, setStartDate] = useState(planning.asOf);
  const [label, setLabel] = useState("Mijn keuze");
  const amount = Number(amountText.replace(",", ".")) || 0;
  const comparison = useMemo(() => buildScenarioComparison({ planning, safeToSpend, safeThrough, scenario: { type, amount, startDate, label } }), [planning, safeToSpend, safeThrough, type, amount, startDate, label]);
  const exportHref = `/api/export/scenario?${new URLSearchParams({ type, amount: String(amount), date: startDate, label }).toString()}`;

  return (
    <>
      <PageHeader
        eyebrow="Proberen zonder gevolgen"
        title="Wat als?"
        description="Bekijk wat een geldkeuze doet voordat je iets opslaat."
        stats={[
          { label: `Veilig tot ${formatDate(safeThrough)}`, value: formatCurrency(comparison.scenario.safeToSpend), detail: comparisonDetail(comparison.baseline.safeToSpend, comparison.difference.safeToSpend), lead: true, tone: comparison.scenario.safeToSpend < 0 ? "risk" : undefined },
          { label: "Laagste saldo", value: formatCurrency(comparison.scenario.lowestBalance), detail: comparisonDetail(comparison.baseline.lowestBalance, comparison.difference.lowestBalance), tone: comparison.scenario.lowestBalance < 0 ? "risk" : undefined },
          { label: `Saldo op ${formatDate(comparison.monthEnd)}`, value: formatCurrency(comparison.scenario.monthEndBalance), detail: comparisonDetail(comparison.baseline.monthEndBalance, comparison.difference.monthEndBalance), tone: comparison.scenario.monthEndBalance < 0 ? "risk" : undefined },
        ]}
        actions={<StatusBadge tone="info"><FlaskConical aria-hidden="true" size={13} /> Tijdelijke berekening</StatusBadge>}
      />

      <section className="mb-8 grid gap-6 xl:grid-cols-[22rem_minmax(0,1fr)]">
        <form className="border border-border bg-[var(--color-panel-strong)] p-5 md:p-6" onSubmit={(event) => event.preventDefault()}>
          <p className="text-[0.62rem] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">Invoer</p>
          <h2 className="mt-2 text-base font-medium text-[var(--color-text)]">Welke keuze wil je testen?</h2>
          <p className="mt-1 text-xs leading-5 text-[var(--color-text-muted)]">Deze invoer verandert geen transacties, budgetten of planning.</p>
          <div className="mt-5 grid gap-4">
            <div><FieldLabel htmlFor="scenario-type">Soort keuze</FieldLabel><Select id="scenario-type" value={type} onChange={(event) => setType(event.target.value as ScenarioType)}><option value="one_off_expense">Eenmalige uitgave</option><option value="monthly_expense">Nieuwe maandlast</option><option value="extra_reservation">Iedere maand extra apart zetten</option><option value="income_change">Inkomen per betaling verandert</option></Select></div>
            <div><FieldLabel htmlFor="scenario-label">Korte naam</FieldLabel><Input id="scenario-label" value={label} maxLength={120} onChange={(event) => setLabel(event.target.value)} /></div>
            <div><FieldLabel htmlFor="scenario-amount">{type === "income_change" ? "Verschil per inkomen (min mag)" : "Bedrag"}</FieldLabel><Input id="scenario-amount" inputMode="decimal" value={amountText} onChange={(event) => setAmountText(event.target.value)} /></div>
            <div><FieldLabel htmlFor="scenario-date">Vanaf welke datum?</FieldLabel><Input id="scenario-date" type="date" min={planning.asOf} max={planning.endDate} value={startDate} onChange={(event) => setStartDate(event.target.value)} /></div>
          </div>
          <div className="mt-5 border-t border-border pt-4 text-xs leading-5 text-[var(--color-text-muted)]"><strong className="block font-medium text-[var(--color-text)]">Nog niet opgeslagen</strong>Wil je dit echt plannen? Voeg het daarna bewust toe aan je planning.</div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
            {canExport ? <ButtonLink href={exportHref} variant="secondary"><Download aria-hidden="true" size={14} /> Exporteer vergelijking</ButtonLink> : null}
            <ButtonLink href="/planning" variant="primary"><Save aria-hidden="true" size={14} /> Naar planning</ButtonLink>
          </div>
        </form>

        <section className="grid content-start gap-6">
          <article className={`border border-l-2 border-border bg-[var(--color-panel-strong)] p-5 md:p-6 ${comparison.scenario.lowestBalance < 0 ? "border-l-[var(--color-warning)]" : "border-l-[var(--color-success)]"}`}>
            <div className="flex items-start gap-3"><ShieldCheck aria-hidden="true" size={18} className="mt-0.5 shrink-0 text-[var(--color-text-muted)]" /><div><p className="text-[0.62rem] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">Conclusie</p><h2 className="mt-2 font-[family-name:var(--font-serif-house)] text-lg font-normal leading-7 text-[var(--color-text)]">{comparison.conclusion}</h2></div></div>
          </article>
          <ScenarioChart points={comparison.points} />
          <p className="text-xs leading-5 text-[var(--color-text-muted)]">Gebaseerd op je huidige planning voor 90 dagen. <Link href="/planning?days=90" className="font-medium text-[var(--color-text)] underline decoration-border underline-offset-4 hover:text-brand">Bekijk de gebruikte geldmomenten</Link>.</p>
        </section>
      </section>
    </>
  );
}

function comparisonDetail(baseline: number, difference: number) {
  return <>Nu {formatCurrency(baseline)} · <span className={difference < 0 ? "text-[var(--color-warning)]" : "text-[var(--color-success)]"}>{difference >= 0 ? "+" : "−"}{formatCurrency(Math.abs(difference))}</span></>;
}

function ScenarioChart({ points }: { points: ReturnType<typeof buildScenarioComparison>["points"] }) {
  const width = 760, height = 280, pad = 34;
  const values = points.flatMap((point) => [point.baseline, point.scenario]);
  const min = Math.min(...values, 0), max = Math.max(...values, 1), span = max - min || 1;
  const x = (index: number) => pad + (index / Math.max(points.length - 1, 1)) * (width - pad * 2);
  const y = (value: number) => pad + ((max - value) / span) * (height - pad * 2);
  const line = (key: "baseline" | "scenario") => points.map((point, index) => `${x(index)},${y(point[key])}`).join(" ");
  return <article className="border border-border bg-[var(--color-panel-strong)] p-5 md:p-6"><div className="mb-4"><p className="text-[0.62rem] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">Verloop</p><h2 className="mt-2 text-base font-medium text-[var(--color-text)]">Hoe verandert je verwachte saldo?</h2><p className="mt-1 text-xs text-[var(--color-text-muted)]">De stippellijn is je huidige pad; de doorgetrokken lijn bevat deze keuze.</p></div><svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label="Vergelijking van het huidige saldoverloop en het tijdelijke scenario"><line x1={pad} x2={width-pad} y1={y(0)} y2={y(0)} stroke="var(--color-border)" strokeDasharray="4 5" /><polyline points={line("baseline")} fill="none" stroke="var(--color-text-subtle)" strokeWidth="3" strokeDasharray="7 6" /><polyline points={line("scenario")} fill="none" stroke="var(--chart-1)" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" /></svg></article>;
}
