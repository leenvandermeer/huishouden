"use client";

import { useState } from "react";
import { formatCurrency, formatMonthLabel } from "@/lib/format";
import type { BalanceForecastPoint } from "@/modules/finance/balance-forecast";

interface BalanceForecastChartProps {
  history: BalanceForecastPoint[];
  forecast: BalanceForecastPoint[];
  avgMonthlyNet: number;
}

export function BalanceForecastChart({ history, forecast, avgMonthlyNet }: BalanceForecastChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const allPoints = [...history, ...forecast];
  if (allPoints.length < 2) {
    return (
      <div className="grid h-64 place-items-center rounded-lg bg-[var(--color-surface)] text-sm text-[var(--color-text-muted)]">
        Nog genoeg data nodig voor een saldo voorspelling.
      </div>
    );
  }

  const width = 900;
  const height = 380;
  const padding = { top: 30, right: 30, bottom: 60, left: 80 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const bounds = forecast.flatMap((p) => [p.lowerBound ?? p.balance, p.upperBound ?? p.balance]);
  const values = [...allPoints.map((p) => p.balance), ...bounds];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const padding_ = range * 0.08;
  const yMin = min - padding_;
  const yMax = max + padding_;
  const span = yMax - yMin;

  const total = allPoints.length;
  const x = (i: number) => padding.left + (i / Math.max(total - 1, 1)) * plotWidth;
  const y = (v: number) => padding.top + ((yMax - v) / span) * plotHeight;

  const line = (pts: BalanceForecastPoint[], offset = 0) =>
    pts.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i + offset).toFixed(1)} ${y(p.balance).toFixed(1)}`).join(" ");

  const areaPath = `${line(history)} L ${x(history.length - 1).toFixed(1)} ${height - padding.bottom} L ${x(0).toFixed(1)} ${height - padding.bottom} Z`;

  const forecastOffset = history.length - 1;
  const forecastLine = `${line([history[history.length - 1]], forecastOffset)} ${forecast.map((p, i) => `L ${x(i + 1 + forecastOffset).toFixed(1)} ${y(p.balance).toFixed(1)}`).join(" ")}`;

  const bandTop = forecast.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i + 1 + forecastOffset).toFixed(1)} ${y(p.upperBound ?? p.balance).toFixed(1)}`).join(" ");
  const bandBottomReversed = [...forecast].reverse().map((p, i) => `L ${x(forecast.length - i + forecastOffset).toFixed(1)} ${y(p.lowerBound ?? p.balance).toFixed(1)}`).join(" ");
  const bandPath = `${bandTop} ${bandBottomReversed} Z`;

  const zeroY = y(0);
  const ticks = [yMax, yMin + span / 2, yMin];
  const hovered = hoveredIndex != null ? allPoints[hoveredIndex] : null;
  const trendUp = avgMonthlyNet >= 0;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Saldoverloop met voorspelling"
        className="h-auto w-full"
        onMouseLeave={() => setHoveredIndex(null)}
      >
        <defs>
          <linearGradient id="balanceFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#2457c5" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#2457c5" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="forecastFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.14" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {ticks.map((tick, i) => (
          <g key={`${tick}-${i}`}>
            <line x1={padding.left} x2={width - padding.right} y1={y(tick)} y2={y(tick)} stroke="#e2e8f0" strokeWidth="1" strokeDasharray={i === 2 ? "4 4" : undefined} />
            <text x={padding.left - 10} y={y(tick) + 4} textAnchor="end" fontSize="11" fill="#64748b" className="tabular-nums">
              {compactEuro(tick)}
            </text>
          </g>
        ))}

        {min < 0 && max > 0 ? (
          <line x1={padding.left} x2={width - padding.right} y1={zeroY} y2={zeroY} stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="6 4" />
        ) : null}

        <path d={areaPath} fill="url(#balanceFill)" />
        <path d={bandPath} fill="url(#forecastFill)" />
        <path d={forecastLine} fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeDasharray="8 6" strokeLinecap="round" />

        <path d={line(history)} fill="none" stroke="#2457c5" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

        {history.map((p, i) => (
          <circle key={`h-${p.month}`} cx={x(i)} cy={y(p.balance)} r={hoveredIndex === i ? 6 : 4} fill="#2457c5" stroke="white" strokeWidth="2" />
        ))}
        {forecast.map((p, i) => (
          <circle key={`f-${p.month}`} cx={x(i + 1 + forecastOffset)} cy={y(p.balance)} r={hoveredIndex === i + history.length ? 5 : 3.5} fill="#7c3aed" stroke="white" strokeWidth="1.5" />
        ))}

        {hoveredIndex != null ? (
          <line x1={x(hoveredIndex)} x2={x(hoveredIndex)} y1={padding.top} y2={height - padding.bottom} stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 3" />
        ) : null}

        {allPoints.map((p, i) => {
          const showLabel = total <= 14 || i === 0 || i === total - 1 || i === history.length - 1 || i % 2 === 0;
          if (!showLabel) return null;
          return (
            <g key={`lbl-${p.month}`}>
              <text x={x(i)} y={height - 32} textAnchor="middle" fontSize="10.5" fontWeight={p.isForecast ? "600" : "500"} fill={p.isForecast ? "#7c3aed" : "#475569"}>
                {shortMonth(p.month)}
              </text>
              {i === allPoints.length - 1 || i === 0 || i === history.length - 1 ? (
                <text x={x(i)} y={height - 16} textAnchor="middle" fontSize="9.5" fill="#94a3b8" className="tabular-nums">
                  {p.isForecast ? "verwacht" : "actueel"}
                </text>
              ) : null}
            </g>
          );
        })}

        {allPoints.map((p, i) => (
          <rect
            key={`hit-${p.month}`}
            x={x(i) - plotWidth / total / 2}
            y={padding.top}
            width={plotWidth / total}
            height={plotHeight}
            fill="transparent"
            onMouseEnter={() => setHoveredIndex(i)}
          />
        ))}
      </svg>

      {hovered ? (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-border bg-white/95 px-3 py-2 text-xs shadow-lg backdrop-blur"
          style={{ left: `${(x(hoveredIndex ?? 0) / width) * 100}%`, top: `${(y(hovered.balance) / height) * 100}%` }}
        >
          <p className="font-semibold text-brand">{formatMonthLabel(hovered.month)}</p>
          <p className="mt-0.5 tabular-nums font-bold text-brand">{formatCurrency(hovered.balance)}</p>
          {hovered.isForecast ? (
            <p className="mt-0.5 text-[0.62rem] text-[var(--color-invest)]">
              verwacht bereik {compactEuro(hovered.lowerBound ?? 0)} – {compactEuro(hovered.upperBound ?? 0)}
            </p>
          ) : (
            <p className="mt-0.5 text-[0.62rem] text-[var(--color-text-subtle)]">actueel saldo</p>
          )}
        </div>
      ) : null}

      <div className="mt-2 flex flex-wrap items-center gap-4 px-1 text-[0.68rem] text-[var(--color-text-muted)]">
        <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4 rounded bg-[#2457c5]" />Actueel saldo</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4 rounded bg-[#7c3aed]" style={{ borderTop: "2px dashed #7c3aed" }} />Voorspelling</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-4 rounded bg-[#7c3aed]/15" />Betrouwbaarheidsband</span>
        <span className="ml-auto inline-flex items-center gap-1.5 font-semibold">
          Gemiddeld per maand:
          <strong className={trendUp ? "text-emerald-600" : "text-amber-600"}>
            {avgMonthlyNet >= 0 ? "+" : ""}{formatCurrency(avgMonthlyNet)}
          </strong>
        </span>
      </div>
    </div>
  );
}

function shortMonth(month: string) {
  return formatMonthLabel(month).split(" ")[0].slice(0, 3);
}

function compactEuro(value: number) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", notation: "compact", maximumFractionDigits: 1 }).format(value);
}
