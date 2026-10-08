import { ArrowRight, CircleAlert, CircleCheck, WalletCards } from "lucide-react";
import { ButtonLink, StatusBadge } from "@/components/ui";
import { formatCurrency } from "@/lib/format";
import type { CashflowBudgetAdvice } from "@/modules/finance/cashflow-budget-advice";

export function CashflowBudgetBridge({ advice }: { advice: CashflowBudgetAdvice }) {
  const tone = advice.status === "attention" ? "warning" : advice.status === "on_track" ? "success" : "info";
  const Icon = advice.status === "attention" ? CircleAlert : advice.status === "on_track" ? CircleCheck : WalletCards;

  return (
    <section className={`my-3 rounded-[var(--radius-lg)] border p-4 shadow-[var(--shadow-sm)] ${advice.status === "attention" ? "border-amber-200 bg-[var(--color-warning-subtle)]" : "border-border bg-white"}`} aria-labelledby="cashflow-budget-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-brand"><Icon aria-hidden="true" size={18} /></span>
          <div>
            <div className="flex flex-wrap items-center gap-2"><p className="text-[0.68rem] font-bold uppercase tracking-[0.12em] text-[var(--color-text-subtle)]">Kasstroom en budget</p><StatusBadge tone={tone}>{advice.status === "attention" ? "Bijsturen" : advice.status === "on_track" ? "Op koers" : "Aanvullen"}</StatusBadge></div>
            <h2 id="cashflow-budget-title" className="mt-1 text-lg font-semibold text-brand">{advice.title}</h2>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-[var(--color-text-muted)]">{advice.detail} Resterende variabele budgetten worden één keer als voorzichtige aftrek meegenomen.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/budgetten" size="sm" variant="secondary">Budgetten</ButtonLink>
          <ButtonLink href="/planning?days=30" size="sm" variant="secondary">Vooruit <ArrowRight aria-hidden="true" size={14} /></ButtonLink>
        </div>
      </div>
      <dl className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Netto deze maand" value={advice.historicalNet} />
        <Metric label="Geplande kasstroom 30 dagen" value={advice.plannedNetCashflow} />
        <Metric label="Resterende variabele budgetten" value={-advice.remainingVariableBudget} />
        <Metric label="Laagste saldo na budgetten" value={advice.lowestBalanceAfterBudgets} strong tone={advice.lowestBalanceAfterBudgets < 0 ? "warning" : "success"} />
      </dl>
    </section>
  );
}

function Metric({ label, value, strong = false, tone = "neutral" }: { label: string; value: number; strong?: boolean; tone?: "neutral" | "success" | "warning" }) {
  const color = tone === "success" ? "text-emerald-700" : tone === "warning" ? "text-amber-800" : "text-brand";
  return <div className="rounded-md bg-white/80 p-3"><dt className="text-[0.66rem] font-bold uppercase tracking-wide text-[var(--color-text-subtle)]">{label}</dt><dd className={`mt-1 tabular-nums ${strong ? "text-lg" : "text-base"} font-semibold ${color}`}>{value > 0 ? "+" : ""}{formatCurrency(value)}</dd></div>;
}
