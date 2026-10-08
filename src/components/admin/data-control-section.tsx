import Link from "next/link";
import { ArrowRight, FileClock, FileUp, Download } from "lucide-react";

interface DataCard {
  href: string;
  icon: React.ReactNode;
  label: string;
  description: string;
}

const cards: DataCard[] = [
  { href: "/importeren", icon: <FileUp size={16} />, label: "Importeren", description: "CSV, CAMT, MT940 - Multi-file upload" },
  { href: "/exporteren", icon: <Download size={16} />, label: "Exporteren", description: "JSON back-up + CSV transactieexport" },
  { href: "/audit", icon: <FileClock size={16} />, label: "Auditlog", description: "Mutaties, exports en beheeraanpassingen" },
];

export function DataControlSection() {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-brand">Data & Controle</h2>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group flex items-center justify-between gap-3 rounded-lg border border-border bg-white p-3 shadow-sm transition-all duration-200 hover:border-brand hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--color-brand-subtle)] text-brand transition-colors group-hover:bg-brand group-hover:text-white">
                {card.icon}
              </span>
              <div>
                <h3 className="text-sm font-semibold text-brand">{card.label}</h3>
                <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{card.description}</p>
              </div>
            </div>
            <ArrowRight aria-hidden="true" size={14} className="shrink-0 text-[var(--color-text-subtle)] transition group-hover:translate-x-0.5 group-hover:text-brand" />
          </Link>
        ))}
      </div>
    </section>
  );
}
