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
            className="object-cover object-center"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-[linear-gradient(110deg,var(--background)_10%,color-mix(in_oklab,var(--background)_86%,transparent)_46%,transparent_100%)] ltr:bg-[linear-gradient(250deg,var(--background)_10%,color-mix(in_oklab,var(--background)_86%,transparent)_46%,transparent_100%)]" />
        </div>
      ) : (
        <div className="absolute inset-0 bg-section-soft" />
      )}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,color-mix(in_oklab,var(--gold)_10%,transparent),transparent_32%),radial-gradient(circle_at_bottom_left,color-mix(in_oklab,var(--primary)_8%,transparent),transparent_30%)]" />
      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className={cn("grid items-end gap-8", stats?.length ? "lg:grid-cols-[minmax(0,1fr)_22rem]" : "") }>
          <FadeIn className="max-w-3xl">
          {eyebrow && (
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card/76 px-3.5 py-1.5 text-sm font-bold text-primary shadow-sm backdrop-blur-md">
              {eyebrow}
            </span>
          )}
          <h1 className="mt-5 text-balance font-heading text-4xl font-bold leading-[1.1] text-foreground sm:text-5xl lg:text-6xl">
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
                  className="rounded-2xl border-white/70 bg-card/72 px-6 backdrop-blur-md"
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
                  className="rounded-[1.5rem] border border-white/70 bg-card/80 px-4 py-4 shadow-sm backdrop-blur-md"
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
              <div className="rounded-[2rem] border border-white/70 bg-card/74 p-4 shadow-elegant-lg backdrop-blur-xl">
                <div className="mb-3 flex items-center justify-between gap-3 px-1">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary/80">
                      Snapshot
                    </p>
                    <p className="mt-1 font-heading text-xl font-bold text-foreground">
                      At a glance
                    </p>
                  </div>
                  <div className="size-11 rounded-2xl bg-primary/12" />
                </div>
                <dl className="grid gap-3">
                  {stats.map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-[1.4rem] border border-white/70 bg-background/88 px-4 py-4 shadow-sm"
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
