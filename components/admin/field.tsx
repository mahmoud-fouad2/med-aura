import { cn } from "@/lib/utils"

/**
 * Label + control wrapper for admin forms — the whole field is one <label>
 * so clicking the caption focuses the input without needing to thread a
 * matching id/htmlFor through every call site. Previously reimplemented
 * (with small style drift — text-sm vs text-xs, muted vs foreground) in
 * catalog-forms, geography-forms, center-table, doctor-table, and
 * create-followup-task-form; this is the single version all of them use now.
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
