import Link from "next/link";
import { ArrowDown, ArrowUp, CalendarPlus, Download, FlaskConical } from "lucide-react";
import { Button, ButtonLink, FieldLabel, Input, Select, StatusBadge, SubmitButton } from "@/components/ui";
import { CashflowBudgetBridge } from "@/components/finance/cashflow-budget-bridge";
import { formatCurrency, formatDate } from "@/lib/format";
import { requireUser } from "@/modules/auth/service";
import { makeForecastEventOneOff, removeOneOffCashEvent, saveOneOffCashEvent, skipOneForecastOccurrence, undoSkippedForecastOccurrence } from "@/modules/finance/actions";
import { getBudgets, getFinanceDataset } from "@/modules/finance/data-source";
import { buildCashflowBudgetAdvice } from "@/modules/finance/cashflow-budget-advice";
import { FORECAST_STATUS_LABELS, forecastStatusTone } from "@/modules/finance/forecast-evidence";
import { getForwardPlanningFromDatabase } from "@/modules/finance/forward-planning-service";
import { getCashflowByMonth } from "@/modules/finance/reporting";

export default async function PlanningPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const params = (await searchParams) ?? {};
  const horizonDays = parseHorizon(Array.isArray(params.days) ? params.days[0] : params.days);
  const month = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Amsterdam", year: "numeric", month: "2-digit" }).format(new Date());
  const [user, planning, budgets, dataset] = await Promise.all([
    requireUser(),
    getForwardPlanningFromDatabase(horizonDays),
    getBudgets(month),
    getFinanceDataset(),
  ]);
  const { model, accounts, skippedEvents } = planning;
  const canMutate = user.role !== "readonly";
  const selectedCashflow = getCashflowByMonth(dataset.transactions).find((row) => row.month === month);
  const cashflowAdvice = buildCashflowBudgetAdvice({ historicalNet: selectedCashflow?.spendableNet, planning: model, budgets, categories: dataset.categories });

  return (
    <div className="planning-home">
      <header className="editorial-page-header">
        <p>Vooruit</p>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><h1>De komende {horizonDays} dagen</h1><span>Alle verwachte geldmomenten, gegroepeerd per week.</span></div>
          <div className="flex flex-wrap gap-2">
            <nav aria-label="Planningshorizon" className="flex rounded-xl border border-border bg-white p-1">
              {[30, 60, 90].map((days) => <Link key={days} href={`/planning?days=${days}`} className={`grid min-h-9 place-items-center rounded-lg px-3 text-xs font-bold ${horizonDays === days ? "bg-brand text-white" : "text-brand hover:bg-[var(--color-brand-subtle)]"}`}>{days} dagen</Link>)}
            </nav>
            <ButtonLink href="/scenario" variant="secondary"><FlaskConical aria-hidden="true" size={14} /> Wat als?</ButtonLink>
            {canMutate ? <ButtonLink href={`/api/export/forward?days=${horizonDays}`} variant="secondary"><Download aria-hidden="true" size={14} /> Exporteer CSV</ButtonLink> : null}
          </div>
        </div>
      </header>

      <section className="grid gap-3 md:grid-cols-3" aria-label="Samenvatting vooruit">
        <PlanningMetric label="Nu op betaalrekeningen" value={formatCurrency(model.openingBalance)} />
        <PlanningMetric label="Laagste verwachte ruimte" value={formatCurrency(model.lowestBalance)} tone={model.lowestBalance < 0 ? "warning" : "success"} />
        <PlanningMetric label={`Stand na ${horizonDays} dagen`} value={formatCurrency(model.closingBalance)} />
      </section>

      <CashflowBudgetBridge advice={cashflowAdvice} />

      {canMutate ? (
        <details className="planning-editor my-3 rounded-[var(--radius-lg)] border border-border bg-white">
          <summary><span className="inline-flex items-center gap-2"><CalendarPlus aria-hidden="true" size={16} /> Eenmalig geldmoment toevoegen</span></summary>
          <form action={saveOneOffCashEvent} className="grid gap-3 p-4 pt-1 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_9rem_9rem_11rem_minmax(11rem,1fr)_auto] xl:items-end">
            <div><FieldLabel htmlFor="event-label">Naam</FieldLabel><Input id="event-label" name="label" placeholder="Reparatie fiets" required /></div>
            <div><FieldLabel htmlFor="event-amount">Bedrag</FieldLabel><Input id="event-amount" name="amount" inputMode="decimal" placeholder="125,00" required /></div>
            <div><FieldLabel htmlFor="event-direction">Richting</FieldLabel><Select id="event-direction" name="direction"><option value="expense">Uitgave</option><option value="income">Inkomen</option></Select></div>
            <div><FieldLabel htmlFor="event-date">Datum</FieldLabel><Input id="event-date" name="dueOn" type="date" min={model.asOf} max={model.endDate} required /></div>
            <div><FieldLabel htmlFor="event-account">Rekening</FieldLabel><Select id="event-account" name="accountId"><option value="">Nog niet bepaald</option>{accounts.filter((account) => account.type === "betaalrekening").map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</Select></div>
            <SubmitButton variant="primary" pendingLabel="Toevoegen...">Toevoegen</SubmitButton>
          </form>
        </details>
      ) : null}

      <section className="mt-3 space-y-3" aria-labelledby="forward-timeline-title">
        <div className="flex flex-wrap items-end justify-between gap-2"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">Tijdlijn</p><h2 id="forward-timeline-title" className="mt-1 text-2xl font-semibold text-brand">Van week tot week</h2></div><StatusBadge tone="info">{model.events.length} geldmomenten</StatusBadge></div>
        {model.weeks.map((week) => (
          <section key={week.key} className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-white shadow-[var(--shadow-sm)]">
            <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-[var(--color-surface)] px-4 py-3"><div><h3 className="text-sm font-bold text-brand">{week.label}</h3><p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{week.events.length} moment{week.events.length === 1 ? "" : "en"}</p></div><span className="text-xs text-[var(--color-text-muted)]">Laagste ruimte <strong className="ml-1 tabular-nums text-brand">{formatCurrency(week.lowestBalance)}</strong></span></header>
            <div className="divide-y divide-border">
              {week.events.map((event) => (
                <article key={event.eventKey} className="grid gap-3 px-4 py-3 sm:grid-cols-[5.5rem_minmax(0,1fr)_auto] sm:items-center">
                  <time dateTime={event.date} className="text-xs font-bold text-brand">{formatDate(event.date)}</time>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2"><span className={`grid h-7 w-7 place-items-center rounded-lg ${event.direction === "income" ? "bg-[var(--color-success-subtle)] text-emerald-700" : "bg-[var(--color-brand-subtle)] text-brand"}`}>{event.direction === "income" ? <ArrowDown aria-hidden="true" size={14} /> : <ArrowUp aria-hidden="true" size={14} />}</span><strong className="truncate text-sm text-brand">{event.label}</strong><StatusBadge tone={forecastStatusTone(event.status)}>{FORECAST_STATUS_LABELS[event.status]}</StatusBadge></div>
                    <p className="mt-1 text-xs text-[var(--color-text-muted)]">{event.accountLabel} · {event.frequency ? frequencyLabel(event.frequency) : "Eenmalig"} · ruimte erna {formatCurrency(event.projectedBalance)}</p>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <strong className={`min-w-24 text-right tabular-nums ${event.direction === "income" ? "text-emerald-700" : "text-[var(--color-text)]"}`}>{event.direction === "income" ? "+" : "−"}{formatCurrency(event.amount)}</strong>
                    {event.sourceType === "one_off" && canMutate ? <form action={removeOneOffCashEvent}><input type="hidden" name="eventId" value={event.sourceId} /><Button type="submit" size="sm" variant="ghost">Verwijderen</Button></form> : <Link href={event.sourceHref} className="inline-flex min-h-8 items-center rounded-lg px-2 text-xs font-semibold text-brand hover:bg-[var(--color-brand-subtle)]">{event.estimated ? "Bevestigen" : "Wijzigen"}</Link>}
                    {event.estimated && canMutate ? <form action={makeForecastEventOneOff}><input type="hidden" name="sourceType" value={event.sourceType} /><input type="hidden" name="sourceId" value={event.sourceId} /><input type="hidden" name="label" value={event.label} /><input type="hidden" name="amount" value={event.amount} /><input type="hidden" name="direction" value={event.direction} /><input type="hidden" name="dueOn" value={event.date} /><Button type="submit" size="sm" variant="ghost">Eenmalig maken</Button></form> : null}
                    {event.sourceType !== "one_off" && canMutate ? <form action={skipOneForecastOccurrence}><input type="hidden" name="eventKey" value={event.eventKey} /><input type="hidden" name="label" value={event.label} /><input type="hidden" name="occurrenceDate" value={event.date} /><Button type="submit" size="sm" variant="ghost">Overslaan</Button></form> : null}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
        {!model.events.length ? <p className="rounded-[var(--radius-lg)] border border-border bg-white p-6 text-center text-sm text-[var(--color-text-muted)]">Nog geen geldmomenten in deze periode. Voeg een eenmalig moment toe of plan inkomen en vaste lasten.</p> : null}
      </section>

      {skippedEvents.length ? <details className="planning-editor mt-3 rounded-[var(--radius-lg)] border border-border bg-white"><summary>Overgeslagen momenten ({skippedEvents.length})</summary><div className="divide-y divide-border border-t border-border">{skippedEvents.map((event) => <div key={event.eventKey} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-xs"><span><strong className="text-brand">{event.label}</strong><span className="ml-2 text-[var(--color-text-muted)]">{formatDate(event.occurrenceDate)}</span></span>{canMutate ? <form action={undoSkippedForecastOccurrence}><input type="hidden" name="eventKey" value={event.eventKey} /><Button type="submit" size="sm" variant="secondary">Terugzetten</Button></form> : null}</div>)}</div></details> : null}
    </div>
  );
}

function PlanningMetric({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "success" | "warning" }) {
  return <article className={`rounded-[var(--radius-lg)] border p-4 ${tone === "warning" ? "border-amber-200 bg-[var(--color-warning-subtle)]" : "border-border bg-white"}`}><p className="text-xs font-semibold text-[var(--color-text-muted)]">{label}</p><strong className={`mt-2 block text-2xl font-bold tabular-nums ${tone === "success" ? "text-emerald-700" : "text-brand"}`}>{value}</strong></article>;
}

function parseHorizon(value?: string): 30 | 60 | 90 {
  return value === "60" ? 60 : value === "90" ? 90 : 30;
}

function frequencyLabel(value: string) {
  return value === "vierwekelijks" ? "Elke 4 weken" : value === "kwartaal" ? "Per kwartaal" : value === "jaarlijks" ? "Jaarlijks" : "Maandelijks";
}
