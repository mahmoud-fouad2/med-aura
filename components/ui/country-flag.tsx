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
 * Renders a country's ISO code as a small designed badge rather than the
 * Unicode flag emoji — regional-indicator flag emoji don't render as actual
 * flags on Windows (most fonts show the bare two-letter code or a broken
 * glyph instead), so relying on them looked broken rather than just plain.
 * This is deterministic across every OS/browser and doesn't depend on font
 * support at all.
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
