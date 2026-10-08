import Link from "next/link";
import { Landmark, ReceiptText } from "lucide-react";
import { StatusBadge } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";
import { getSavingsAccountFlowFromDatabase, type SavingsAccountFlow } from "@/modules/finance/repository";

type SavingsAccountFlowRow = SavingsAccountFlow["accounts"][number];

export default async function SavingsPage() {
  const flow = await getSavingsAccountFlowFromDatabase(80);
  const primary = flow.accounts[0];

  return (
    <div className="cockpit-canvas grid gap-3">
      <section className="command-panel view-card rounded-[var(--radius-lg)] p-4 md:p-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex rounded-md bg-[var(--color-accent-subtle)] px-2 py-0.5 text-[0.58rem] font-bold uppercase tracking-[0.14em] text-accent">Sparen</span>
              <StatusBadge tone={flow.accounts.length ? "success" : "warning"}>{flow.accounts.length ? "Bankstand leidend" : "Geen spaarrekening"}</StatusBadge>
            </div>
            <h1 className="mt-4 max-w-4xl text-3xl font-semibold leading-tight text-[var(--color-brand-strong)] sm:text-4xl">Sparen</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-text-muted)]">
              Bekijk je spaargeld en de laatste bij- en afschrijvingen.
            </p>
          </div>
          <div className="rounded-md border border-white/70 bg-white/76 px-4 py-3 shadow-[0_12px_32px_rgb(19_58_99_/_8%)]">
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[var(--color-text-subtle)]">Totaal saldo</p>
            <strong className="mt-1 block text-2xl font-semibold tabular-nums text-brand">{formatCurrency(flow.totalBalance)}</strong>
          </div>
        </div>
      </section>

      {flow.accounts.length ? (
        <div className="grid gap-3">
          <section className="surface-panel rounded-[var(--radius-lg)] p-3">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-brand">Stand per rekening</h2>
                <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">Het huidige saldo per spaarrekening.</p>
              </div>
              <StatusBadge tone="info">{flow.accounts.length} rekening{flow.accounts.length === 1 ? "" : "en"}</StatusBadge>
            </div>
            <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
              {flow.accounts.map((row) => <SavingsAccountCard key={row.account.id} row={row} />)}
            </div>
          </section>

          <section className="surface-panel rounded-[var(--radius-lg)] p-3">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold text-brand">Transacties</h2>
                <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">Nieuwste betalingen eerst.</p>
              </div>
              <StatusBadge tone="neutral">{flow.accounts.reduce((sum, row) => sum + row.transactionCount, 0)} transacties</StatusBadge>
            </div>
            <SavingsTransactions rows={flow.accounts.flatMap((row) => row.recentTransactions.map((transaction) => ({ ...transaction, savingsAccountName: row.account.name })))} />
          </section>
        </div>
      ) : (
        <section className="surface-panel rounded-[var(--radius-lg)] p-6 text-center">
          <Landmark aria-hidden="true" className="mx-auto h-8 w-8 text-[var(--color-text-subtle)]" />
          <h2 className="mt-3 text-base font-semibold text-brand">Nog geen spaarrekening gevonden</h2>
          <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-[var(--color-text-muted)]">Voeg bij Rekeningen een spaarrekening toe of importeer banktransacties met rekeningtype spaarrekening.</p>
        </section>
      )}
    </div>
  );
}

function SavingsAccountCard({ row }: { row: SavingsAccountFlowRow }) {
  const latestMonth = row.monthlyRows.at(-1);
  return (
    <article className="flow-card rounded-[var(--radius-lg)] p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-brand">{row.account.name}</h3>
          <p className="mt-1 truncate text-xs text-[var(--color-text-muted)]">{row.account.iban}</p>
        </div>
        <Link href={`/rekeningen/${row.account.id}`} className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-border bg-white/80 px-2.5 text-xs font-semibold text-brand hover:border-brand">
          <ReceiptText aria-hidden="true" size={14} /> Rekening
        </Link>
      </div>
      <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
        <Metric label="Bankstand" value={formatCurrency(row.account.balance)} strong />
        <Metric label="Bijgeschreven" value={formatCurrency(row.totalIn)} tone="positive" />
        <Metric label="Afgeschreven" value={formatCurrency(row.totalOut)} />
        <Metric label="Netto transacties" value={formatSignedCurrency(row.netMovement)} tone={row.netMovement >= 0 ? "positive" : "warning"} />
        <Metric label="Laatste maand" value={latestMonth ? `${formatMonth(latestMonth.month)} ${formatSignedCurrency(latestMonth.net)}` : "-"} />
      </dl>
    </article>
  );
}

function SavingsTransactions({ rows }: { rows: Array<SavingsAccountFlowRow["recentTransactions"][number] & { savingsAccountName: string }> }) {
  const sortedRows = [...rows].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 80);
  if (!sortedRows.length) {
    return <p className="rounded-md bg-[var(--color-surface)] px-3 py-6 text-center text-xs text-[var(--color-text-muted)]">Geen spaarmutaties gevonden.</p>;
  }

  return (
    <div className="table-responsive">
      <table className="w-full min-w-[48rem] table-fixed border-collapse text-left text-xs">
        <colgroup>
          <col className="w-[5.5rem]" />
          <col className="w-[10rem]" />
          <col />
          <col className="w-[8rem]" />
          <col className="w-[7.5rem]" />
        </colgroup>
        <thead className="border-b border-border bg-white/62 text-[var(--color-text-subtle)]">
          <tr>
            <th className="px-3 py-2">Datum</th>
            <th className="px-3 py-2">Rekening</th>
            <th className="px-3 py-2">Omschrijving</th>
            <th className="px-3 py-2">Richting</th>
            <th className="px-3 py-2 text-right">Bedrag</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {sortedRows.map((transaction) => {
            const isIn = transaction.amount > 0;
            return (
              <tr key={transaction.id} className="hover:bg-[var(--color-surface)]">
                <td className="px-3 py-2 align-top">{formatDate(transaction.date)}</td>
                <td className="px-3 py-2 align-top font-semibold text-brand"><span className="block truncate">{transaction.savingsAccountName}</span></td>
                <td className="px-3 py-2 align-top">
                  <span className="block truncate font-medium text-[var(--color-text)]">{transaction.counterparty}</span>
                  <span className="block truncate text-[var(--color-text-subtle)]">{transaction.description}</span>
                </td>
                <td className="px-3 py-2 align-top">
                  <StatusBadge tone={isIn ? "success" : "warning"}>{isIn ? "In" : "Uit"}</StatusBadge>
                </td>
                <td className={isIn ? "px-3 py-2 text-right align-top font-semibold tabular-nums text-emerald-700" : "px-3 py-2 text-right align-top font-semibold tabular-nums text-[var(--color-text)]"}>{formatCurrency(Math.abs(transaction.amount))}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Metric({ label, value, strong = false, tone = "neutral" }: { label: string; value: string; strong?: boolean; tone?: "neutral" | "positive" | "warning" }) {
  const valueClass = tone === "positive" ? "text-emerald-700" : tone === "warning" ? "text-amber-800" : "text-brand";
  return (
    <div className="rounded-md border border-border bg-white/72 p-2">
      <dt className="text-[var(--color-text-subtle)]">{label}</dt>
      <dd className={`${strong ? "text-lg" : "text-sm"} font-semibold tabular-nums ${valueClass}`}>{value}</dd>
    </div>
  );
}

function formatSignedCurrency(value: number) {
  return `${value >= 0 ? "+" : "-"}${formatCurrency(Math.abs(value))}`;
}

function formatMonth(month: string) {
  const [year, monthNumber] = month.split("-");
  const names = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
  return `${names[Number(monthNumber) - 1] ?? monthNumber} ${year}`;
}
