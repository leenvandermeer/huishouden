import { StatusBadge } from "@/components/ui";

export function ReadonlyNotice({ children = "Je hebt alleen-lezen toegang. Je kunt alles bekijken, maar geen gegevens wijzigen." }: { children?: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-[var(--color-surface)] p-3 text-xs text-[var(--color-text-muted)]">
      <StatusBadge tone="warning">Alleen lezen</StatusBadge>
      <p className="mt-2 leading-5">{children}</p>
    </div>
  );
}
