import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { StatsStrip, type StatItem } from "./stats-strip";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  parent?: { href: string; label: string };
  stats?: StatItem[];
}

export function PageHeader({ eyebrow, title, description, actions, parent, stats }: PageHeaderProps) {
  return (
    <header className="editorial-page-header">
      <div className="band-row">
        <div className="max-w-4xl">
          {parent ? (
            <Link href={parent.href} className="mb-2 inline-flex min-h-7 items-center gap-1 pr-2 text-xs font-semibold text-[var(--color-text-muted)] transition-colors hover:text-brand">
              <ChevronLeft aria-hidden="true" size={14} />
              {parent.label}
            </Link>
          ) : null}
          {eyebrow ? <p>{eyebrow}</p> : null}
          <h1>{title}</h1>
          {description ? <span>{description}</span> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      {stats?.length ? <StatsStrip items={stats} /> : null}
    </header>
  );
}
