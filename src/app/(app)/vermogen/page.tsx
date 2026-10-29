import Link from "next/link";
import { ArrowRight, BadgeEuro, Banknote, CircleAlert, Download, Landmark, PiggyBank, ShieldCheck, TrendingUp, WalletCards } from "lucide-react";
import { WealthHistoryChart } from "@/components/finance/wealth-history-chart";
import { ButtonLink, PageHeader, StatusBadge } from "@/components/ui";
import { formatCurrency, formatDate, formatMonthLabel } from "@/lib/format";
import { requireUser } from "@/modules/auth/service";
import { getWealthOverviewFromDatabase } from "@/modules/finance/wealth-service";
import type { WealthAccount, WealthGroup } from "@/modules/finance/wealth";

export default async function WealthPage() {
  const [user, wealth] = await Promise.all([requireUser(), getWealthOverviewFromDatabase()]);
  const canExport = user.role !== "readonly";
  const latest = wealth.history.at(-1);
  const previous = wealth.history.at(-2);
  const monthlyChange = latest && previous ? latest.netWorth - previous.netWorth : undefined;

  return (
    <>
      <PageHeader
        eyebrow="Vermogen"
        title="Je financiële geheel"
        description={`Stand per ${formatDate(wealth.asOf)}. Iedere euro is terug te voeren naar een rekening.`}
        stats={[
          { label: "Netto vermogen", value: formatCurrency(wealth.netWorth), detail: `Bezittingen ${formatCurrency(wealth.assets)} min ${formatCurrency(wealth.debt)} schuld`, lead: true },
          { label: "Direct beschikbaar", value: formatCurrency(wealth.directAvailable), detail: "Betaalrekeningen" },
          { label: "Gereserveerd", value: formatCurrency(wealth.reserved), detail: "Spaarrekeningen" },
          { label: "Lange termijn", value: formatCurrency(wealth.longTerm), detail: "Beleggingen" },
          { label: "Sinds vorige maand", value: monthlyChange == null ? "—" : `${monthlyChange > 0 ? "+" : ""}${formatCurrency(monthlyChange)}`, detail: wealth.debt ? `Schulden ${formatCurrency(-wealth.debt)}` : "Geen schulden", tone: monthlyChange != null && monthlyChange < 0 ? "risk" : undefined },
        ]}
        actions={<div className="flex flex-wrap gap-2">{canExport ? <ButtonLink href="/api/export/wealth" variant="secondary" size="sm"><Download aria-hidden="true" size={14} /> Exporteer CSV</ButtonLink> : null}<ButtonLink href="/rekeningen" variant="secondary" size="sm">Rekeningen beheren</ButtonLink></div>}
      />

      <section className="mb-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="rounded-[1.25rem] border border-border bg-white p-4 shadow-[var(--shadow-sm)] md:p-5">
          <div className="mb-2 flex flex-wrap items-end justify-between gap-3"><div><p className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-accent">Ontwikkeling</p><h2 className="mt-1 text-xl font-semibold tracking-[-0.025em] text-brand">Hoe je vermogen zich ontwikkelt</h2></div><StatusBadge tone="info">Laatste 12 maanden</StatusBadge></div>
          <WealthHistoryChart rows={wealth.history} />
          <p className="border-t border-border pt-3 text-xs leading-5 text-[var(--color-text-muted)]">Interne overboekingen verschuiven geld tussen de lijnen, maar veranderen het netto vermogen niet.</p>
        </div>
        <aside className="grid content-start gap-3">
          <div className="rounded-[1.25rem] border border-border bg-white p-4 shadow-[var(--shadow-sm)]">
            <div className="flex items-start justify-between gap-3"><div><p className="text-[0.68rem] font-bold uppercase tracking-[0.12em] text-[var(--color-text-subtle)]">Datakwaliteit</p><h2 className="mt-1 text-base font-semibold text-brand">Kan ik deze stand vertrouwen?</h2></div><span className={`grid h-9 w-9 place-items-center rounded-full ${wealth.attentionCount ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>{wealth.attentionCount ? <CircleAlert aria-hidden="true" size={18} /> : <ShieldCheck aria-hidden="true" size={18} />}</span></div>
            <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">{wealth.attentionCount ? `${wealth.attentionCount} rekening${wealth.attentionCount === 1 ? " vraagt" : "en vragen"} aandacht. Open de rekening voor het saldoverschil of de ontbrekende periode.` : "Alle rekeningstanden sluiten aan en zijn actueel."}</p>
          </div>
          <div className="rounded-[1.25rem] border border-border bg-[var(--color-surface)] p-4 text-xs leading-5 text-[var(--color-text-muted)]"><strong className="block text-brand">Zo wordt het berekend</strong><span className="mt-1 block">Direct + gereserveerd + lange termijn − schulden = netto vermogen.</span></div>
        </aside>
      </section>

      <section className="space-y-4">
        {(["direct", "reserved", "long_term", "debt"] as WealthGroup[]).map((group) => {
          const accounts = wealth.accounts.filter((account) => account.group === group);
          if (!accounts.length) return null;
          return <AccountGroup key={group} group={group} accounts={accounts} />;
        })}
        {!wealth.accounts.length ? <div className="rounded-[1.25rem] border border-dashed border-border bg-white p-8 text-center"><Landmark aria-hidden="true" className="mx-auto text-[var(--color-text-subtle)]" /><h2 className="mt-3 text-lg font-semibold text-brand">Nog geen rekeningen</h2><p className="mt-1 text-sm text-[var(--color-text-muted)]">Voeg een rekening toe om je vermogen op te bouwen.</p><ButtonLink href="/rekeningen" className="mt-4">Rekening toevoegen</ButtonLink></div> : null}
      </section>
    </>
  );
}

function AccountGroup({ group, accounts }: { group: WealthGroup; accounts: WealthAccount[] }) {
  const labels: Record<WealthGroup, string> = { direct: "Direct beschikbaar", reserved: "Gereserveerd", long_term: "Lange termijn", debt: "Schulden" };
  const total = accounts.reduce((sum, account) => sum + account.balance, 0);
  return <section className="overflow-hidden rounded-[1.25rem] border border-border bg-white shadow-[var(--shadow-sm)]"><div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3"><h2 className="text-base font-semibold text-brand">{labels[group]}</h2><strong className="money-value text-sm text-brand">{formatCurrency(total)}</strong></div><div className="divide-y divide-border">{accounts.map((account) => <AccountRow key={account.id} account={account} />)}</div></section>;
}

function AccountRow({ account }: { account: WealthAccount }) {
  const tone = account.quality.status === "good" ? "success" : "warning";
  const updatedOn = latestAccountDate(account);
  return <Link href={`/rekeningen/${account.id}`} className="group grid gap-3 px-4 py-3 transition hover:bg-[var(--color-surface)] sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center"><span className="min-w-0"><strong className="block truncate text-sm text-brand group-hover:underline">{account.name}</strong><small className="mt-1 block truncate text-[var(--color-text-muted)]">{account.iban} · {account.typeLabel}{updatedOn ? ` · bijgewerkt ${formatDate(updatedOn)}` : " · peildatum ontbreekt"}</small></span><StatusBadge tone={tone}>{account.quality.label}</StatusBadge><span className="flex items-center justify-between gap-2 sm:min-w-32 sm:justify-end"><strong className="money-value text-sm text-[var(--color-text)]">{formatCurrency(account.balance)}</strong><ArrowRight aria-hidden="true" size={14} className="text-[var(--color-text-subtle)]" /></span></Link>;
}

function latestAccountDate(account: WealthAccount) {
  const importedOn = account.lastImportAt?.slice(0, 10);
  return [account.balanceDate, importedOn].filter((value): value is string => Boolean(value)).sort().at(-1);
}

