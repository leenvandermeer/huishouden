import { cn } from "@/lib/cn";

type StatusTone = "neutral" | "success" | "warning" | "error" | "info";

const toneClasses: Record<StatusTone, string> = {
  neutral: "bg-[var(--color-surface-alt)] text-[var(--color-text-muted)]",
  success: "bg-[var(--color-success-subtle)] text-[var(--color-success)]",
  warning: "bg-[var(--color-warning-subtle)] text-[var(--color-warning)]",
  error: "bg-[var(--color-error-subtle)] text-[var(--color-error)]",
  info: "bg-[var(--color-info-subtle)] text-[var(--color-info)]",
};

export function StatusBadge({ children, tone = "neutral", className }: { children: React.ReactNode; tone?: StatusTone; className?: string }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold", toneClasses[tone], className)}>{children}</span>;
}
