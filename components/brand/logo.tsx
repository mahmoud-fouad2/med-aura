import { cn } from "@/lib/utils"

/**
 * Med Aura brand — single source of truth.
 *
 * The mark is an "M" monogram inside a soft "aura" ring. It uses currentColor
 * so it inherits the surrounding text color (e.g. wrap in `text-primary`).
 * To swap in final brand artwork later, replace ONLY this file.
 */
export function LogoMark({
  className,
  title = "Med Aura",
}: {
  className?: string
  title?: string
}) {
  return (
    <svg
      viewBox="0 0 40 40"
      role="img"
      aria-label={title}
      className={cn("h-9 w-9", className)}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* aura ring */}
      <circle
        cx="20"
        cy="20"
        r="17.5"
        stroke="currentColor"
        strokeOpacity="0.18"
        strokeWidth="1.5"
      />
      <circle
        cx="20"
        cy="20"
        r="13"
        stroke="currentColor"
        strokeOpacity="0.10"
        strokeWidth="1.5"
      />
      {/* M monogram */}
      <path
        d="M11 28V14.5C11 13.4 12.35 12.9 13.06 13.74L20 22L26.94 13.74C27.65 12.9 29 13.4 29 14.5V28"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "font-heading text-xl font-extrabold tracking-[0.18em] text-foreground",
        className,
      )}
    >
      MED<span className="text-primary"> AURA</span>
    </span>
  )
}

/** Combined lockup used in headers, auth, footer. */
export function Logo({
  className,
  markClassName,
  showWordmark = true,
}: {
  className?: string
  markClassName?: string
  showWordmark?: boolean
}) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <span className="text-primary">
        <LogoMark className={markClassName} />
      </span>
      {showWordmark && <Wordmark />}
    </span>
  )
}
