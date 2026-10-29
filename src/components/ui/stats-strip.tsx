import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface StatItem {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  /** The lead figure spans two columns and is set larger. */
  lead?: boolean;
  tone?: "risk" | "positive";
}

/** Key figures inside a title band, as the stats strips of the Oceanco apps. */
export function StatsStrip({ items, className }: { items: StatItem[]; className?: string }) {
  return (
    <dl className={cn("stats-strip", className)}>
      {items.map((item) => (
        <div key={item.label} className={cn(item.lead && "stats-strip__lead", item.tone && `stats-strip__item--${item.tone}`)}>
          <dd className="money-value">{item.value}</dd>
          <dt>{item.label}</dt>
          {item.detail ? <small>{item.detail}</small> : null}
        </div>
      ))}
    </dl>
  );
}
