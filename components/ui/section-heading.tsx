import { cn } from "@/lib/utils"

/** Consistent section header: eyebrow + title + optional subtitle. */
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
        "flex flex-col gap-3",
        align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl",
        className,
      )}
    >
      {eyebrow && (
        <span
          className={cn(
            "inline-flex items-center gap-2 text-sm font-semibold tracking-wide text-primary",
            align === "center" && "justify-center",
          )}
        >
          <span className="h-px w-6 bg-primary/50" aria-hidden />
          {eyebrow}
        </span>
      )}
      <h2 className="text-balance font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        {title}
      </h2>
      {subtitle && (
        <p className="text-pretty text-lg leading-relaxed text-muted-foreground">
          {subtitle}
        </p>
      )}
    </div>
  )
}
