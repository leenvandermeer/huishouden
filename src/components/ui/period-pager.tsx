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
      <span className="grid min-h-11 min-w-[9rem] place-items-center border border-border px-3 py-1.5 text-center text-[0.66rem] uppercase tracking-[0.18em] text-[var(--color-text)] sm:min-h-8">
        {label}
      </span>
      <PagerButton href={nextHref} label={nextLabel} direction="next" />
    </nav>
  );
}

function PagerButton({ href, label, direction }: { href?: string; label: string; direction: "previous" | "next" }) {
  const icon = direction === "previous" ? <ArrowLeft aria-hidden="true" size={14} /> : <ArrowRight aria-hidden="true" size={14} />;
  const className = "inline-flex min-h-11 min-w-11 items-center justify-center border border-border px-2 text-[var(--color-text)] transition-colors hover:bg-brand hover:text-[var(--color-on-brand)] sm:min-h-8 sm:min-w-8";
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
