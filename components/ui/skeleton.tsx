import { cn } from "@/lib/utils"

/** Shimmer skeleton placeholder (see `.skeleton` in globals.css). */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-md", className)} aria-hidden />
}
