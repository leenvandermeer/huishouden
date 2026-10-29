import { ArrowRight, CircleAlert, CircleCheck, WalletCards } from "lucide-react";
import { ButtonLink, StatusBadge } from "@/components/ui";
import { formatCurrency } from "@/lib/format";
import type { CashflowBudgetAdvice } from "@/modules/finance/cashflow-budget-advice";

export function CashflowBudgetBridge({ advice }: { advice: CashflowBudgetAdvice }) {
  const tone = advice.status === "attention" ? "warning" : advice.status === "on_track" ? "success" : "info";
  const Icon = advice.status === "attention" ? CircleAlert : advice.status === "on_track" ? CircleCheck : WalletCards;

  return (
    <section className={`mb-8 border border-border bg-[var(--color-panel-strong)] p-6 ${advice.status === "attention" ? "border-l-2 border-l-[var(--color-warning)]" : ""}`} aria-labelledby="cashflow-budget-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <Icon aria-hidden="true" size={18} className="mt-0.5 shrink-0 text-[var(--color-text-muted)]" />
          <div>
            <div className="flex flex-wrap items-center gap-2"><p className="text-[0.62rem] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">Kasstroom en budget</p><StatusBadge tone={tone}>{advice.status === "attention" ? "Bijsturen" : advice.status === "on_track" ? "Op koers" : "Aanvullen"}</StatusBadge></div>
            <h2 id="cashflow-budget-title" className="mt-2 text-lg font-normal text-[var(--color-text)]">{advice.title}</h2>
            <p className="font-serif-house mt-1 max-w-3xl text-sm leading-6 text-[var(--color-text-muted)]">{advice.detail} Resterende variabele budgetten worden één keer als voorzichtige aftrek meegenomen.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/budgetten" size="sm" variant="secondary">Budgetten</ButtonLink>
          <ButtonLink href="/planning?days=30" size="sm" variant="secondary">Vooruit <ArrowRight aria-hidden="true" size={14} /></ButtonLink>
        </div>
      </div>
      <dl className="mt-6 grid gap-x-6 gap-y-4 border-t border-border pt-5 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Netto deze maand" value={advice.historicalNet} />
        <Metric label="Geplande kasstroom 30 dagen" value={advice.plannedNetCashflow} />
        <Metric label="Resterende variabele budgetten" value={-advice.remainingVariableBudget} />
        <Metric label="Laagste saldo na budgetten" value={advice.lowestBalanceAfterBudgets} tone={advice.lowestBalanceAfterBudgets < 0 ? "warning" : "success"} />
      </dl>
    </section>
  );
}

function Metric({ label, value, tone = "neutral" }: { label: string; value: number; tone?: "neutral" | "success" | "warning" }) {
  const color = tone === "success" ? "text-[var(--color-success)]" : tone === "warning" ? "text-[var(--color-warning)]" : "text-[var(--color-text)]";
  return <div><dt className="text-[0.62rem] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">{label}</dt><dd className={`mt-1 text-2xl font-light tabular-nums ${color}`}>{value > 0 ? "+" : ""}{formatCurrency(value)}</dd></div>;
}
