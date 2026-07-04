"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Heart } from "lucide-react"
import { toast } from "sonner"
import { toggleFavoriteAction } from "@/lib/actions/favorites"
import { cn } from "@/lib/utils"

/**
 * Optimistic toggle button. Reverts local state on failure so the user
 * always sees the truth of the DB after the round-trip. Renders as a
 * square icon button; wrap in Button variants at the call site if a
 * different look is needed.
 */
export function FavoriteToggle({
  kind,
  refId,
  initialFavorited,
  isSignedIn,
  label = "أضف للمفضلة",
  size = 36,
}: {
  kind: "doctor" | "center" | "procedure"
  refId: string
  initialFavorited: boolean
  isSignedIn: boolean
  label?: string
  size?: number
}) {
  const [favorited, setFavorited] = useState(initialFavorited)
  const [pending, start] = useTransition()
  const router = useRouter()

  function onClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!isSignedIn) {
      router.push("/sign-in?returnTo=" + encodeURIComponent(location.pathname))
      return
    }
    const next = !favorited
    setFavorited(next)
    start(async () => {
      const res = await toggleFavoriteAction(kind, refId)
      if (res.ok) {
        setFavorited(res.favorited)
        router.refresh()
      } else {
        setFavorited(!next)
        toast.error(res.error)
      }
    })
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-pressed={favorited}
      aria-label={favorited ? "إزالة من المفضلة" : label}
      style={{ width: size, height: size }}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full border transition-all",
        favorited
          ? "border-destructive/40 bg-destructive/10 text-destructive"
          : "border-border bg-background/80 text-muted-foreground hover:text-destructive",
        pending && "opacity-70",
      )}
    >
      <Heart
        className="size-[55%]"
        fill={favorited ? "currentColor" : "none"}
      />
    </button>
  )
}
