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
        actions={<div className="flex flex-wrap gap-2">{canExport ? <ButtonLink href="/api/export/wealth" variant="secondary" size="sm"><Download aria-hidden="true" size={14} /> Exporteer CSV</ButtonLink> : null}<ButtonLink href="/rekeningen" variant="secondary" size="sm">Rekeningen beheren</ButtonLink></div>}
      />

      <section className="brand-summary-hero mb-4 overflow-hidden rounded-[1.5rem] border border-[color:rgba(23,79,70,0.2)] bg-[var(--color-brand-fill)] text-[var(--color-brand-fill-text)] shadow-[var(--shadow-md)]">
        <div className="grid gap-6 p-5 md:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)] md:p-7">
          <div>
            <span className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--color-brand-fill-muted)]"><BadgeEuro aria-hidden="true" size={15} /> Netto vermogen</span>
            <strong className="money-value mt-3 block text-[clamp(2.6rem,7vw,5.4rem)] leading-none tracking-[-0.06em]">{formatCurrency(wealth.netWorth)}</strong>
            <p className="mt-4 max-w-xl text-sm leading-6 text-[var(--color-brand-fill-muted)]">Bezittingen van {formatCurrency(wealth.assets)}, verminderd met {formatCurrency(wealth.debt)} schuld.</p>
          </div>
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-[var(--color-brand-fill-divider)]">
            <HeroMetric label="Direct beschikbaar" value={wealth.directAvailable} />
            <HeroMetric label="Gereserveerd" value={wealth.reserved} />
            <HeroMetric label="Lange termijn" value={wealth.longTerm} />
            <HeroMetric label="Sinds vorige maand" value={monthlyChange} signed />
          </div>
        </div>
      </section>

      <section className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <BreakdownCard icon={<WalletCards size={18} />} label="Direct beschikbaar" value={wealth.directAvailable} detail="Betaalrekeningen" tone="green" />
        <BreakdownCard icon={<PiggyBank size={18} />} label="Gereserveerd" value={wealth.reserved} detail="Spaarrekeningen" tone="purple" />
        <BreakdownCard icon={<TrendingUp size={18} />} label="Lange termijn" value={wealth.longTerm} detail="Beleggingen" tone="orange" />
        <BreakdownCard icon={<Banknote size={18} />} label="Schulden" value={wealth.debt ? -wealth.debt : 0} detail="Telt af van vermogen" tone="neutral" />
      </section>

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

function HeroMetric({ label, value, signed = false }: { label: string; value?: number; signed?: boolean }) {
  const display = value == null ? "—" : `${signed && value > 0 ? "+" : ""}${formatCurrency(value)}`;
  return <div className="bg-[var(--color-brand-fill-tile)] p-3.5"><span className="text-[0.68rem] font-semibold text-[var(--color-brand-fill-muted)]">{label}</span><strong className="money-value mt-1.5 block text-lg text-[var(--color-brand-fill-text)]">{display}</strong></div>;
}

function BreakdownCard({ icon, label, value, detail, tone }: { icon: React.ReactNode; label: string; value: number; detail: string; tone: "green" | "purple" | "orange" | "neutral" }) {
  const colors = { green: "bg-emerald-50 text-emerald-700", purple: "bg-violet-50 text-violet-700", orange: "bg-orange-50 text-orange-700", neutral: "bg-[var(--color-surface)] text-brand" };
  return <article className="rounded-[1.1rem] border border-border bg-white p-4 shadow-[var(--shadow-sm)]"><span className={`grid h-9 w-9 place-items-center rounded-xl ${colors[tone]}`}>{icon}</span><p className="mt-3 text-xs font-semibold text-[var(--color-text-muted)]">{label}</p><strong className="money-value mt-1 block text-xl text-brand">{formatCurrency(value)}</strong><small className="mt-1 block text-[var(--color-text-subtle)]">{detail}</small></article>;
}
