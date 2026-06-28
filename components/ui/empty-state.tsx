import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

/** Consistent empty state: icon, title, description, optional action slot. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-14 text-center",
        className,
      )}
    >
      <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="size-7" />
      </span>
      <div className="space-y-1">
        <h3 className="font-heading text-lg font-bold text-foreground">{title}</h3>
        {description && (
          <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  )
}
