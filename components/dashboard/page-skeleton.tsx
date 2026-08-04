import { Skeleton } from "@/components/ui/skeleton"

/**
 * Generic route-level loading placeholder — approximates the common
 * header + KPI-row + content-block shape shared by admin and dashboard
 * pages, so navigating between routes shows instant feedback instead of
 * the previous page sitting frozen until the new one's data arrives.
 * Not a pixel-perfect match for every page; close enough to avoid a jarring
 * layout jump once the real content mounts.
 */
export function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-3 border-b border-border/60 pb-6">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-64 max-w-full" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-2xl" />
    </div>
  )
}
