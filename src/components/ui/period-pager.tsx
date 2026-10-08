import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";

interface PeriodPagerProps {
  label: string;
  previousHref?: string;
  nextHref?: string;
  previousLabel?: string;
  nextLabel?: string;
  className?: string;
}

export function PeriodPager({ label, previousHref, nextHref, previousLabel = "Vorige", nextLabel = "Volgende", className = "" }: PeriodPagerProps) {
  return (
    <nav className={`flex flex-wrap items-center gap-1.5 ${className}`} aria-label="Periode navigatie">
      <PagerButton href={previousHref} label={previousLabel} direction="previous" />
      <span className="grid min-h-11 min-w-[9rem] place-items-center rounded-[var(--radius-md)] border border-border bg-white px-3 py-1.5 text-center text-sm font-semibold text-brand shadow-[var(--shadow-sm)] sm:min-h-8 sm:text-xs">
        {label}
      </span>
      <PagerButton href={nextHref} label={nextLabel} direction="next" />
    </nav>
  );
}

function PagerButton({ href, label, direction }: { href?: string; label: string; direction: "previous" | "next" }) {
  const icon = direction === "previous" ? <ArrowLeft aria-hidden="true" size={14} /> : <ArrowRight aria-hidden="true" size={14} />;
  const className = "inline-flex min-h-11 min-w-11 items-center justify-center rounded-[var(--radius-md)] border border-border bg-white px-2 text-xs font-semibold text-brand shadow-[var(--shadow-sm)] transition hover:border-brand hover:bg-[var(--color-brand-subtle)] sm:min-h-8 sm:min-w-8";
  if (!href) {
    return (
      <span className={`${className} opacity-45`} aria-disabled="true" title={label}>
        {icon}
      </span>
    );
  }

  return (
    <Link href={href} className={className} aria-label={label} title={label}>
      {icon}
    </Link>
  );
}
