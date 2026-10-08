import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, DatabaseZap, RefreshCcw, Wrench } from "lucide-react";
import { PageHeader, StatusBadge } from "@/components/ui";
import { requireUser } from "@/modules/auth/service";
import { getProductHealth } from "@/modules/finance/product-health";

export default async function ProductStatusPage() {
  await requireUser();
  const health = await getProductHealth();
  const healthy = health.errorsLast7Days === 0 && health.missingSourceSignalsLast7Days === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Beheer"
        title="Productstatus"
        description="Zie of de app goed werkt en waar gegevens nog aandacht nodig hebben. Er worden geen bedragen of omschrijvingen gemeten."
      />

      <section className="rounded-3xl border border-border bg-white p-5 shadow-[var(--shadow-sm)] md:p-7" aria-labelledby="release-status-title">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">Huidige uitrol</p>
            <h2 id="release-status-title" className="mt-1 text-2xl font-bold text-[var(--color-text)]">{health.release}</h2>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">Status van het huishoudboekje en de opgeslagen financiële gegevens.</p>
          </div>
          <StatusBadge tone={healthy ? "success" : "warning"}>{healthy ? "Alles rustig" : "Controle nodig"}</StatusBadge>
        </div>

        <dl className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <HealthMetric icon={<AlertTriangle size={19} />} label="Technische fouten" value={health.errorsLast7Days} detail="afgelopen 7 dagen" attention={health.errorsLast7Days > 0} />
          <HealthMetric icon={<DatabaseZap size={19} />} label="Inkomen ontbreekt" value={health.missingSourceSignalsLast7Days} detail="unieke dagsignalen" attention={health.missingSourceSignalsLast7Days > 0} />
          <HealthMetric icon={<RefreshCcw size={19} />} label="Schatting gebruikt" value={health.estimatedSourceSignalsLast7Days} detail="unieke dagsignalen" />
          <HealthMetric icon={<Wrench size={19} />} label="Correcties uitgevoerd" value={health.correctionsLast30Days} detail="afgelopen 30 dagen" />
        </dl>

        <p className="mt-5 flex items-start gap-2 text-sm text-[var(--color-text-muted)]">
          <CheckCircle2 aria-hidden="true" className="mt-0.5 shrink-0 text-brand" size={17} />
          Metingen bevatten alleen het soort signaal, de pagina en de release. Geen saldi, transacties of vrije tekst.
        </p>
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        <StatusLink href="/vaste-lasten#income-planning" title="Brongegevens controleren" description="Bevestig inkomen en vaste betalingen als er signalen ontbreken." />
        <StatusLink href="/audit" title="Wijzigingen bekijken" description="Controleer welke correcties, imports en exports zijn uitgevoerd." />
      </section>
    </div>
  );
}

function HealthMetric({ icon, label, value, detail, attention = false }: { icon: React.ReactNode; label: string; value: number; detail: string; attention?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${attention ? "border-amber-300 bg-amber-50" : "border-border bg-[var(--color-surface)]"}`}>
      <dt className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-muted)]">{icon}{label}</dt>
      <dd className="mt-3 text-3xl font-bold text-[var(--color-text)]">{value.toLocaleString("nl-NL")}</dd>
      <small className="text-xs text-[var(--color-text-subtle)]">{detail}</small>
    </div>
  );
}

function StatusLink({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <Link href={href} className="flex min-h-24 items-center justify-between gap-4 rounded-2xl border border-border bg-white p-4 shadow-[var(--shadow-sm)] hover:border-brand">
      <span><strong className="block text-[var(--color-text)]">{title}</strong><small className="mt-1 block text-[var(--color-text-muted)]">{description}</small></span>
      <ArrowRight aria-hidden="true" className="shrink-0 text-brand" size={18} />
    </Link>
  );
}
