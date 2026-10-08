import { formatCurrency, formatDate } from "@/lib/format";
import type { DashboardCashflowForecast } from "@/modules/finance/repository";

interface MoneyRunwayProps {
  forecast: DashboardCashflowForecast;
  compact?: boolean;
}

export function MoneyRunway({ forecast, compact = false }: MoneyRunwayProps) {
  const endDate = forecast.horizon.date;
  const totalDays = Math.max(daysBetween(forecast.asOf, endDate), 1);
  const startBalance = forecast.paymentBalance - forecast.expectedBudgetExpenses - forecast.explicitReservations - forecast.uncertaintyMargin;
  const points = [
    { x: 40, balance: startBalance, type: "start" as const, label: "Vandaag", date: forecast.asOf },
    ...forecast.timeline.map((item, index) => ({
        x: 40 + Math.min(Math.max(daysBetween(forecast.asOf, item.date) / totalDays, 0), 1) * 920,
        balance: startBalance + forecast.timeline.slice(0, index + 1).reduce((sum, current) => sum + (current.type === "income" ? current.amount : -current.amount), 0),
        type: item.type,
        label: item.label,
        date: item.date,
      })),
  ];
  const balances = points.map((point) => point.balance);
  const minBalance = Math.min(...balances);
  const maxBalance = Math.max(...balances);
  const span = Math.max(maxBalance - minBalance, Math.max(Math.abs(maxBalance), 1) * 0.18, 1);
  const withY = points.map((point) => ({
    ...point,
    y: 128 - ((point.balance - minBalance) / span) * 92,
  }));
  const path = withY.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");
  const lowPoint = withY.reduce((lowest, point) => point.balance < lowest.balance ? point : lowest, withY[0]);
  const eventCount = forecast.timeline.filter((item) => item.type === "expense").length;

  return (
    <figure className={compact ? "money-runway money-runway--compact" : "money-runway"} aria-labelledby="money-runway-caption">
      <svg viewBox="0 0 1000 180" role="img" aria-label={`Verwacht saldo van vandaag tot ${formatDate(endDate)}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="runway-line" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="currentColor" stopOpacity="0.72" />
            <stop offset="1" stopColor="currentColor" />
          </linearGradient>
          <linearGradient id="runway-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="currentColor" stopOpacity="0.2" />
            <stop offset="1" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${path} L ${withY.at(-1)?.x ?? 960} 154 L 40 154 Z`} fill="url(#runway-area)" />
        <path d={path} fill="none" stroke="url(#runway-line)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        {withY.map((point, index) => (
          <g key={`${point.date}-${point.label}-${index}`}>
            <circle cx={point.x} cy={point.y} r={point === lowPoint ? 11 : 8} fill="var(--runway-dot, #f7f5ee)" stroke="currentColor" strokeWidth={point === lowPoint ? 5 : 4} vectorEffect="non-scaling-stroke" />
          </g>
        ))}
      </svg>
      <figcaption id="money-runway-caption" className="runway-caption">
        <span><strong>Nu</strong><small>{formatCurrency(startBalance)}</small></span>
        <span className="text-center"><strong>Na betalingen</strong><small>{formatCurrency(lowPoint.balance)}</small></span>
        <span className="text-right">
          <strong>{forecast.nextIncome ? "Na inkomen" : "Einde maand"}</strong>
          <small>{forecast.projectedAfterIncome != null ? `${formatCurrency(forecast.projectedAfterIncome)} · ${formatShortDate(endDate)}` : formatDate(endDate)}</small>
        </span>
      </figcaption>
      {!compact ? (
        <div className="runway-events" aria-label="Geplande betalingen en inkomsten">
          {forecast.timeline.slice(0, 4).map((item) => (
            <span key={`${item.type}-${item.id}-${item.date}`}>
              <i className={item.type === "income" ? "runway-event-sign runway-event-sign--income" : "runway-event-sign"} aria-hidden="true">{item.type === "income" ? "+" : "−"}</i>
              <span className="runway-event-copy"><span>{item.label}</span><small>{formatShortDate(item.date)}</small></span>
              <strong>{item.type === "income" ? "+" : "−"}{formatCurrency(item.amount)}</strong>
            </span>
          ))}
          {forecast.timeline.length > 4 ? <span className="runway-more">+ {forecast.timeline.length - 4} meer</span> : null}
          {!forecast.timeline.length ? <span className="runway-more">Nog niets gepland</span> : null}
        </div>
      ) : null}
      <p className="sr-only">{eventCount} geplande betalingen tot het volgende inkomen. Laagste geplande ruimte: {formatCurrency(lowPoint.balance)}.</p>
    </figure>
  );
}

function daysBetween(from: string, to: string) {
  const fromDate = new Date(`${from}T12:00:00Z`);
  const toDate = new Date(`${to}T12:00:00Z`);
  return Math.max(Math.round((toDate.getTime() - fromDate.getTime()) / 86_400_000), 0);
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", timeZone: "Europe/Amsterdam" }).format(new Date(`${value}T12:00:00Z`)).replace(".", "");
}
