import Link from "next/link";
import { AlertCircle, ArrowDown, ArrowRight, ArrowUp, Download, Lightbulb, ShieldCheck } from "lucide-react";
import { MoneyRunway } from "@/components/finance/money-runway";
import { PrivacyToggle } from "@/components/layout/privacy-toggle";
import { StatusBadge } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";
import { getDashboardSummaryFromDatabase, type DashboardCashflowForecast } from "@/modules/finance/repository";
import { getBudgets, getFinanceDataset } from "@/modules/finance/data-source";
import { getDailyMoneyInsight } from "@/modules/finance/budget-guidance";
import { FINANCIAL_TERMS } from "@/modules/finance/financial-contract";
import { FORECAST_STATUS_LABELS, forecastStatusTone } from "@/modules/finance/forecast-evidence";
import { requireUser } from "@/modules/auth/service";
import { ProductSignal } from "@/components/product/product-signal";

export default async function DashboardPage() {
  const [dashboard, dataset, user] = await Promise.all([getDashboardSummaryFromDatabase(), getFinanceDataset(), requireUser()]);
  const forecast = dashboard.cashflowForecast;
  const currentMonth = forecast.asOf.slice(0, 7);
  const budgets = await getBudgets(currentMonth);
  const insight = getDailyMoneyInsight({ transactions: dataset.transactions, categories: dataset.categories, budgets, month: currentMonth, forecast, reviewCount: dashboard.reviewCount });
  const expenses = forecast.timeline.filter((item) => item.type === "expense");
  const availableIsPositive = forecast.availableToSpend >= 0;
  const horizon = forecast.nextIncome ? `${forecast.nextIncome.label} op ${formatCompactDate(forecast.nextIncome.date)}` : "het einde van de maand";

  return (
    <div className="today-screen">
      {forecast.state === "setup" ? <ProductSignal eventType="source.missing_income" /> : null}
      {forecast.state !== "planned" && forecast.state !== "setup" ? <ProductSignal eventType="source.estimated" /> : null}
      <header className="today-titlebar">
        <div>
          <p>{formatToday()}</p>
          <h1>Vandaag</h1>
          <span>Dit is hoe je geld er vandaag voor staat.</span>
        </div>
        <div className="flex items-center gap-2">
          <PrivacyToggle />
          <ForecastBadge state={forecast.state} />
        </div>
      </header>

      <section className={`runway-stage ${availableIsPositive ? "runway-stage--safe" : "runway-stage--risk"}`}>
        <div className="runway-stage__intro">
          <span className="runway-kicker"><ShieldCheck aria-hidden="true" size={17} /> Veilig te besteden tot {horizon}</span>
          <strong className="money-value">{formatCurrency(forecast.availableToSpend)}</strong>
          <p>
            Na {expenses.length} betaling{expenses.length === 1 ? "" : "en"}
            {forecast.daysUntilIncome != null ? `. Volgend inkomen over ${forecast.daysUntilIncome} ${forecast.daysUntilIncome === 1 ? "dag" : "dagen"}.` : "."}
          </p>
        </div>
        <MoneyRunway forecast={forecast} />
        <div className="runway-stage__footer">
          <span><small>Per dag</small><strong className="money-value">{forecast.dailyAmount != null ? formatCurrency(forecast.dailyAmount) : "—"}</strong></span>
          <span><small>Verwachte uitgaven tot inkomen</small><strong className="money-value">{formatCurrency(forecast.expectedBudgetExpenses)}</strong></span>
          {forecast.nextIncome ? <span><small>Volgend inkomen</small><strong className="money-value">+{formatCurrency(forecast.nextIncome.amount)}</strong></span> : null}
        </div>
      </section>

      <div className={`today-observation today-observation--${insight.tone}`}>
        <span className="today-observation__icon">{insight.tone === "attention" ? <AlertCircle aria-hidden="true" size={18} /> : insight.tone === "neutral" ? <Lightbulb aria-hidden="true" size={18} /> : <ShieldCheck aria-hidden="true" size={18} />}</span>
        <p>
          <strong>{insight.title}</strong> {insight.detail}
        </p>
        <Link href={insight.href}>{insight.actionLabel} <ArrowRight aria-hidden="true" size={14} /></Link>
      </div>

      <details className="runway-breakdown">
        <summary>Waarom dit bedrag? <ArrowRight aria-hidden="true" size={15} /></summary>
        <dl>
          <BreakdownRow label={FINANCIAL_TERMS.bankBalance.label} value={forecast.paymentBalance} href="/vermogen" />
          <BreakdownRow label={FINANCIAL_TERMS.scheduledExpenses.label} value={-forecast.scheduledExpenses} />
          <BreakdownRow label={FINANCIAL_TERMS.expectedBudgetExpenses.label} value={-forecast.expectedBudgetExpenses} hint="Naar tijd berekend uit je maandbudgetten" />
          {forecast.explicitReservations > 0 ? <BreakdownRow label={FINANCIAL_TERMS.explicitReservations.label} value={-forecast.explicitReservations} /> : null}
          {forecast.uncertaintyMargin > 0 ? <BreakdownRow label={FINANCIAL_TERMS.uncertaintyMargin.label} value={-forecast.uncertaintyMargin} hint="Voor geschatte datums met beperkte zekerheid" /> : null}
          <BreakdownRow label={FINANCIAL_TERMS.safeToSpend.label} value={forecast.availableToSpend} strong />
        </dl>
        <div className="forecast-evidence mt-4 border-t border-border pt-3">
          <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-text-subtle)]">Gebruikte bronnen</h3><span className="flex items-center gap-3">{user.role !== "readonly" ? <Link href="/api/export/today" className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"><Download aria-hidden="true" size={13} /> Exporteer CSV</Link> : null}<Link href="/vaste-lasten#income-planning" className="text-xs font-semibold text-brand hover:underline">Inkomsten beheren</Link></span></div>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            {forecast.incomeSources.map((source) => (
              <article key={source.id} className="rounded-xl border border-border bg-white p-3 text-xs">
                <div className="flex items-start justify-between gap-2"><span><strong className="block text-brand">{source.label}</strong><small className="mt-1 block text-[var(--color-text-muted)]">{source.evidenceCount ? `${source.evidenceCount} perioden · ${formatCurrency(source.minimumAmount)}–${formatCurrency(source.maximumAmount)}` : "Handmatig beheerd"}</small></span><StatusBadge tone={forecastStatusTone(source.status)}>{FORECAST_STATUS_LABELS[source.status]}</StatusBadge></div>
                <div className="mt-2 flex items-center justify-between gap-2"><span className="font-semibold">{formatDate(source.date)} · {formatCurrency(source.amount)}</span><Link href={`/transacties?q=${encodeURIComponent(source.label)}&kind=inkomen`} className="text-brand hover:underline">Bronnen</Link></div>
              </article>
            ))}
            <article className="rounded-xl border border-border bg-white p-3 text-xs">
              <div className="flex items-start justify-between gap-2"><span><strong className="block text-brand">Vaste lasten</strong><small className="mt-1 block text-[var(--color-text-muted)]">{expenses.length} betaling{expenses.length === 1 ? "" : "en"} tot {formatDate(forecast.horizon.date)}</small></span><StatusBadge tone={expenses.some((expense) => expense.estimated) ? "info" : "success"}>{expenses.some((expense) => expense.estimated) ? "Deels geschat" : "Zelf ingevuld"}</StatusBadge></div>
              <div className="mt-2 flex items-center justify-between gap-2"><span className="font-semibold">{formatCurrency(forecast.scheduledExpenses)}</span><Link href="/vaste-lasten" className="text-brand hover:underline">Bekijk bronnen</Link></div>
            </article>
            <article className="rounded-xl border border-border bg-white p-3 text-xs">
              <div className="flex items-start justify-between gap-2"><span><strong className="block text-brand">Maandbudgetten</strong><small className="mt-1 block text-[var(--color-text-muted)]">Naar tijd omgerekend tot {formatDate(forecast.horizon.date)}</small></span><StatusBadge tone="info">Berekend</StatusBadge></div>
              <div className="mt-2 flex items-center justify-between gap-2"><span className="font-semibold">{formatCurrency(forecast.expectedBudgetExpenses)}</span><Link href={`/budgetten?month=${currentMonth}`} className="text-brand hover:underline">Bekijk budgetten</Link></div>
            </article>
          </div>
        </div>
        <p className="mt-3 text-[0.68rem] text-[var(--color-text-subtle)]">Peildatum {formatDate(forecast.asOf)} · horizon {formatDate(forecast.horizon.date)} · rekencontract {forecast.calculationVersion}</p>
        {forecast.state !== "planned" ? (
          <Link href="/vaste-lasten#income-planning" className="runway-breakdown__action">
            {forecast.state === "setup" ? "Inkomen plannen" : "Schattingen controleren"} <ArrowRight aria-hidden="true" size={14} />
          </Link>
        ) : null}
      </details>

      <section className="upcoming-stream" aria-labelledby="upcoming-title">
        <div className="upcoming-stream__header">
          <div>
            <p>Binnenkort</p>
            <h2 id="upcoming-title">Wat komt eraan?</h2>
          </div>
          <Link href="/vaste-lasten">Alle betalingen <ArrowRight aria-hidden="true" size={14} /></Link>
        </div>
        <div className="upcoming-stream__list">
          {forecast.timeline.slice(0, 4).map((item) => (
            <article key={`${item.type}-${item.id}-${item.date}`}>
              <time dateTime={item.date}>{formatDay(item.date)}<small>{formatMonth(item.date)}</small></time>
              <span className={item.type === "income" ? "money-moment money-moment--income" : "money-moment"}>
                {item.type === "income" ? <ArrowDown aria-hidden="true" size={17} /> : <ArrowUp aria-hidden="true" size={17} />}
              </span>
              <span className="min-w-0">
                <strong><Link href={item.sourceHref} className="hover:text-brand hover:underline">{item.label}</Link></strong>
                <small>{FORECAST_STATUS_LABELS[item.status]} · {formatDate(item.date)}</small>
              </span>
              <strong className={item.type === "income" ? "money-value text-emerald-700" : "money-value"}>{item.type === "income" ? "+" : "−"}{formatCurrency(item.amount)}</strong>
            </article>
          ))}
          {!forecast.timeline.length ? <p className="upcoming-stream__empty">Plan je inkomsten en vaste lasten om hier je geldroute te zien.</p> : null}
        </div>
      </section>
    </div>
  );
}

function ForecastBadge({ state }: { state: DashboardCashflowForecast["state"] }) {
  if (state === "planned") return <StatusBadge tone="success">Actueel</StatusBadge>;
  return (
    <Link href="/vaste-lasten#income-planning" aria-label="Planning controleren">
      <StatusBadge tone={state === "setup" ? "warning" : "info"}>{state === "setup" ? "Instellen" : "Deels geschat"}</StatusBadge>
    </Link>
  );
}

function BreakdownRow({ label, value, strong = false, href, hint }: { label: string; value: number; strong?: boolean; href?: string; hint?: string }) {
  return (
    <div className={strong ? "runway-breakdown__total" : undefined}>
      <dt>{href ? <Link href={href} className="underline decoration-border underline-offset-4 hover:text-brand">{label}</Link> : label}{hint ? <small className="mt-0.5 block font-normal text-[var(--color-text-subtle)]">{hint}</small> : null}</dt>
      <dd className="money-value">{value < 0 ? "−" : ""}{formatCurrency(Math.abs(value))}</dd>
    </div>
  );
}

function formatCompactDate(value: string) {
  return new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "long", timeZone: "Europe/Amsterdam" }).format(new Date(`${value}T12:00:00Z`));
}

function formatDay(value: string) {
  return new Intl.DateTimeFormat("nl-NL", { day: "2-digit", timeZone: "Europe/Amsterdam" }).format(new Date(`${value}T12:00:00Z`));
}

function formatMonth(value: string) {
  return new Intl.DateTimeFormat("nl-NL", { month: "short", timeZone: "Europe/Amsterdam" }).format(new Date(`${value}T12:00:00Z`)).replace(".", "");
}

function formatToday() {
  return new Intl.DateTimeFormat("nl-NL", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Amsterdam" }).format(new Date());
}
