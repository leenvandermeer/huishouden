import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  parent?: { href: string; label: string };
}

export function PageHeader({ eyebrow, title, description, actions, parent }: PageHeaderProps) {
  return (
    <header className="editorial-page-header mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-3xl">
        {parent ? (
          <Link href={parent.href} className="mb-1 inline-flex min-h-7 items-center gap-1 rounded-md pr-2 text-xs font-semibold text-[var(--color-text-muted)] transition-colors hover:text-brand">
            <ChevronLeft aria-hidden="true" size={14} />
            {parent.label}
          </Link>
        ) : null}
        {eyebrow ? <p>{eyebrow}</p> : null}
        <h1>{title}</h1>
        {description ? <span>{description}</span> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}
