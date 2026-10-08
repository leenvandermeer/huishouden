interface FinancialHealthScoreProps {
  score: number;
  trend: number;
  label: string;
  explanation: string;
}

export function FinancialHealthScore({ score, trend, label, explanation }: FinancialHealthScoreProps) {
  const tone = score >= 80 ? "success" : score >= 50 ? "warning" : "danger";
  const toneClasses = {
    success: { bg: "bg-emerald-50", ring: "stroke-emerald-500", text: "text-emerald-700" },
    warning: { bg: "bg-amber-50", ring: "stroke-amber-500", text: "text-amber-700" },
    danger: { bg: "bg-red-50", ring: "stroke-red-500", text: "text-red-700" },
  };
  const trendIcon = trend > 0 ? "↑" : trend < 0 ? "↓" : "→";
  const trendColor = trend > 0 ? "text-emerald-600" : trend < 0 ? "text-red-600" : "text-gray-500";

  const circumference = 2 * Math.PI * 54;
  const progress = circumference * (score / 100);

  return (
    <section className={`rounded-[var(--radius-lg)] border p-4 shadow-[var(--shadow-sm)] ${toneClasses[tone].bg}`}>
      <div className="flex items-start gap-4">
        <div className="relative h-28 w-28 shrink-0">
          <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
            <circle cx="60" cy="60" r="54" fill="none" stroke="#e5e7eb" strokeWidth="10" />
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              className={toneClasses[tone].ring}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${progress} ${circumference}`}
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center">
            <span className={`text-2xl font-bold tabular-nums ${toneClasses[tone].text}`}>{score}</span>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold text-brand">Financieel Welzijn</h2>
            <span className={`text-xs font-semibold ${trendColor}`}>
              {trendIcon} {trend > 0 ? "+" : ""}{trend}
            </span>
          </div>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">{label}</p>
          <p className="mt-2 text-xs leading-5 text-[var(--color-text-muted)]">{explanation}</p>
        </div>
      </div>
    </section>
  );
}
