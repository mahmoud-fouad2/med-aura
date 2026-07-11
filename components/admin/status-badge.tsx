import { AlertTriangle, CheckCircle2, Info, XCircle, Circle } from "lucide-react"
import { cn } from "@/lib/utils"

export type StatusTone = "success" | "warning" | "danger" | "info" | "neutral"

const TONE_CLASSES: Record<StatusTone, string> = {
  success: "bg-success/10 text-success",
  warning: "bg-warning/15 text-warning-foreground",
  danger: "bg-destructive/10 text-destructive",
  info: "bg-info/10 text-info",
  neutral: "bg-muted text-muted-foreground",
}

const TONE_ICONS: Record<StatusTone, React.ComponentType<{ className?: string }>> = {
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
  info: Info,
  neutral: Circle,
}

/** approved/pending/rejected/suspended — shared by admin doctor + center listings. */
export function providerStatusTone(status: string): StatusTone {
  if (status === "approved") return "success"
  if (status === "suspended" || status === "rejected") return "danger"
  return "warning"
}

/**
 * Status badge that never relies on color alone: every tone pairs a fixed
 * icon with the label, so severity/state reads correctly even without color
 * vision. Callers pass a semantic tone (not a raw color), matching the
 * platform's semantic-color rule (success/warning/danger/info/neutral).
 */
export function StatusBadge({
  tone,
  label,
  className,
}: {
  tone: StatusTone
  label: string
  className?: string
}) {
  const Icon = TONE_ICONS[tone]
  return (
    <span
      className={cn(
        "inline-flex h-5 w-fit shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        TONE_CLASSES[tone],
        className,
      )}
    >
      <Icon className="size-3" />
      {label}
    </span>
  )
}
