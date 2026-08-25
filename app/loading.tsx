import { Logo } from "@/components/brand/logo"
import { Loader2 } from "lucide-react"

export default function Loading() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background">
      <div className="relative flex items-center justify-center">
        {/* Outer glowing ring */}
        <div className="absolute inset-0 scale-150 animate-pulse rounded-full bg-primary/10 blur-xl" />
        <Logo className="relative z-10 h-10" />
      </div>
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="size-5 animate-spin text-primary/80" />
        <span className="text-sm text-muted-foreground font-medium animate-pulse">
          جارٍ التحميل...
        </span>
      </div>
    </div>
  )
}
