import * as Flags from "country-flag-icons/react/3x2"
import { cn } from "@/lib/utils"

/**
 * Deterministic per-code color instead of a fixed brand tint — makes a list of
 * many countries visually scannable (each one lands on a distinct hue) while
 * staying inside the same soft/muted family as the rest of the palette.
 */
function hueForCode(code: string): number {
  let hash = 0
  for (const ch of code) hash = (hash * 31 + ch.charCodeAt(0)) % 360
  return hash
}

/**
 * Renders a country's actual flag (real SVG art, not the Unicode flag emoji —
 * regional-indicator flag emoji don't render as actual flags on most Windows
 * fonts, showing the bare two-letter code or a broken glyph instead). Falls
 * back to a designed two-letter badge for codes with no matching flag (or no
 * code yet), so an unrecognized value still looks intentional rather than
 * broken.
 */
export function CountryFlag({
  code,
  className,
}: {
  code: string
  className?: string
}) {
  const upper = code?.trim().toUpperCase() ?? ""
  const valid = /^[A-Z]{2}$/.test(upper)
  const Flag = valid
    ? (Flags as Record<string, React.ComponentType<{ className?: string; title?: string; "aria-hidden"?: boolean | "true" | "false" }>>)[upper]
    : undefined

  if (Flag) {
    return (
      <Flag
        aria-hidden="true"
        title={upper}
        className={cn("inline-block shrink-0 rounded-[3px] object-cover ring-1 ring-black/10", className)}
      />
    )
  }

  const hue = valid ? hueForCode(upper) : 0
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md text-[10px] font-bold tracking-tight tabular-nums",
        className,
      )}
      style={
        valid
          ? {
              backgroundColor: `oklch(0.94 0.045 ${hue})`,
              color: `oklch(0.4 0.11 ${hue})`,
            }
          : undefined
      }
    >
      {valid ? upper : "—"}
    </span>
  )
}
