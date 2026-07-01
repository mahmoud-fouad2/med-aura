import Image from "next/image"
import { cn } from "@/lib/utils"

/**
 * Med Aura brand — single source of truth.
 *
 * `Logo` is the real horizontal lockup (face + M monogram + "MED AURA"),
 * derived from the master artwork with the white background keyed out so it
 * sits cleanly on any surface. `LogoMark` is a lightweight vector "M" monogram
 * that inherits `currentColor` — used where a single-colour glyph is needed
 * (dark auth panel, loading spinner, decorative watermark, favicons).
 */

/** Real brand lockup (transparent PNG). Default height h-9; override via className. */
export function Logo({ className }: { className?: string }) {
  return (
    <Image
      src="/brand/med-aura-horizontal.png"
      alt="Med Aura — رحلتك التجميلية بثقة"
      width={1233}
      height={391}
      priority
      className={cn("h-9 w-auto select-none", className)}
    />
  )
}

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
