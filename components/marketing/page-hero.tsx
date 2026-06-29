import Link from "next/link"
import { Button } from "@/components/ui/button"
import { FadeIn } from "@/components/motion"

type CTA = { href: string; label: string }

export function PageHero({
  eyebrow,
  title,
  subtitle,
  primary,
  secondary,
}: {
  eyebrow?: string
  title: string
  subtitle?: string
  primary?: CTA
  secondary?: CTA
}) {
  return (
    <section className="relative overflow-hidden border-b border-border bg-mesh">
      <div className="pointer-events-none absolute -top-24 left-1/3 size-96 rounded-full bg-primary/12 blur-[120px]" />
      <div className="relative mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 lg:px-8 lg:py-24">
        <FadeIn className="flex flex-col items-center gap-5">
          {eyebrow && (
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1.5 text-sm font-medium text-primary">
              {eyebrow}
            </span>
          )}
          <h1 className="text-balance font-heading text-4xl font-extrabold leading-[1.15] tracking-tight sm:text-5xl">
            <span className="text-gradient">{title}</span>
          </h1>
          {subtitle && (
            <p className="max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
              {subtitle}
            </p>
          )}
          {(primary || secondary) && (
            <div className="mt-2 flex flex-col gap-3 sm:flex-row">
              {primary && (
                <Button size="lg" render={<Link href={primary.href}>{primary.label}</Link>} />
              )}
              {secondary && (
                <Button
                  size="lg"
                  variant="outline"
                  render={<Link href={secondary.href}>{secondary.label}</Link>}
                />
              )}
            </div>
          )}
        </FadeIn>
      </div>
    </section>
  )
}
