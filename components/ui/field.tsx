import { cn } from "@/lib/utils"

/**
 * Label + control wrapper for forms — the whole field is one <label> so
 * clicking the caption focuses the input without needing to thread a
 * matching id/htmlFor through every call site. Shared by admin forms and
 * the doctor/patient self-service forms alike; not specific to either.
 */
export function Field({
  label,
  hint,
  full,
  children,
}: {
  label: string
  hint?: string
  full?: boolean
  children: React.ReactNode
}) {
  return (
    <label className={cn("space-y-1.5", full && "sm:col-span-2")}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
      {hint && <span className="block text-[11px] leading-relaxed text-muted-foreground/80">{hint}</span>}
    </label>
  )
}
