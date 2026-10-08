import { formatPercent } from "@/lib/format";

export function ProgressBar({ value, tone = "brand" }: { value: number; tone?: "brand" | "accent" | "success" | "warning" }) {
  const width = Math.max(0, Math.min(100, value * 100));
  const color = tone === "accent" ? "bg-accent" : tone === "success" ? "bg-emerald-600" : tone === "warning" ? "bg-amber-500" : "bg-brand";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--color-brand-subtle)]">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${width}%` }} />
      </div>
      <span className="w-9 text-right text-[0.68rem] font-semibold text-[var(--color-text-subtle)]">{formatPercent(value)}</span>
    </div>
  );
}
