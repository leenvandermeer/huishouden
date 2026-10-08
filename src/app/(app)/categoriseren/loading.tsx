import { Skeleton } from "@/components/ui/skeleton";

export default function CategoriserenLoading() {
  return (
    <div className="cockpit-canvas grid gap-3">
      <div className="command-panel view-card rounded-[var(--radius-lg)] p-4 md:p-5">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-16 rounded-md" />
          <Skeleton className="h-5 w-20 rounded-md" />
        </div>
        <Skeleton className="mt-4 h-9 w-64" />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Skeleton className="h-20 rounded-[var(--radius-lg)]" />
        <Skeleton className="h-20 rounded-[var(--radius-lg)]" />
        <Skeleton className="h-20 rounded-[var(--radius-lg)]" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-[var(--radius-lg)]" />
        ))}
      </div>
    </div>
  );
}
