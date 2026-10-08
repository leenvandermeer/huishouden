import { ArrowDownRight, ArrowUpRight, Landmark } from "lucide-react";
import { redirect } from "next/navigation";
import { TransactionSearch } from "@/components/finance/transaction-search";
import { requireUser } from "@/modules/auth/service";
import { StatusBadge } from "@/components/ui";
import { formatCurrency } from "@/lib/format";
import { getFinanceMetadataFromDatabase, getSavedFiltersFromDatabase, getTransactionColumnsFromDatabase, getTransactionCounterAccountsFromDatabase, getTransactionMonthsFromDatabase, searchTransactionsFromDatabase } from "@/modules/finance/repository";
import { parseTransactionFilters } from "@/modules/finance/transaction-query";

export default async function TransactionsPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const params = (await searchParams) ?? {};
  const parsedFilters = parseTransactionFilters(params);
  const user = await requireUser();
  const [{ accounts, categories }, months, counterAccounts, savedFilters, transactionColumns] = await Promise.all([
    getFinanceMetadataFromDatabase(),
    getTransactionMonthsFromDatabase(),
    getTransactionCounterAccountsFromDatabase(),
    getSavedFiltersFromDatabase(user.id),
    getTransactionColumnsFromDatabase(user.id),
  ]);
  const rawCounterAccount = single(params.counterAccount);
  if (rawCounterAccount) {
    redirect(counterAccountRedirectPath(params, counterAccounts.find((account) => account.value === rawCounterAccount)?.key));
  }
  const filters = {
    ...parsedFilters,
    counterAccount: counterAccounts.find((account) => account.key === parsedFilters.counterAccountKey)?.value,
  };
  const result = await searchTransactionsFromDatabase(filters);
  return (
    <div className="cockpit-canvas grid gap-3">
      <section className="command-panel view-card rounded-[var(--radius-lg)] p-4 md:p-5">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,0.42fr)] xl:items-end">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex rounded-md bg-[var(--color-accent-subtle)] px-2 py-0.5 text-[0.58rem] font-bold uppercase tracking-[0.14em] text-accent">{filters.review ? "Controleren" : "Transacties"}</span>
              <StatusBadge tone={result.total ? "info" : "neutral"}>{result.total} gevonden</StatusBadge>
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <div>
                <h1 className="max-w-4xl text-3xl font-semibold leading-tight text-[var(--color-brand-strong)] sm:text-4xl">{filters.review ? "Te controleren" : "Transacties"}</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-text-muted)]">
                  {filters.review ? "Werk onduidelijke categorieën af in dezelfde transactiewerkruimte." : "Zoek een betaling of pas de categorie aan."}
                </p>
              </div>
              <div className="text-left lg:text-right">
                <span className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[var(--color-text-subtle)]">Selectie</span>
                <strong className="mt-1 block text-4xl font-semibold tabular-nums text-brand">{result.total}</strong>
              </div>
            </div>
          </div>
          <aside className="glass-card rounded-[var(--radius-lg)] p-3">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-text-subtle)]">Samenvatting</p>
            <div className="mt-3 grid gap-2">
              <TransactionHeroMetric icon={<ArrowUpRight aria-hidden="true" size={14} />} label="Inkomsten" value={result.totals.income} tone="positive" />
              <TransactionHeroMetric icon={<ArrowDownRight aria-hidden="true" size={14} />} label="Gewone uitgaven" value={result.totals.expenses} />
              <TransactionHeroMetric icon={<Landmark aria-hidden="true" size={14} />} label="Beleggingen" value={result.totals.investments} tone="invest" />
            </div>
          </aside>
        </div>
      </section>
      <TransactionSearch accounts={accounts} canEdit={user.role !== "readonly"} categories={categories} columnPreferences={transactionColumns} counterAccounts={counterAccounts} filters={filters} months={months} result={result} savedFilters={savedFilters} />
    </div>
  );
}

function TransactionHeroMetric({ icon, label, value, tone = "neutral" }: { icon: React.ReactNode; label: string; value: number; tone?: "neutral" | "positive" | "invest" }) {
  const iconClass = tone === "positive" ? "bg-[var(--color-success-subtle)] text-emerald-700" : tone === "invest" ? "bg-[var(--color-invest-subtle)] text-[var(--color-invest)]" : "bg-[var(--color-brand-subtle)] text-brand";
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-md bg-white/72 px-2.5 py-2 text-xs">
      <span className={`grid h-7 w-7 place-items-center rounded-md ${iconClass}`}>{icon}</span>
      <span className="min-w-0 truncate font-semibold text-[var(--color-text-muted)]">{label}</span>
      <strong className="tabular-nums text-brand">{formatCurrency(value)}</strong>
    </div>
  );
}

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function counterAccountRedirectPath(params: Record<string, string | string[] | undefined>, counterAccountKey?: string) {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key === "counterAccount") continue;
    const text = single(value);
    if (text) next.set(key, text);
  }
  if (counterAccountKey) next.set("counterAccountKey", counterAccountKey);
  const query = next.toString();
  return query ? `/transacties?${query}` : "/transacties";
}
