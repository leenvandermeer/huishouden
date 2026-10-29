import Link from "next/link";
import { ArrowRight, Landmark, ShieldCheck } from "lucide-react";
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

  const latestNet = latestMonth?.net ?? 0;

  return (
    <>
      <PageHeader
        eyebrow={accountTypeLabel(account.type)}
        title={account.name}
        description={`${account.iban} · ${account.bank}`}
        parent={{ href: "/vermogen", label: "Vermogen" }}
        actions={<div className="flex flex-wrap gap-2"><ButtonLink href="/rekeningen" variant="secondary" size="sm">Beheren</ButtonLink><ButtonLink href={`/transacties?accountId=${account.id}`} variant="secondary" size="sm">Transacties <ArrowRight aria-hidden="true" size={14} /></ButtonLink></div>}
        stats={[
          { label: "Huidige bankstand", value: formatCurrency(account.balance), detail: account.balanceDate ? `Volgens ${account.balanceSource === "manual" ? "je handmatige invoer" : "de laatste import"} van ${formatDate(account.balanceDate)}` : "Nog geen peildatum", lead: true, tone: account.balance < 0 ? "risk" : undefined },
          { label: latestMonth ? `Binnen in ${formatMonthLabel(latestMonth.month)}` : "Binnengekomen", value: formatCurrency(latestMonth?.income ?? 0) },
          { label: latestMonth ? `Eruit in ${formatMonthLabel(latestMonth.month)}` : "Uitgegeven", value: formatCurrency(latestMonth?.expenses ?? 0) },
          { label: "Verschil deze maand", value: formatSignedCurrency(latestNet), tone: latestNet < 0 ? "risk" : undefined },
          { label: "Sinds vorige maand", value: balanceChange == null ? "—" : formatSignedCurrency(balanceChange), tone: balanceChange != null && balanceChange < 0 ? "risk" : undefined },
        ]}
      />

      <section className="mb-8">
        <div className="section-head">
          <h2>Ontwikkeling</h2>
          <p>Hoe deze rekening beweegt over de laatste {chartRows.length} maanden.</p>
        </div>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 border border-border bg-[var(--color-panel-strong)] p-5 md:p-6">
          <BalanceHistoryChart rows={chartRows} accountId={account.id} />
        </div>

        <aside className="grid content-start gap-4">
          <div className="border border-border bg-[var(--color-panel-strong)] p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[0.62rem] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">Controle</p>
                <h2 className="mt-1 text-base font-medium text-[var(--color-text)]">Klopt het saldo?</h2>
              </div>
              <ShieldCheck aria-hidden="true" size={18} className={balanceMatches ? "text-[var(--color-success)]" : "text-[var(--color-warning)]"} />
            </div>
            <dl className="mt-4 divide-y divide-border text-sm">
              <Info label="Bankstand" value={formatCurrency(account.balance)} />
              <Info label="Uit transacties" value={typeof latestCalculatedBalance === "number" ? formatCurrency(latestCalculatedBalance) : "Onbekend"} />
              <Info label="Verschil" value={typeof balanceDifference === "number" ? formatCurrency(balanceDifference) : "Onbekend"} />
              <Info label="Laatste transactie" value={latestTransaction ? formatDate(latestTransaction.date) : "Geen transacties"} />
              <Info label="Laatste import" value={account.lastImportAt && !account.lastImportAt.startsWith("1970-") ? formatDate(account.lastImportAt) : "Niet geïmporteerd"} />
            </dl>
            <div className="mt-4"><StatusBadge tone={balanceMatches ? "success" : "warning"}>{balanceMatches ? "Saldo sluit aan" : "Controle nodig"}</StatusBadge></div>
          </div>

          <details className="group border border-border bg-[var(--color-panel-strong)] p-5">
            <summary className="cursor-pointer list-none text-sm font-medium text-[var(--color-text)] marker:content-none">Rekeninggegevens en aliases</summary>
            <dl className="mt-3 divide-y divide-border text-sm">
              <Info label="Type" value={accountTypeLabel(account.type)} />
              <Info label="Bank" value={account.bank} />
              <Info label="Bron saldo" value={account.balanceSource === "manual" ? "Handmatig" : "Import"} />
              <Info label="Peildatum" value={account.balanceDate ? formatDate(account.balanceDate) : "Onbekend"} />
            </dl>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {detail.aliases.map((alias) => <span key={alias.id} className="border border-border px-2.5 py-1 text-[0.68rem] text-[var(--color-text-muted)]">{alias.alias}</span>)}
              {!detail.aliases.length ? <span className="text-xs text-[var(--color-text-muted)]">Geen aliases ingesteld.</span> : null}
            </div>
          </details>

          <p className="border-l border-border pl-4 font-[family-name:var(--font-serif-house)] text-xs leading-5 text-[var(--color-text-muted)]">Over de hele geïmporteerde periode: {totals.transactionCount} transacties, {formatCurrency(totals.income)} inkomsten en {formatCurrency(totals.expenses)} gewone uitgaven.</p>
        </aside>
        </div>
      </section>

      {account.type === "spaarrekening" ? (
        <section className="mb-8 flex flex-wrap items-center justify-between gap-4 border border-border bg-[var(--color-panel-strong)] p-5">
          <span className="flex items-center gap-3"><Landmark aria-hidden="true" size={18} className="shrink-0 text-[var(--color-text-muted)]" /><span><strong className="block text-sm font-medium text-[var(--color-text)]">Spaarrekening als bankboek</strong><small className="mt-0.5 block text-[var(--color-text-muted)]">Bekijk de bij- en afschrijvingen die deze bankstand verklaren.</small></span></span>
          <ButtonLink href="/sparen" variant="secondary" size="sm">Spaarmutaties</ButtonLink>
        </section>
      ) : null}

      <section className="mb-8">
        <div className="section-head">
          <div className="grid gap-2">
            <h2>Recente transacties</h2>
            <p>De laatste bewegingen op deze rekening.</p>
          </div>
          <Link href={`/transacties?accountId=${account.id}`} className="inline-flex min-h-9 items-center gap-1 text-xs text-brand hover:underline">Alles bekijken <ArrowRight aria-hidden="true" size={14} /></Link>
        </div>
        <div className="border border-border bg-[var(--color-panel-strong)]">
        <div className="hidden md:block">
          <table className="data-table-modern w-full table-fixed text-left text-xs [&_td]:px-4 [&_td]:py-3 [&_th]:px-4 [&_th]:py-3">
            <thead><tr><th className="w-28">Datum</th><th className="w-[24%]">Tegenpartij</th><th>Omschrijving</th><th className="w-32 text-right">Bedrag</th></tr></thead>
            <tbody>
              {detail.recentTransactions.slice(0, 12).map((transaction) => (
                <tr key={transaction.id}><td>{formatDate(transaction.date)}</td><td title={transaction.counterparty || undefined} className="truncate font-medium text-[var(--color-text)]">{transaction.counterparty || "—"}</td><td title={transaction.description || undefined} className="truncate text-[var(--color-text-muted)]">{transaction.description || "Geen omschrijving"}</td><td className={`money-value text-right ${transaction.amount >= 0 ? "text-[var(--color-success)]" : "text-[var(--color-text)]"}`}>{formatSignedCurrency(transaction.amount)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="divide-y divide-border md:hidden">
          {detail.recentTransactions.slice(0, 8).map((transaction) => (
            <article key={transaction.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 p-4"><span className="min-w-0"><strong className="block truncate text-sm font-medium text-[var(--color-text)]">{transaction.counterparty || transaction.description || "Onbekende tegenpartij"}</strong><small className="mt-1 block truncate text-[var(--color-text-muted)]">{formatDate(transaction.date)} · {transaction.description || "Geen omschrijving"}</small></span><strong className={`money-value text-sm font-medium ${transaction.amount >= 0 ? "text-[var(--color-success)]" : "text-[var(--color-text)]"}`}>{formatSignedCurrency(transaction.amount)}</strong></article>
          ))}
        </div>
        </div>
      </section>
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="flex items-baseline justify-between gap-4 py-2.5"><dt className="text-[var(--color-text-muted)]">{label}</dt><dd className="text-right font-medium tabular-nums text-[var(--color-text)]">{value}</dd></div>;
}

function formatSignedCurrency(value: number) {
  return `${value > 0 ? "+" : value < 0 ? "−" : ""}${formatCurrency(Math.abs(value))}`;
}
