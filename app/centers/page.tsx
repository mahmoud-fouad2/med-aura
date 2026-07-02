import Link from "next/link"
import { Building2, MapPin, BadgeCheck, Users } from "lucide-react"
import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { PageHero } from "@/components/marketing/page-hero"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/empty-state"
import { DataState } from "@/components/ui/data-state"
import { Button } from "@/components/ui/button"
import { Stagger, StaggerItem } from "@/components/motion"
import { listPublishedCenters } from "@/lib/data/centers"
import { query } from "@/lib/db/query"
import { countryNameAr } from "@/lib/status-labels"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "مراكز التجميل",
  description: "تصفّح مراكز التجميل المعتمدة على Med Aura واطّلع على أطبائها وخدماتها.",
}

export default async function CentersPage() {
  const res = await query(() => listPublishedCenters())
  const centers = res.status === "ok" ? res.data : []

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <PageHero
          eyebrow="المراكز"
          title="مراكز التجميل المعتمدة"
          subtitle="مراكز تم التحقق من تراخيصها، تضم نخبة من أطباء التجميل."
        />

        <section className="bg-background">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            {res.status !== "ok" ? (
              <DataState
                status={res.status}
                requestId={res.status === "error" ? res.requestId : undefined}
              />
            ) : centers.length === 0 ? (
              <EmptyState
                icon={Building2}
                title="لا توجد مراكز منشورة بعد"
                description="يظهر هنا المراكز بعد التحقق من تراخيصها. هل تمثّل مركزًا؟ سجّل مركزك معنا."
                action={<Button render={<Link href="/for-centers">سجّل مركزك</Link>} />}
              />
            ) : (
              <Stagger className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {centers.map((c) => (
                  <StaggerItem key={c.id}>
                    <Link href={`/centers/${c.slug}`}>
                      <Card className="h-full p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-elegant">
                        <div className="flex items-start justify-between gap-2">
                          <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <Building2 className="size-6" />
                          </span>
                          {c.verified && (
                            <Badge variant="secondary">
                              <BadgeCheck className="size-3" /> موثّق
                            </Badge>
                          )}
                        </div>
                        <h3 className="mt-4 font-heading text-lg font-bold text-foreground">
                          {c.name}
                        </h3>
                        <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="size-3.5" />
                          {[c.city, countryNameAr(c.country)].filter(Boolean).join("، ")}
                        </p>
                        {c.description && (
                          <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                            {c.description}
                          </p>
                        )}
                        <p className="mt-4 inline-flex items-center gap-1 text-sm text-primary">
                          <Users className="size-4" />
                          {c.doctorCount} طبيب
                        </p>
                      </Card>
                    </Link>
                  </StaggerItem>
                ))}
              </Stagger>
            )}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
