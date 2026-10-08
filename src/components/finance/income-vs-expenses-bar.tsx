"use client";

import { formatCurrency } from "@/lib/format";

interface IncomeVsExpensesProps {
  income: number;
  expenses: number;
  savings: number;
  investments: number;
  previousIncome?: number;
  previousExpenses?: number;
  trend: string;
}

export function IncomeVsExpenses({
  income,
  expenses,
  savings,
  investments,
  previousIncome,
  previousExpenses,
  trend,
}: IncomeVsExpensesProps) {
  const net = income - expenses;
  const max = Math.max(income, 1);
  const incomeWidth = (income / max) * 100;
  const expensesWidth = (expenses / max) * 100;
  const netWidth = Math.max(0, (Math.abs(net) / max) * 100);

  const incomeChange = previousIncome ? Math.round(((income - previousIncome) / previousIncome) * 100) : 0;
  const expensesChange = previousExpenses ? Math.round(((expenses - previousExpenses) / previousExpenses) * 100) : 0;

  return (
    <section className="rounded-[var(--radius-lg)] border border-border bg-white p-4 shadow-[var(--shadow-sm)]">
      <h2 className="text-sm font-semibold text-brand">Inkomsten vs Uitgaven</h2>

      <div className="mt-4 grid gap-4">
        <BarRow
          label="Inkomsten"
          value={income}
          width={incomeWidth}
          color="bg-emerald-500"
          change={incomeChange}
        />
        <BarRow
          label="Uitgaven"
          value={expenses}
          width={expensesWidth}
          color="bg-blue-600"
          change={expensesChange}
        />
        <BarRow
          label="Netto"
          value={net}
          width={netWidth}
          color={net >= 0 ? "bg-emerald-600" : "bg-amber-600"}
        />
      </div>

      {savings > 0 || investments > 0 ? (
        <div className="mt-4 flex flex-wrap gap-3 border-t border-border pt-3 text-xs text-[var(--color-text-muted)]">
          {savings > 0 ? <span>Sparen: <strong className="text-brand">{formatCurrency(savings)}</strong></span> : null}
          {investments > 0 ? <span>Beleggen: <strong className="text-brand">{formatCurrency(investments)}</strong></span> : null}
        </div>
      ) : null}

      {trend ? (
        <p className="mt-3 text-xs text-[var(--color-text-muted)]">{trend}</p>
      ) : null}
    </section>
  );
}

function BarRow({
  label,
  value,
  width,
  color,
  change,
}: {
  label: string;
  value: number;
  width: number;
  color: string;
  change?: number;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-[var(--color-text-muted)]">{label}</span>
        <div className="flex items-center gap-2">
          {change !== undefined && change !== 0 ? (
            <span className={cn("text-[0.65rem] font-semibold", change > 0 ? "text-emerald-600" : "text-amber-600")}>
              {change > 0 ? "+" : ""}{change}% t.o.v. vorige
            </span>
          ) : null}
          <strong className="text-sm font-bold tabular-nums text-brand">{formatCurrency(value)}</strong>
        </div>
      </div>
      <div className="mt-1 h-3 overflow-hidden rounded-full bg-[var(--color-surface)]">
        <div className={cn("h-full rounded-full transition-all duration-500", color)} style={{ width: `${Math.max(2, width)}%` }} />
      </div>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
