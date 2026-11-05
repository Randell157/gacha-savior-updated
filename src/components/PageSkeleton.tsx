import PageShell from "@/components/PageShell";
import { Skeleton } from "@/components/ui/skeleton";

export type SkeletonKind = "dashboard" | "cards" | "grid" | "detail" | "rows";

/**
 * Placeholder shown while auth and saved data load, shaped like the page
 * that's coming so nothing jumps when it appears.
 */
export default function PageSkeleton({ kind = "cards" }: { kind?: SkeletonKind }) {
  return (
    <PageShell title={<Skeleton className="h-8 w-48 bg-indigo-100 dark:bg-indigo-900/50" />}>
      <div aria-busy="true">
        <span className="sr-only">Loading your data...</span>
        {kind === "dashboard" && <DashboardSkeleton />}
        {kind === "cards" && <CardsSkeleton />}
        {kind === "grid" && <GridSkeleton />}
        {kind === "detail" && <DetailSkeleton />}
        {kind === "rows" && <RowsSkeleton />}
      </div>
    </PageShell>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-full" />
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-[4.5rem] sm:h-[5.5rem]" />
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-[280px] rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 2 }, (_, i) => (
          <Skeleton key={i} className="h-80" />
        ))}
      </div>
    </div>
  );
}

function CardsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} className="h-40" />
      ))}
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-4 justify-items-center">
      {Array.from({ length: 21 }, (_, i) => (
        <div key={i} className="flex flex-col items-center p-2">
          <Skeleton className="w-20 h-20 sm:w-24 sm:h-24" />
          <Skeleton className="mt-2 h-3 w-14" />
        </div>
      ))}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col sm:flex-row gap-8">
      <Skeleton className="w-36 h-36 sm:w-44 sm:h-44 shrink-0 rounded-xl" />
      <div className="flex-1 space-y-3">
        <Skeleton className="h-6 w-32" />
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-4 w-56" />
        ))}
      </div>
    </div>
  );
}

function RowsSkeleton() {
  return (
    <div className="space-y-5">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="grid grid-cols-3 gap-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 col-span-2 w-48" />
        </div>
      ))}
    </div>
  );
}
