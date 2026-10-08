"use client";

import Link from "next/link";
import { Download, FlaskConical, Save, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { ButtonLink, FieldLabel, Input, Select, StatusBadge } from "@/components/ui";
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
    <div className="grid gap-4">
      <header className="editorial-page-header">
        <p>Proberen zonder gevolgen</p>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><h1>Wat als?</h1><span>Bekijk wat een geldkeuze doet voordat je iets opslaat.</span></div>
          <StatusBadge tone="info"><FlaskConical aria-hidden="true" size={13} /> Tijdelijke berekening</StatusBadge>
        </div>
      </header>

      <section className="grid gap-4 xl:grid-cols-[22rem_minmax(0,1fr)]">
        <form className="surface-panel rounded-[var(--radius-lg)] p-4" onSubmit={(event) => event.preventDefault()}>
          <h2 className="text-base font-semibold text-brand">Welke keuze wil je testen?</h2>
          <p className="mt-1 text-xs leading-5 text-[var(--color-text-muted)]">Deze invoer verandert geen transacties, budgetten of planning.</p>
          <div className="mt-4 grid gap-3">
            <div><FieldLabel htmlFor="scenario-type">Soort keuze</FieldLabel><Select id="scenario-type" value={type} onChange={(event) => setType(event.target.value as ScenarioType)}><option value="one_off_expense">Eenmalige uitgave</option><option value="monthly_expense">Nieuwe maandlast</option><option value="extra_reservation">Iedere maand extra apart zetten</option><option value="income_change">Inkomen per betaling verandert</option></Select></div>
            <div><FieldLabel htmlFor="scenario-label">Korte naam</FieldLabel><Input id="scenario-label" value={label} maxLength={120} onChange={(event) => setLabel(event.target.value)} /></div>
            <div><FieldLabel htmlFor="scenario-amount">{type === "income_change" ? "Verschil per inkomen (min mag)" : "Bedrag"}</FieldLabel><Input id="scenario-amount" inputMode="decimal" value={amountText} onChange={(event) => setAmountText(event.target.value)} /></div>
            <div><FieldLabel htmlFor="scenario-date">Vanaf welke datum?</FieldLabel><Input id="scenario-date" type="date" min={planning.asOf} max={planning.endDate} value={startDate} onChange={(event) => setStartDate(event.target.value)} /></div>
          </div>
          <div className="mt-4 rounded-xl border border-border bg-[var(--color-surface)] p-3 text-xs leading-5 text-[var(--color-text-muted)]"><strong className="block text-brand">Nog niet opgeslagen</strong>Wil je dit echt plannen? Voeg het daarna bewust toe aan je planning.</div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
            {canExport ? <ButtonLink href={exportHref} variant="secondary"><Download aria-hidden="true" size={14} /> Exporteer vergelijking</ButtonLink> : null}
            <ButtonLink href="/planning" variant="primary"><Save aria-hidden="true" size={14} /> Naar planning</ButtonLink>
          </div>
        </form>

        <section className="grid gap-3">
          <article className={`rounded-[var(--radius-lg)] border p-4 ${comparison.scenario.lowestBalance < 0 ? "border-amber-300 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}>
            <div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-brand"><ShieldCheck aria-hidden="true" size={18} /></span><div><p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-text-subtle)]">Conclusie</p><h2 className="mt-1 text-lg font-semibold leading-7 text-brand">{comparison.conclusion}</h2></div></div>
          </article>
          <div className="grid gap-3 sm:grid-cols-3">
            <ComparisonMetric label={`Veilig tot ${formatDate(safeThrough)}`} baseline={comparison.baseline.safeToSpend} scenario={comparison.scenario.safeToSpend} difference={comparison.difference.safeToSpend} />
            <ComparisonMetric label="Laagste saldo" baseline={comparison.baseline.lowestBalance} scenario={comparison.scenario.lowestBalance} difference={comparison.difference.lowestBalance} />
            <ComparisonMetric label={`Saldo op ${formatDate(comparison.monthEnd)}`} baseline={comparison.baseline.monthEndBalance} scenario={comparison.scenario.monthEndBalance} difference={comparison.difference.monthEndBalance} />
          </div>
          <ScenarioChart points={comparison.points} />
          <p className="text-xs leading-5 text-[var(--color-text-muted)]">Gebaseerd op je huidige planning voor 90 dagen. <Link href="/planning?days=90" className="font-semibold text-brand hover:underline">Bekijk de gebruikte geldmomenten</Link>.</p>
        </section>
      </section>
    </div>
  );
}

function ComparisonMetric({ label, baseline, scenario, difference }: { label: string; baseline: number; scenario: number; difference: number }) {
  return <article className="surface-panel rounded-[var(--radius-lg)] p-3"><p className="text-xs font-semibold text-[var(--color-text-muted)]">{label}</p><strong className="money-value mt-2 block text-xl text-brand">{formatCurrency(scenario)}</strong><p className="mt-1 text-xs text-[var(--color-text-subtle)]">Nu {formatCurrency(baseline)} · <span className={difference < 0 ? "text-amber-800" : "text-emerald-700"}>{difference >= 0 ? "+" : "−"}{formatCurrency(Math.abs(difference))}</span></p></article>;
}

function ScenarioChart({ points }: { points: ReturnType<typeof buildScenarioComparison>["points"] }) {
  const width = 760, height = 280, pad = 34;
  const values = points.flatMap((point) => [point.baseline, point.scenario]);
  const min = Math.min(...values, 0), max = Math.max(...values, 1), span = max - min || 1;
  const x = (index: number) => pad + (index / Math.max(points.length - 1, 1)) * (width - pad * 2);
  const y = (value: number) => pad + ((max - value) / span) * (height - pad * 2);
  const line = (key: "baseline" | "scenario") => points.map((point, index) => `${x(index)},${y(point[key])}`).join(" ");
  return <article className="surface-panel rounded-[var(--radius-lg)] p-3"><div className="mb-2"><h2 className="text-sm font-semibold text-brand">Hoe verandert je verwachte saldo?</h2><p className="mt-1 text-xs text-[var(--color-text-muted)]">De stippellijn is je huidige pad; de paarse lijn bevat deze keuze.</p></div><svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label="Vergelijking van het huidige saldoverloop en het tijdelijke scenario"><line x1={pad} x2={width-pad} y1={y(0)} y2={y(0)} stroke="#cbd5e1" strokeDasharray="4 5" /><polyline points={line("baseline")} fill="none" stroke="#64748b" strokeWidth="3" strokeDasharray="7 6" /><polyline points={line("scenario")} fill="none" stroke="#6c5a8d" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" /></svg></article>;
}
