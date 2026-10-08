"use client";

import Link from "next/link";
import { reportDestinations, type HubReportDestination, type ReportDestinationId } from "@/lib/report-destinations";

export type { ReportDestinationId } from "@/lib/report-destinations";

export function ReportNavigation({ active = "overview", onSelect }: { active?: ReportDestinationId; onSelect?: (destination: HubReportDestination) => void }) {
  return (
    <nav className="report-navigation" aria-label="Onderdelen van rapporten">
      {reportDestinations.map((destination) => {
        const current = destination.id === active;
        if (onSelect && destination.id !== "month") {
          return (
            <button
              key={destination.id}
              type="button"
              aria-current={current ? "page" : undefined}
              onClick={() => onSelect(destination.id)}
            >
              {destination.label}
            </button>
          );
        }
        return (
          <Link key={destination.id} href={destination.href} aria-current={current ? "page" : undefined}>
            {destination.label}
          </Link>
        );
      })}
    </nav>
  );
}
