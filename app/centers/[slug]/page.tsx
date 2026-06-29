import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { Building2, MapPin, BadgeCheck, Languages as LangIcon, ChevronLeft } from "lucide-react"
import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/empty-state"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Reveal } from "@/components/motion"
import { getCenterBySlug } from "@/lib/data/centers"
import { Stethoscope } from "lucide-react"
import { appUrl } from "@/lib/env"

export const dynamic = "force-dynamic"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const c = await getCenterBySlug(slug)
  if (!c) return { title: "المركز غير موجود" }
  return {
    title: c.name,
    description: c.description ?? `${c.name} على Med Aura.`,
  }
}

export default async function CenterDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const c = await getCenterBySlug(slug)
  if (!c) notFound()

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "MedicalClinic",
    name: c.name,
    address: [c.city, c.country].filter(Boolean).join("، ") || undefined,
    url: `${appUrl()}/centers/${c.slug}`,
  }

  return (
    <div className="flex min-h-svh flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-border bg-mesh">
          <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8">
            <nav className="mb-4 flex items-center gap-1 text-sm text-muted-foreground">
              <Link href="/centers" className="hover:text-primary">
                المراكز
              </Link>
              <ChevronLeft className="size-4" />
              <span className="text-foreground">{c.name}</span>
            </nav>
            <Reveal>
              <div className="flex items-start gap-4">
                <span className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Building2 className="size-8" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground">
                      {c.name}
                    </h1>
                    {c.verified && <BadgeCheck className="size-5 text-primary" />}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="size-4" />
                      {[c.city, c.country].filter(Boolean).join("، ")}
                    </span>
                    {c.languages.length > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <LangIcon className="size-4" />
                        {c.languages.join("، ")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {c.description && (
                <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted-foreground">
                  {c.description}
                </p>
              )}
            </Reveal>
          </div>
        </section>

        <section className="bg-background">
          <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
            <h2 className="mb-8 font-heading text-2xl font-bold text-foreground">
              أطباء المركز
            </h2>
            {c.doctors.length === 0 ? (
              <EmptyState
                icon={Stethoscope}
                title="لا يوجد أطباء منشورون في هذا المركز بعد"
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {c.doctors.map((d) => (
                  <Link key={d.slug} href={`/doctors/${d.slug}`}>
                    <Card className="flex items-center gap-3 p-4 transition-colors hover:border-primary/40">
                      <Avatar className="size-12">
                        <AvatarFallback className="bg-primary/10 font-semibold text-primary">
                          {d.name.replace(/^د\.?\s*/, "").trim().charAt(0) || "د"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate font-heading font-bold text-foreground">
                          {d.name}
                        </p>
                        {d.title && (
                          <p className="truncate text-sm text-muted-foreground">
                            {d.title}
                          </p>
                        )}
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
