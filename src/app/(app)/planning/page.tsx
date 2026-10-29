import Link from "next/link";
import { ArrowDown, ArrowUp, CalendarPlus, Download, FlaskConical } from "lucide-react";
import { Button, ButtonLink, FieldLabel, Input, PageHeader, Select, StatusBadge, SubmitButton } from "@/components/ui";
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
      <PageHeader
        eyebrow="Vooruit"
        title={`De komende ${horizonDays} dagen`}
        description="Alle verwachte geldmomenten, gegroepeerd per week."
        stats={[
          { label: "Laagste verwachte ruimte", value: formatCurrency(model.lowestBalance), detail: `binnen ${horizonDays} dagen`, lead: true, tone: model.lowestBalance < 0 ? "risk" : undefined },
          { label: "Nu op betaalrekeningen", value: formatCurrency(model.openingBalance), detail: `Peildatum ${formatDate(model.asOf)}` },
          { label: `Stand na ${horizonDays} dagen`, value: formatCurrency(model.closingBalance), detail: formatDate(model.endDate) },
          { label: "Geldmomenten", value: model.events.length, detail: `${model.weeks.length} ${model.weeks.length === 1 ? "week" : "weken"}` },
        ]}
        actions={
          <>
            <nav aria-label="Planningshorizon" className="flex border border-border bg-[var(--color-panel-strong)]">
              {[30, 60, 90].map((days) => <Link key={days} href={`/planning?days=${days}`} className={`grid min-h-9 place-items-center border-r border-border px-3 text-[0.66rem] last:border-r-0 uppercase tracking-[0.14em] ${horizonDays === days ? "bg-brand text-[var(--color-on-brand)]" : "text-[var(--color-text)] hover:bg-[var(--color-surface)]"}`}>{days} dagen</Link>)}
            </nav>
            <ButtonLink href="/scenario" variant="secondary"><FlaskConical aria-hidden="true" size={14} /> Wat als?</ButtonLink>
            {canMutate ? <ButtonLink href={`/api/export/forward?days=${horizonDays}`} variant="secondary"><Download aria-hidden="true" size={14} /> Exporteer CSV</ButtonLink> : null}
          </>
        }
      />

      <CashflowBudgetBridge advice={cashflowAdvice} />

      {canMutate ? (
        <details className="planning-editor mb-8 border border-border bg-[var(--color-panel-strong)]">
          <summary><span className="inline-flex items-center gap-2"><CalendarPlus aria-hidden="true" size={16} className="text-[var(--color-text-muted)]" /> Eenmalig geldmoment toevoegen</span></summary>
          <form action={saveOneOffCashEvent} className="grid gap-4 p-5 pt-1 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_9rem_9rem_11rem_minmax(11rem,1fr)_auto] xl:items-end">
            <div><FieldLabel htmlFor="event-label">Naam</FieldLabel><Input id="event-label" name="label" placeholder="Reparatie fiets" required /></div>
            <div><FieldLabel htmlFor="event-amount">Bedrag</FieldLabel><Input id="event-amount" name="amount" inputMode="decimal" placeholder="125,00" required /></div>
            <div><FieldLabel htmlFor="event-direction">Richting</FieldLabel><Select id="event-direction" name="direction"><option value="expense">Uitgave</option><option value="income">Inkomen</option></Select></div>
            <div><FieldLabel htmlFor="event-date">Datum</FieldLabel><Input id="event-date" name="dueOn" type="date" min={model.asOf} max={model.endDate} required /></div>
            <div><FieldLabel htmlFor="event-account">Rekening</FieldLabel><Select id="event-account" name="accountId"><option value="">Nog niet bepaald</option>{accounts.filter((account) => account.type === "betaalrekening").map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</Select></div>
            <SubmitButton variant="primary" pendingLabel="Toevoegen...">Toevoegen</SubmitButton>
          </form>
        </details>
      ) : null}

      <section className="mb-8 space-y-6" aria-labelledby="forward-timeline-title">
        <div className="section-head !mb-0"><h2 id="forward-timeline-title">Van week tot week</h2><p>Elk verwacht geldmoment met de ruimte die er daarna overblijft.</p></div>
        {model.weeks.map((week) => (
          <section key={week.key} className="border border-border bg-[var(--color-panel-strong)]">
            <header className="flex flex-wrap items-end justify-between gap-3 border-b border-border px-5 py-4 md:px-6"><div><h3 className="text-sm font-medium text-[var(--color-text)]">{week.label}</h3><p className="mt-1 text-[0.62rem] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">{week.events.length} moment{week.events.length === 1 ? "" : "en"}</p></div><span className="text-[0.62rem] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">Laagste ruimte <strong className="money-value ml-2 text-sm font-light normal-case tracking-normal text-[var(--color-text)]">{formatCurrency(week.lowestBalance)}</strong></span></header>
            <div className="divide-y divide-border">
              {week.events.map((event) => (
                <article key={event.eventKey} className="grid gap-3 px-5 py-4 sm:grid-cols-[5.5rem_minmax(0,1fr)_auto] sm:items-center md:px-6">
                  <time dateTime={event.date} className="text-xs text-[var(--color-text-muted)]">{formatDate(event.date)}</time>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2"><span className={event.direction === "income" ? "text-[var(--color-success)]" : "text-[var(--color-text-muted)]"}>{event.direction === "income" ? <ArrowDown aria-hidden="true" size={14} /> : <ArrowUp aria-hidden="true" size={14} />}</span><strong className="truncate text-sm font-medium text-[var(--color-text)]">{event.label}</strong><StatusBadge tone={forecastStatusTone(event.status)}>{FORECAST_STATUS_LABELS[event.status]}</StatusBadge></div>
                    <p className="mt-1 text-xs text-[var(--color-text-muted)]">{event.accountLabel} · {event.frequency ? frequencyLabel(event.frequency) : "Eenmalig"} · ruimte erna {formatCurrency(event.projectedBalance)}</p>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <strong className={`money-value min-w-24 text-right font-light ${event.direction === "income" ? "text-[var(--color-success)]" : "text-[var(--color-text)]"}`}>{event.direction === "income" ? "+" : "−"}{formatCurrency(event.amount)}</strong>
                    {event.sourceType === "one_off" && canMutate ? <form action={removeOneOffCashEvent}><input type="hidden" name="eventId" value={event.sourceId} /><Button type="submit" size="sm" variant="ghost">Verwijderen</Button></form> : <Link href={event.sourceHref} className="inline-flex min-h-8 items-center px-2 text-[0.66rem] uppercase tracking-[0.1em] text-[var(--color-text)] hover:bg-[var(--color-surface)]">{event.estimated ? "Bevestigen" : "Wijzigen"}</Link>}
                    {event.estimated && canMutate ? <form action={makeForecastEventOneOff}><input type="hidden" name="sourceType" value={event.sourceType} /><input type="hidden" name="sourceId" value={event.sourceId} /><input type="hidden" name="label" value={event.label} /><input type="hidden" name="amount" value={event.amount} /><input type="hidden" name="direction" value={event.direction} /><input type="hidden" name="dueOn" value={event.date} /><Button type="submit" size="sm" variant="ghost">Eenmalig maken</Button></form> : null}
                    {event.sourceType !== "one_off" && canMutate ? <form action={skipOneForecastOccurrence}><input type="hidden" name="eventKey" value={event.eventKey} /><input type="hidden" name="label" value={event.label} /><input type="hidden" name="occurrenceDate" value={event.date} /><Button type="submit" size="sm" variant="ghost">Overslaan</Button></form> : null}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
        {!model.events.length ? <p className="border border-border bg-[var(--color-panel-strong)] p-8 text-center text-sm text-[var(--color-text-muted)]">Nog geen geldmomenten in deze periode. Voeg een eenmalig moment toe of plan inkomen en vaste lasten.</p> : null}
      </section>

      {skippedEvents.length ? <details className="planning-editor mb-8 border border-border bg-[var(--color-panel-strong)]"><summary>Overgeslagen momenten ({skippedEvents.length})</summary><div className="divide-y divide-border border-t border-border">{skippedEvents.map((event) => <div key={event.eventKey} className="flex flex-wrap items-center justify-between gap-2 px-5 py-4 text-xs"><span><strong className="font-medium text-[var(--color-text)]">{event.label}</strong><span className="ml-2 text-[var(--color-text-muted)]">{formatDate(event.occurrenceDate)}</span></span>{canMutate ? <form action={undoSkippedForecastOccurrence}><input type="hidden" name="eventKey" value={event.eventKey} /><Button type="submit" size="sm" variant="secondary">Terugzetten</Button></form> : null}</div>)}</div></details> : null}
    </div>
  );
}

function parseHorizon(value?: string): 30 | 60 | 90 {
  return value === "60" ? 60 : value === "90" ? 90 : 30;
}

function frequencyLabel(value: string) {
  return value === "vierwekelijks" ? "Elke 4 weken" : value === "kwartaal" ? "Per kwartaal" : value === "jaarlijks" ? "Jaarlijks" : "Maandelijks";
}
