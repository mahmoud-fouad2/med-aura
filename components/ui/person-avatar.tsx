import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

function hueForName(name: string): number {
  let hash = 0
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) % 360
  return hash
}

/**
 * A doctor/patient/staff avatar: shows the real photo when one exists, and
 * otherwise a professionally-designed initials badge (deterministic color
 * per name) instead of a blank gray circle. Base UI's Avatar.Fallback only
 * renders once the image element has failed/finished loading, so a broken
 * or slow-to-load photo degrades to the same initials badge automatically.
 */
export function PersonAvatar({
  src,
  name,
  size = "default",
  className,
}: {
  src?: string | null
  name: string
  size?: "sm" | "default" | "lg"
  className?: string
}) {
  const initial = name.trim().charAt(0) || "؟"
  const hue = hueForName(name || "؟")

  return (
    <Avatar size={size} className={className}>
      {src && <AvatarImage src={src} alt={name} />}
      <AvatarFallback
        className={cn("font-semibold")}
        style={{
          backgroundColor: `oklch(0.93 0.045 ${hue})`,
          color: `oklch(0.4 0.11 ${hue})`,
        }}
      >
        {initial}
      </AvatarFallback>
    </Avatar>
  )
}
