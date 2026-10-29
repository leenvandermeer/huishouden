import Link from "next/link";
import { Landmark, ReceiptText } from "lucide-react";
import { PageHeader, StatusBadge } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";
import { getSavingsAccountFlowFromDatabase, type SavingsAccountFlow } from "@/modules/finance/repository";

type SavingsAccountFlowRow = SavingsAccountFlow["accounts"][number];

export default async function SavingsPage() {
  const flow = await getSavingsAccountFlowFromDatabase(80);
  const primary = flow.accounts[0];
  const totalIn = flow.accounts.reduce((sum, row) => sum + row.totalIn, 0);
  const totalOut = flow.accounts.reduce((sum, row) => sum + row.totalOut, 0);
  const netMovement = flow.accounts.reduce((sum, row) => sum + row.netMovement, 0);

  return (
    <div>
      <PageHeader
        eyebrow="Sparen"
        title="Sparen"
        description="Bekijk je spaargeld en de laatste bij- en afschrijvingen."
        stats={[
          { label: "Totaal saldo", value: formatCurrency(flow.totalBalance), detail: `${flow.accounts.length} spaarrekening${flow.accounts.length === 1 ? "" : "en"}`, lead: true },
          { label: "Bijgeschreven", value: formatCurrency(totalIn), detail: "Alle geïmporteerde mutaties, incl. tussen spaarrekeningen" },
          { label: "Afgeschreven", value: formatCurrency(totalOut), detail: "Alle geïmporteerde mutaties, incl. tussen spaarrekeningen" },
          { label: "Netto", value: formatSignedCurrency(netMovement), detail: "Bij- min afschrijvingen, sinds eerste import", tone: netMovement < 0 ? "risk" : undefined },
        ]}
        actions={<StatusBadge tone={flow.accounts.length ? "success" : "warning"}>{flow.accounts.length ? "Bankstand leidend" : "Geen spaarrekening"}</StatusBadge>}
      />

      {flow.accounts.length ? (
        <div>
          <section className="mb-8">
            <div className="section-head">
              <h2>Stand per rekening</h2>
              <p>Het huidige saldo per spaarrekening, met wat er recent bij- en afging.</p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 2xl:grid-cols-4">
              {flow.accounts.map((row) => <SavingsAccountCard key={row.account.id} row={row} />)}
            </div>
          </section>

          <section className="mb-8">
            <div className="section-head">
              <h2>Transacties</h2>
              <p>Nieuwste betalingen eerst, over {flow.accounts.reduce((sum, row) => sum + row.transactionCount, 0)} transacties.</p>
            </div>
            <div className="border border-border bg-[var(--color-panel-strong)]">
            <SavingsTransactions rows={flow.accounts.flatMap((row) => row.recentTransactions.map((transaction) => ({ ...transaction, savingsAccountName: row.account.name })))} />
            </div>
          </section>
        </div>
      ) : (
        <section className="mb-8 border border-border bg-[var(--color-panel-strong)] p-8 text-center">
          <Landmark aria-hidden="true" className="mx-auto h-8 w-8 text-[var(--color-text-muted)]" />
          <h2 className="mt-3 text-base font-medium text-[var(--color-text)]">Nog geen spaarrekening gevonden</h2>
          <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-[var(--color-text-muted)]">Voeg bij Rekeningen een spaarrekening toe of importeer banktransacties met rekeningtype spaarrekening.</p>
        </section>
      )}
    </div>
  );
}

function SavingsAccountCard({ row }: { row: SavingsAccountFlowRow }) {
  const latestMonth = row.monthlyRows.at(-1);
  return (
    <article className="border border-border bg-[var(--color-panel-strong)] p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-medium text-[var(--color-text)]">{row.account.name}</h3>
          <p className="mt-1 truncate text-xs text-[var(--color-text-muted)]">{row.account.iban}</p>
        </div>
        <Link href={`/rekeningen/${row.account.id}`} className="inline-flex min-h-8 items-center gap-1.5 border border-border px-2.5 text-[0.66rem] uppercase tracking-[0.1em] text-[var(--color-text)] hover:border-[var(--color-text)]">
          <ReceiptText aria-hidden="true" size={14} className="text-[var(--color-text-muted)]" /> Rekening
        </Link>
      </div>
      <dl className="mt-5 grid gap-x-6 gap-y-4 border-t border-border pt-4 sm:grid-cols-2">
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
    return <p className="px-5 py-8 text-center text-xs text-[var(--color-text-muted)]">Geen spaarmutaties gevonden.</p>;
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
        <thead className="border-b border-border text-[0.62rem] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
          <tr>
            <th className="px-4 py-3 font-normal">Datum</th>
            <th className="px-4 py-3 font-normal">Rekening</th>
            <th className="px-4 py-3 font-normal">Omschrijving</th>
            <th className="px-4 py-3 font-normal">Richting</th>
            <th className="px-4 py-3 font-normal text-right">Bedrag</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {sortedRows.map((transaction) => {
            const isIn = transaction.amount > 0;
            return (
              <tr key={transaction.id} className="hover:bg-[var(--color-surface)]">
                <td className="px-4 py-3 align-top">{formatDate(transaction.date)}</td>
                <td className="px-4 py-3 align-top text-[var(--color-text)]"><span className="block truncate">{transaction.savingsAccountName}</span></td>
                <td className="px-4 py-3 align-top">
                  <span className="block truncate font-medium text-[var(--color-text)]">{transaction.counterparty}</span>
                  <span className="block truncate text-[var(--color-text-subtle)]">{transaction.description}</span>
                </td>
                <td className="px-4 py-3 align-top">
                  <StatusBadge tone={isIn ? "success" : "warning"}>{isIn ? "In" : "Uit"}</StatusBadge>
                </td>
                <td className={isIn ? "money-value px-4 py-3 text-right align-top text-[var(--color-success)]" : "money-value px-4 py-3 text-right align-top text-[var(--color-text)]"}>{formatCurrency(Math.abs(transaction.amount))}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Metric({ label, value, strong = false, tone = "neutral" }: { label: string; value: string; strong?: boolean; tone?: "neutral" | "positive" | "warning" }) {
  const valueClass = tone === "positive" ? "text-[var(--color-success)]" : tone === "warning" ? "text-[var(--color-warning)]" : "text-[var(--color-text)]";
  return (
    <div>
      <dt className="text-[0.62rem] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">{label}</dt>
      <dd className={`money-value mt-1 ${strong ? "text-2xl font-extralight" : "text-sm font-light"} ${valueClass}`}>{value}</dd>
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
