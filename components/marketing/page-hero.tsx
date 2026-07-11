import Link from "next/link"
import Image from "next/image"
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
          <div className="absolute inset-0 bg-gradient-to-l from-background via-background/93 to-background/68" />
        </div>
      ) : (
        <div className="absolute inset-0 bg-mesh" />
      )}
      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <FadeIn className="max-w-3xl">
          {eyebrow && (
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card/80 px-3.5 py-1.5 text-sm font-bold text-primary shadow-sm backdrop-blur-md">
              {eyebrow}
            </span>
          )}
          <h1 className="mt-5 text-balance font-heading text-4xl font-extrabold leading-tight text-foreground sm:text-5xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-4 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
              {subtitle}
            </p>
          )}
          {(primary || secondary) && (
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
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
          {stats && stats.length > 0 && (
            <dl className="mt-8 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-3">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-white/70 bg-card/82 px-4 py-3 shadow-sm backdrop-blur-md"
                >
                  <dt className="text-xs font-medium text-muted-foreground">
                    {stat.label}
                  </dt>
                  <dd className="mt-1 font-heading text-lg font-extrabold text-foreground">
                    {stat.value}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </FadeIn>
      </div>
    </section>
  )
}
