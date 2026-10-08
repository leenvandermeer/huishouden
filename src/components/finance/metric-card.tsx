export function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <section className="rounded-[var(--radius-lg)] border border-border bg-white px-3 py-2.5 shadow-[var(--shadow-sm)]">
      <p className="text-[0.65rem] font-bold uppercase tracking-wide text-[var(--color-text-subtle)]">{label}</p>
      <p className="mt-1 text-lg font-semibold leading-tight text-brand">{value}</p>
      <p className="mt-1 text-[0.7rem] text-[var(--color-text-muted)]">{detail}</p>
    </section>
  );
}
