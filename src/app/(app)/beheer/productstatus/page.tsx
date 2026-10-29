import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { PageHeader, StatusBadge } from "@/components/ui";
import { requireUser } from "@/modules/auth/service";
import { getProductHealth } from "@/modules/finance/product-health";

export default async function ProductStatusPage() {
  await requireUser();
  const health = await getProductHealth();
  const healthy = health.errorsLast7Days === 0 && health.missingSourceSignalsLast7Days === 0;

  return (
    <>
      <PageHeader
        eyebrow="Beheer"
        title="Productstatus"
        description="Zie of de app goed werkt en waar gegevens nog aandacht nodig hebben. Er worden geen bedragen of omschrijvingen gemeten."
        stats={[
          { label: "Technische fouten", value: health.errorsLast7Days.toLocaleString("nl-NL"), detail: "afgelopen 7 dagen", tone: health.errorsLast7Days > 0 ? "risk" : undefined },
          { label: "Inkomen ontbreekt", value: health.missingSourceSignalsLast7Days.toLocaleString("nl-NL"), detail: "unieke dagsignalen", tone: health.missingSourceSignalsLast7Days > 0 ? "risk" : undefined },
          { label: "Schatting gebruikt", value: health.estimatedSourceSignalsLast7Days.toLocaleString("nl-NL"), detail: "unieke dagsignalen" },
          { label: "Correcties uitgevoerd", value: health.correctionsLast30Days.toLocaleString("nl-NL"), detail: "afgelopen 30 dagen" },
        ]}
      />

      <section className="mb-12" aria-labelledby="release-status-title">
        <div className="section-head">
          <h2>Huidige uitrol</h2>
          <p>Status van het huishoudboekje en de opgeslagen financiële gegevens.</p>
        </div>
        <div className="border border-border border-t-[var(--color-text)] bg-[var(--color-panel-strong)] p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[0.62rem] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">Release</p>
              <p id="release-status-title" className="mt-2 text-2xl font-light tracking-[0.04em] text-[var(--color-text)]">{health.release}</p>
            </div>
            <StatusBadge tone={healthy ? "success" : "warning"}>{healthy ? "Alles rustig" : "Controle nodig"}</StatusBadge>
          </div>
          <p className="mt-5 flex items-start gap-2 border-t border-border pt-4 text-sm leading-6 text-[var(--color-text-muted)]">
            <CheckCircle2 aria-hidden="true" className="mt-1 shrink-0 text-[var(--color-text-subtle)]" size={16} />
            Metingen bevatten alleen het soort signaal, de pagina en de release. Geen saldi, transacties of vrije tekst.
          </p>
        </div>
      </section>

      <section className="mb-12">
        <div className="section-head">
          <h2>Vervolgstappen</h2>
          <p>Waar je terechtkunt als een signaal aandacht vraagt.</p>
        </div>
        <div className="grid border-t border-[var(--color-text)] md:grid-cols-2 md:gap-x-8">
          <StatusLink href="/vaste-lasten#income-planning" title="Brongegevens controleren" description="Bevestig inkomen en vaste betalingen als er signalen ontbreken." />
          <StatusLink href="/audit" title="Wijzigingen bekijken" description="Controleer welke correcties, imports en exports zijn uitgevoerd." />
        </div>
      </section>
    </>
  );
}

function StatusLink({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <Link href={href} className="group flex min-h-20 items-center justify-between gap-4 border-b border-border px-1 py-4 transition-colors hover:bg-[var(--color-surface)]">
      <span><strong className="block text-sm font-medium text-[var(--color-text)]">{title}</strong><small className="mt-1 block text-xs leading-5 text-[var(--color-text-muted)]">{description}</small></span>
      <ArrowRight aria-hidden="true" className="shrink-0 text-[var(--color-text-subtle)] transition-transform group-hover:translate-x-1" size={16} />
    </Link>
  );
}
