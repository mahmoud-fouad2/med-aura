import { PersonAvatar } from "@/components/ui/person-avatar"

/**
 * Overlapping small avatars + an optional "+N" count — a social-proof row
 * that needs no real photography (reuses PersonAvatar's initials/color
 * fallback), so it works honestly with whatever names are passed in.
 */
export function AvatarCluster({
  names,
  extraCount,
  className,
}: {
  names: string[]
  extraCount?: number
  className?: string
}) {
  return (
    <div className={"flex items-center -space-x-2.5 rtl:space-x-reverse " + (className ?? "")}>
      {names.map((name, i) => (
        <PersonAvatar
          key={name + i}
          name={name}
          size="sm"
          className="ring-2 ring-background"
        />
      ))}
      {extraCount != null && extraCount > 0 && (
        <span className="flex size-6 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground ring-2 ring-background">
          +{extraCount}
        </span>
      )}
    </div>
  )
}
