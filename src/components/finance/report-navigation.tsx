"use client";

import Link from "next/link";
import { reportDestinations, type HubReportDestination, type ReportDestinationId } from "@/lib/report-destinations";

export type { ReportDestinationId } from "@/lib/report-destinations";

const tabClass = "-mb-px inline-flex min-h-11 shrink-0 items-center border-b-2 px-0.5 text-[0.68rem] font-normal uppercase tracking-[0.2em] whitespace-nowrap transition-colors";
const activeClass = "border-[var(--color-text)] text-[var(--color-text)]";
const idleClass = "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]";

/** Underline tabs directly under the title band, as in the Oceanco apps. */
export function ReportNavigation({ active = "overview", onSelect }: { active?: ReportDestinationId; onSelect?: (destination: HubReportDestination) => void }) {
  return (
    <nav className="mb-8 flex gap-7 overflow-x-auto border-b border-border [scrollbar-width:none]" aria-label="Onderdelen van rapporten">
      {reportDestinations.map((destination) => {
        const current = destination.id === active;
        const className = `${tabClass} ${current ? activeClass : idleClass}`;
        if (onSelect && destination.id !== "month") {
          return (
            <button key={destination.id} type="button" className={`${className} cursor-pointer bg-transparent`} aria-current={current ? "page" : undefined} onClick={() => onSelect(destination.id)}>
              {destination.label}
            </button>
          );
        }
        return (
          <Link key={destination.id} href={destination.href} className={className} aria-current={current ? "page" : undefined}>
            {destination.label}
          </Link>
        );
      })}
    </nav>
  );
}
