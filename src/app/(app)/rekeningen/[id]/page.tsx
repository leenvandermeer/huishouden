import Link from "next/link";
import { ArrowRight, Landmark, ReceiptText, ShieldCheck, TrendingDown, TrendingUp, WalletCards } from "lucide-react";
import { ButtonLink, PageHeader, StatusBadge } from "@/components/ui";
import { BalanceHistoryChart } from "@/components/finance/balance-history-chart";
import { formatCurrency, formatDate, formatMonthLabel } from "@/lib/format";
import { getAccountDetailFromDatabase } from "@/modules/finance/repository";
import { accountTypeLabel } from "@/modules/finance/wealth";

export default async function AccountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getAccountDetailFromDatabase(id);
  if (!detail) {
    return (
      <>
        <PageHeader eyebrow="Rekeningen" title="Rekening niet gevonden" description="Deze rekening bestaat niet meer of is gearchiveerd." parent={{ href: "/rekeningen", label: "Alle rekeningen" }} />
        <ButtonLink href="/rekeningen" variant="secondary">Terug naar rekeningen</ButtonLink>
      </>
    );
  }

  const { account, totals } = detail;
  const chartRows = detail.balanceSeries.slice(-12);
  const latestMonth = chartRows.at(-1);
  const previousMonth = chartRows.at(-2);
  const balanceChange = latestMonth && previousMonth ? latestMonth.estimatedBalance - previousMonth.estimatedBalance : latestMonth?.net;
  const latestCalculatedBalance = detail.balanceSeries.at(-1)?.estimatedBalance;
  const balanceDifference = typeof latestCalculatedBalance === "number" ? Math.round((account.balance - latestCalculatedBalance) * 100) / 100 : undefined;
  const balanceMatches = balanceDifference === undefined || Math.abs(balanceDifference) < 0.01;
  const latestTransaction = detail.recentTransactions[0];

  return (
    <>
      <PageHeader
        eyebrow={accountTypeLabel(account.type)}
        title={account.name}
        description={`${account.iban} · ${account.bank}`}
        parent={{ href: "/vermogen", label: "Vermogen" }}
        actions={<div className="flex flex-wrap gap-2"><ButtonLink href="/rekeningen" variant="secondary" size="sm">Beheren</ButtonLink><ButtonLink href={`/transacties?accountId=${account.id}`} variant="secondary" size="sm">Transacties <ArrowRight aria-hidden="true" size={14} /></ButtonLink></div>}
      />

      <section className="account-balance-hero brand-summary-hero mb-4 overflow-hidden rounded-[1.4rem] border border-[color:rgba(23,79,70,0.2)] bg-[var(--color-brand-fill)] text-[var(--color-brand-fill-text)] shadow-[var(--shadow-md)]">
        <div className="grid gap-6 p-5 md:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)] md:p-7">
          <div>
            <span className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--color-brand-fill-muted)]"><WalletCards aria-hidden="true" size={15} /> Huidige bankstand</span>
            <strong className="money-value mt-3 block text-[clamp(2.35rem,6vw,4.7rem)] leading-none tracking-[-0.055em]">{formatCurrency(account.balance)}</strong>
            <p className="mt-4 max-w-xl text-sm leading-6 text-[var(--color-brand-fill-muted)]">
              {account.balanceDate ? `Stand volgens ${account.balanceSource === "manual" ? "je handmatige invoer" : "de laatste import"} van ${formatDate(account.balanceDate)}.` : "Er is nog geen peildatum beschikbaar."}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-[var(--color-brand-fill-divider)]">
            <HeroMetric label={latestMonth ? `Binnen in ${formatMonthLabel(latestMonth.month)}` : "Binnengekomen"} value={formatCurrency(latestMonth?.income ?? 0)} />
            <HeroMetric label={latestMonth ? `Eruit in ${formatMonthLabel(latestMonth.month)}` : "Uitgegeven"} value={formatCurrency(latestMonth?.expenses ?? 0)} />
            <HeroMetric label="Verschil deze maand" value={formatSignedCurrency(latestMonth?.net ?? 0)} icon={(latestMonth?.net ?? 0) >= 0 ? "up" : "down"} />
            <HeroMetric label="Sinds vorige maand" value={balanceChange == null ? "—" : formatSignedCurrency(balanceChange)} icon={balanceChange != null && balanceChange >= 0 ? "up" : "down"} />
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="rounded-[1.25rem] border border-border bg-white p-4 shadow-[var(--shadow-sm)] md:p-5">
          <div className="mb-2 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-accent">Ontwikkeling</p>
              <h2 className="mt-1 text-xl font-semibold tracking-[-0.025em] text-brand">Hoe deze rekening beweegt</h2>
            </div>
            <StatusBadge tone="info">Laatste {chartRows.length} maanden</StatusBadge>
          </div>
          <BalanceHistoryChart rows={chartRows} accountId={account.id} />
        </div>

        <aside className="grid content-start gap-3">
          <div className="rounded-[1.25rem] border border-border bg-white p-4 shadow-[var(--shadow-sm)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[0.68rem] font-bold uppercase tracking-[0.12em] text-[var(--color-text-subtle)]">Controle</p>
                <h2 className="mt-1 text-base font-semibold text-brand">Klopt het saldo?</h2>
              </div>
              <span className={`grid h-9 w-9 place-items-center rounded-full ${balanceMatches ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}><ShieldCheck aria-hidden="true" size={18} /></span>
            </div>
            <dl className="mt-4 divide-y divide-border text-sm">
              <Info label="Bankstand" value={formatCurrency(account.balance)} />
              <Info label="Uit transacties" value={typeof latestCalculatedBalance === "number" ? formatCurrency(latestCalculatedBalance) : "Onbekend"} />
              <Info label="Verschil" value={typeof balanceDifference === "number" ? formatCurrency(balanceDifference) : "Onbekend"} />
              <Info label="Laatste transactie" value={latestTransaction ? formatDate(latestTransaction.date) : "Geen transacties"} />
              <Info label="Laatste import" value={account.lastImportAt && !account.lastImportAt.startsWith("1970-") ? formatDate(account.lastImportAt) : "Niet geïmporteerd"} />
            </dl>
            <div className="mt-3"><StatusBadge tone={balanceMatches ? "success" : "warning"}>{balanceMatches ? "Saldo sluit aan" : "Controle nodig"}</StatusBadge></div>
          </div>

          <details className="group rounded-[1.25rem] border border-border bg-white p-4 shadow-[var(--shadow-sm)]">
            <summary className="cursor-pointer list-none text-sm font-semibold text-brand marker:content-none">Rekeninggegevens en aliases</summary>
            <dl className="mt-3 divide-y divide-border text-sm">
              <Info label="Type" value={accountTypeLabel(account.type)} />
              <Info label="Bank" value={account.bank} />
              <Info label="Bron saldo" value={account.balanceSource === "manual" ? "Handmatig" : "Import"} />
              <Info label="Peildatum" value={account.balanceDate ? formatDate(account.balanceDate) : "Onbekend"} />
            </dl>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {detail.aliases.map((alias) => <span key={alias.id} className="rounded-full bg-[var(--color-surface)] px-2.5 py-1 text-[0.68rem] font-semibold text-[var(--color-text-muted)]">{alias.alias}</span>)}
              {!detail.aliases.length ? <span className="text-xs text-[var(--color-text-muted)]">Geen aliases ingesteld.</span> : null}
            </div>
          </details>

          <div className="rounded-[1.25rem] border border-border bg-[var(--color-surface)] p-4">
            <p className="text-xs leading-5 text-[var(--color-text-muted)]">Over de hele geïmporteerde periode: {totals.transactionCount} transacties, {formatCurrency(totals.income)} inkomsten en {formatCurrency(totals.expenses)} gewone uitgaven.</p>
          </div>
        </aside>
      </section>

      {account.type === "spaarrekening" ? (
        <section className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[1.25rem] border border-border bg-white p-4 shadow-[var(--shadow-sm)]">
          <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--color-brand-subtle)] text-brand"><Landmark aria-hidden="true" size={19} /></span><span><strong className="block text-sm text-brand">Spaarrekening als bankboek</strong><small className="mt-0.5 block text-[var(--color-text-muted)]">Bekijk de bij- en afschrijvingen die deze bankstand verklaren.</small></span></div>
          <ButtonLink href="/sparen" variant="secondary" size="sm">Spaarmutaties</ButtonLink>
        </section>
      ) : null}

      <section className="mt-4 overflow-hidden rounded-[1.25rem] border border-border bg-white shadow-[var(--shadow-sm)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div><p className="text-[0.68rem] font-bold uppercase tracking-[0.12em] text-accent">Laatste bewegingen</p><h2 className="mt-1 text-base font-semibold text-brand"><ReceiptText aria-hidden="true" size={16} className="mr-1.5 inline" />Recente transacties</h2></div>
          <Link href={`/transacties?accountId=${account.id}`} className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-brand hover:bg-[var(--color-surface)]">Alles bekijken <ArrowRight aria-hidden="true" size={14} /></Link>
        </div>
        <div className="hidden md:block">
          <table className="data-table-modern w-full table-fixed text-left text-xs">
            <thead><tr><th className="w-28">Datum</th><th className="w-[24%]">Tegenpartij</th><th>Omschrijving</th><th className="w-32 text-right">Bedrag</th></tr></thead>
            <tbody>
              {detail.recentTransactions.slice(0, 12).map((transaction) => (
                <tr key={transaction.id}><td>{formatDate(transaction.date)}</td><td title={transaction.counterparty || undefined} className="truncate font-semibold text-brand">{transaction.counterparty || "—"}</td><td title={transaction.description || undefined} className="truncate text-[var(--color-text-muted)]">{transaction.description || "Geen omschrijving"}</td><td className={`text-right font-semibold tabular-nums ${transaction.amount >= 0 ? "text-emerald-700" : ""}`}>{formatSignedCurrency(transaction.amount)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="divide-y divide-border md:hidden">
          {detail.recentTransactions.slice(0, 8).map((transaction) => (
            <article key={transaction.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 px-4 py-3"><span className="min-w-0"><strong className="block truncate text-sm text-brand">{transaction.counterparty || transaction.description || "Onbekende tegenpartij"}</strong><small className="mt-1 block truncate text-[var(--color-text-muted)]">{formatDate(transaction.date)} · {transaction.description || "Geen omschrijving"}</small></span><strong className={`text-sm tabular-nums ${transaction.amount >= 0 ? "text-emerald-700" : ""}`}>{formatSignedCurrency(transaction.amount)}</strong></article>
          ))}
        </div>
      </section>
    </>
  );
}

function HeroMetric({ label, value, icon }: { label: string; value: string; icon?: "up" | "down" }) {
  return <div className="bg-[var(--color-brand-fill-tile)] p-3.5"><span className="flex items-center gap-1.5 text-[0.68rem] font-semibold text-[var(--color-brand-fill-muted)]">{icon === "up" ? <TrendingUp aria-hidden="true" size={13} /> : icon === "down" ? <TrendingDown aria-hidden="true" size={13} /> : null}{label}</span><strong className="money-value mt-1.5 block text-lg text-[var(--color-brand-fill-text)]">{value}</strong></div>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="flex items-baseline justify-between gap-4 py-2.5"><dt className="text-[var(--color-text-muted)]">{label}</dt><dd className="text-right font-semibold tabular-nums text-[var(--color-text)]">{value}</dd></div>;
}

function formatSignedCurrency(value: number) {
  return `${value > 0 ? "+" : value < 0 ? "−" : ""}${formatCurrency(Math.abs(value))}`;
}
