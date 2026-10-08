import { cn } from "@/lib/cn";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-md bg-[var(--color-surface-alt)]", className)} {...props} />;
}

function SkeletonText({ className, lines = 1 }: { className?: string; lines?: number }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn("h-4", i === lines - 1 ? "w-3/4" : "w-full")} />
      ))}
    </div>
  );
}

function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-[var(--radius-lg)] border border-border bg-white/70 p-3", className)}>
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 shrink-0 rounded-md" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-5 w-1/2" />
        </div>
      </div>
    </div>
  );
}

function SkeletonDashboard() {
  return (
    <div className="cockpit-canvas grid gap-4">
      <div className="command-panel view-card rounded-[var(--radius-lg)] p-4 md:p-5">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-20 rounded-md" />
          <Skeleton className="h-5 w-24 rounded-md" />
        </div>
        <Skeleton className="mt-4 h-9 w-2/3" />
        <SkeletonText className="mt-4" lines={2} />
      </div>
      <div className="surface-panel rounded-[var(--radius-lg)] p-3">
        <Skeleton className="h-5 w-32 mb-3" />
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    </div>
  );
}

function SkeletonTransactions() {
  return (
    <div className="cockpit-canvas grid gap-3">
      <div className="command-panel view-card rounded-[var(--radius-lg)] p-4 md:p-5">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-20 rounded-md" />
          <Skeleton className="h-5 w-16 rounded-md" />
        </div>
        <Skeleton className="mt-4 h-9 w-48" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-[var(--radius-lg)]" />
        ))}
      </div>
    </div>
  );
}

export { Skeleton, SkeletonText, SkeletonCard, SkeletonDashboard, SkeletonTransactions };
