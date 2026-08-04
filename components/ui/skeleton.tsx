import { cn } from "@/lib/utils"

/** Pulsing placeholder block — the base unit for route-level loading.tsx skeletons. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />
}
