import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Stagger, StaggerItem } from "@/components/motion"

export type Feature = { icon: LucideIcon; title: string; desc: string }

export function FeatureGrid({
  items,
  className,
}: {
  items: Feature[]
  className?: string
}) {
  return (
    <Stagger
      className={cn(
        "grid gap-5 sm:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {items.map((f) => (
        <StaggerItem key={f.title}>
          <div className="flex h-full flex-col gap-4 rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-elegant">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/12 to-accent text-primary">
              <f.icon className="size-6" />
            </span>
            <h3 className="font-heading text-lg font-bold text-foreground">
              {f.title}
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {f.desc}
            </p>
          </div>
        </StaggerItem>
      ))}
    </Stagger>
  )
}
