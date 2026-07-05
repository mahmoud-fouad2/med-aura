import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Editorial empty state. Uses layered background circles + subtle dot
 * pattern for visual richness, so a "no results" screen doesn't feel
 * empty in a punishing way. The icon sits inside a double-ring chip —
 * a subtle ring outside for depth, matching the metric-card treatment.
 *
 * Tones: primary (default) tints the icon chip in brand purple.
 * "muted" is a calmer variant for admin queues where the empty
 * state is expected and not something the user needs to act on.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  tone = "primary",
  className,
}: {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  tone?: "primary" | "muted"
  className?: string
}) {
  const isPrimary = tone === "primary"
  return (
    <div
      className={cn(
        "relative isolate flex flex-col items-center justify-center gap-4 overflow-hidden rounded-2xl border border-dashed border-border/70 bg-gradient-to-b from-muted/25 to-transparent px-6 py-14 text-center",
        className,
      )}
    >
      {/* Decorative background — no external assets */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-60"
      >
        <svg
          className="h-full w-full text-primary/5"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern
              id="empty-dots"
              width="16"
              height="16"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="1" cy="1" r="1" fill="currentColor" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#empty-dots)" />
        </svg>
      </div>

      <span
        className={cn(
          "relative flex size-16 items-center justify-center rounded-2xl ring-1",
          isPrimary
            ? "bg-primary/10 text-primary ring-primary/15"
            : "bg-muted text-muted-foreground ring-border",
        )}
      >
        {/* Outer soft halo */}
        <span
          aria-hidden="true"
          className={cn(
            "absolute inset-0 -z-10 scale-125 rounded-3xl blur-lg",
            isPrimary ? "bg-primary/8" : "bg-muted-foreground/8",
          )}
        />
        <Icon className="size-7" />
      </span>

      <div className="max-w-md space-y-1.5">
        <h3 className="font-heading text-lg font-bold leading-tight text-foreground">
          {title}
        </h3>
        {description && (
          <p className="mx-auto text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {action && <div className="pt-1">{action}</div>}
    </div>
  )
}
