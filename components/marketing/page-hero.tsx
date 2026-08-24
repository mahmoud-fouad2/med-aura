import Link from "next/link"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { FadeIn } from "@/components/motion"

type CTA = { href: string; label: string }
type Stat = { label: string; value: string }

export function PageHero({
  eyebrow,
  title,
  subtitle,
  primary,
  secondary,
  imageSrc,
  imageAlt = "",
  stats,
}: {
  eyebrow?: string
  title: string
  subtitle?: string
  primary?: CTA
  secondary?: CTA
  imageSrc?: string
  imageAlt?: string
  stats?: Stat[]
}) {
  return (
    <section className="relative overflow-hidden border-b border-border bg-background">
      {imageSrc ? (
        <div className="absolute inset-0">
          <Image
            src={imageSrc}
            alt={imageAlt}
            fill
            priority
            loading="eager"
            fetchPriority="high"
            className="object-cover object-center"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-[linear-gradient(110deg,var(--background)_10%,color-mix(in_oklab,var(--background)_86%,transparent)_46%,transparent_100%)] ltr:bg-[linear-gradient(250deg,var(--background)_10%,color-mix(in_oklab,var(--background)_86%,transparent)_46%,transparent_100%)]" />
        </div>
      ) : (
        <div className="absolute inset-0 bg-section-soft" />
      )}
      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className={cn("grid items-end gap-8", stats?.length ? "lg:grid-cols-[minmax(0,1fr)_22rem]" : "") }>
          <FadeIn className="max-w-3xl">
          {eyebrow && (
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card/76 px-3.5 py-1.5 text-sm font-bold text-primary shadow-sm backdrop-blur-md">
              {eyebrow}
            </span>
          )}
          <h1 className="mt-5 text-balance font-heading text-3xl font-bold leading-tight text-foreground sm:text-4xl lg:text-5xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-4 max-w-2xl text-pretty text-base leading-8 text-muted-foreground sm:text-lg">
              {subtitle}
            </p>
          )}
          {(primary || secondary) && (
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              {primary && (
                <Button size="lg" className="rounded-2xl px-6 shadow-sm shadow-primary/20" render={<Link href={primary.href}>{primary.label}</Link>} />
              )}
              {secondary && (
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-2xl border-border/80 bg-card/90 px-6 backdrop-blur-md hover:bg-card hover:border-primary/40"
                  render={<Link href={secondary.href}>{secondary.label}</Link>}
                />
              )}
            </div>
          )}
          {!stats?.length ? null : (
            <dl className="mt-8 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-3 lg:hidden">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-border/70 bg-card/90 px-4 py-4 shadow-sm"
                >
                  <dt className="text-xs font-medium text-muted-foreground">
                    {stat.label}
                  </dt>
                  <dd className="mt-1 font-heading text-xl font-bold text-foreground">
                    {stat.value}
                  </dd>
                </div>
              ))}
            </dl>
          )}
          </FadeIn>

          {stats && stats.length > 0 && (
            <FadeIn delay={0.12} className="hidden lg:block">
              <div className="rounded-xl border border-border/70 bg-card/90 p-4 shadow-elegant">
                <dl className="grid gap-3">
                  {stats.map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-lg border border-border/70 bg-background px-4 py-4"
                    >
                      <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        {stat.label}
                      </dt>
                      <dd className="mt-2 font-heading text-2xl font-bold text-foreground">
                        {stat.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </FadeIn>
          )}
        </div>
      </div>
    </section>
  )
}
