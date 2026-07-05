import { cn } from "@/lib/utils"

/**
 * Consistent editorial section heading: eyebrow (small, uppercase,
 * tracked, in brand purple with a leading rule-mark) → title → subtitle.
 *
 * Style aligns with the PageHeader used across the dashboards, so the
 * public and dashboard surfaces read as one editorial system.
 */
export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "center",
  className,
}: {
  eyebrow?: string
  title: string
  subtitle?: string
  align?: "center" | "start"
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3.5",
        align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl",
        className,
      )}
    >
      {eyebrow && (
        <span
          className={cn(
            "inline-flex items-center gap-2.5 font-heading text-[11px] font-semibold uppercase tracking-[0.18em] text-primary",
            align === "center" && "justify-center",
          )}
        >
          <span
            className="h-px w-8 bg-gradient-to-l from-transparent to-primary/60 rtl:from-transparent rtl:to-primary/60"
            aria-hidden
          />
          {eyebrow}
          <span
            className="h-px w-8 bg-gradient-to-r from-transparent to-primary/60"
            aria-hidden
          />
        </span>
      )}
      <h2 className="text-balance font-heading text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl lg:text-[42px]">
        {title}
      </h2>
      {subtitle && (
        <p className="text-pretty text-base leading-relaxed text-muted-foreground sm:text-[17px]">
          {subtitle}
        </p>
      )}
    </div>
  )
}
