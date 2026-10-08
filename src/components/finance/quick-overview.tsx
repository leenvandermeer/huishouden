"use client";

import Link from "next/link";
import { ArrowRight, ArrowDownRight, ArrowUpRight, Clock, Shield } from "lucide-react";
import { formatCurrency } from "@/lib/format";

interface QuickOverviewProps {
  currentBalance: number;
  paymentBalance: number;
  savingsBalance: number;
  forecastTomorrow: number;
  forecastNextWeek: number;
  forecastEndMonth: number;
  bufferMonths: number;
  bufferStatus: "healthy" | "warning" | "critical";
}

const bufferTone = {
  healthy: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Gezond" },
  warning: { bg: "bg-amber-50", text: "text-amber-700", label: "Waarschuwing" },
  critical: { bg: "bg-red-50", text: "text-red-700", label: "Kritiek" },
};

export function QuickOverview({
  currentBalance,
  paymentBalance,
  savingsBalance,
  forecastTomorrow,
  forecastNextWeek,
  forecastEndMonth,
  bufferMonths,
  bufferStatus,
}: QuickOverviewProps) {
  const tone = bufferTone[bufferStatus];

  return (
    <section className="rounded-[var(--radius-lg)] border border-border bg-white p-4 shadow-[var(--shadow-sm)]">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-brand">Snel overzicht</h2>
        <Link href="/dashboard" className="text-[0.68rem] font-semibold text-brand hover:underline">
          Vandaag <ArrowRight size={12} className="inline" />
        </Link>
      </div>

      <div className="mt-3 grid gap-2">
        <div className="flex items-center justify-between rounded-md bg-[var(--color-surface)] px-3 py-2">
          <span className="flex items-center gap-2 text-xs font-semibold text-[var(--color-text-muted)]">
            <span className="grid h-6 w-6 place-items-center rounded-md bg-[var(--color-brand-subtle)] text-brand"><Wallet size={12} /></span>
            Huidig saldo
          </span>
          <strong className="text-sm font-bold tabular-nums text-brand">{formatCurrency(currentBalance)}</strong>
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs">
          <ForecastRow label="Morgen" value={forecastTomorrow} icon={<Clock size={12} />} />
          <ForecastRow label="Volgende week" value={forecastNextWeek} icon={<Clock size={12} />} />
          <ForecastRow label="Eind maand" value={forecastEndMonth} icon={<Clock size={12} />} />
        </div>

        <div className={`flex items-center justify-between rounded-md px-3 py-2 ${tone.bg}`}>
          <span className="flex items-center gap-2 text-xs font-semibold text-[var(--color-text-muted)]">
            <span className="grid h-6 w-6 place-items-center rounded-md bg-[var(--color-brand-subtle)] text-brand"><Shield size={12} /></span>
            Buffer
          </span>
          <div className="text-right">
            <strong className={`text-sm font-bold tabular-nums ${tone.text}`}>{bufferMonths.toFixed(1)} mnd</strong>
            <span className="ml-1 text-[0.65rem] text-[var(--color-text-subtle)]">{tone.label}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function Wallet(props: { size: number }) {
  return (
    <svg width={props.size} height={props.size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
      <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
    </svg>
  );
}

function ForecastRow({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  const isPositive = value >= 0;
  return (
    <div className="rounded-md bg-[var(--color-surface)] px-2 py-1.5">
      <span className="flex items-center gap-1 text-[0.62rem] text-[var(--color-text-subtle)]">{icon} {label}</span>
      <strong className={cn("mt-0.5 block text-xs font-bold tabular-nums", isPositive ? "text-[var(--color-text)]" : "text-amber-700")}>
        {formatCurrency(value)}
      </strong>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
