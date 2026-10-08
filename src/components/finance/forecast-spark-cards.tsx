"use client";

import { formatCurrency } from "@/lib/format";

interface ForecastCardProps {
  label: string;
  value: number;
  previous: number;
  sparkline: number[];
  positiveIsGood?: boolean;
}

export function ForecastSparkCards({ cards }: { cards: ForecastCardProps[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((card) => (
        <ForecastSparkCard key={card.label} {...card} />
      ))}
    </div>
  );
}

function ForecastSparkCard({ label, value, previous, sparkline, positiveIsGood = true }: ForecastCardProps) {
  const delta = value - previous;
  const isGood = positiveIsGood ? delta >= 0 : delta < 0;
  const deltaColor = isGood ? "text-emerald-600" : "text-amber-600";
  const deltaIcon = delta >= 0 ? "↗" : "↘";

  const w = 100;
  const h = 28;
  const min = Math.min(...sparkline, value, previous);
  const max = Math.max(...sparkline, value, previous);
  const span = max - min || 1;
  const sx = (i: number) => (i / Math.max(sparkline.length - 1, 1)) * w;
  const sy = (v: number) => h - 3 - ((v - min) / span) * (h - 6);
  const path = sparkline.map((v, i) => `${i === 0 ? "M" : "L"} ${sx(i).toFixed(1)} ${sy(v).toFixed(1)}`).join(" ");

  return (
    <div className="group rounded-xl border border-border bg-white p-3 shadow-sm transition-all duration-200 hover:shadow-md hover:border-brand/40">
      <p className="text-[0.62rem] font-bold uppercase tracking-[0.12em] text-[var(--color-text-subtle)]">{label}</p>
      <div className="mt-1 flex items-end justify-between gap-2">
        <strong className="text-lg font-bold tabular-nums text-brand">{formatCurrency(value)}</strong>
        <svg viewBox={`0 0 ${w} ${h}`} className="h-7 w-24 shrink-0 opacity-70 transition-opacity group-hover:opacity-100" aria-hidden="true">
          <path d={path} fill="none" stroke={delta >= 0 ? "#059669" : "#d97706"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <p className={`mt-1 text-[0.65rem] font-semibold ${deltaColor}`}>
        {deltaIcon} {delta >= 0 ? "+" : ""}{formatCurrency(Math.abs(delta))} t.o.v. vorige
      </p>
    </div>
  );
}
