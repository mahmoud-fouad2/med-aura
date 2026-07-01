import { Smile, Gem, Activity, Sparkles, Scissors, SmilePlus, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

const ICONS: Record<string, LucideIcon> = { Smile, Gem, Activity, Sparkles, Scissors, SmilePlus }

/** Resolves a category's stored lucide icon name to a component, with a safe fallback. */
export function resolveCategoryIcon(icon: string | null | undefined): LucideIcon {
  return (icon && ICONS[icon]) || Sparkles
}

/** Colored gradient badge used wherever a procedure category is shown as a card/heading. */
export function CategoryIconBadge({
  icon,
  className,
  iconClassName,
}: {
  icon: string | null | undefined
  className?: string
  iconClassName?: string
}) {
  const Icon = resolveCategoryIcon(icon)
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-accent/40 text-primary",
        "size-12",
        className,
      )}
    >
      <Icon className={cn("size-6", iconClassName)} />
    </span>
  )
}
