import { BadgeCheck } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Small pill meant to sit absolutely-positioned over a photo (top-start) —
 * only render this when there's an actual photo underneath; an unphotographed
 * initials avatar doesn't need a badge floating on it.
 */
export function VerifiedBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold text-primary-foreground shadow-elegant ring-1 ring-white/20",
        className
      )}
    >
      <BadgeCheck className="size-3.5" />
      موثّق
    </span>
  )
}
