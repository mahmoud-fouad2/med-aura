import Link from "next/link"
import {
  Building2,
  MapPin,
  BadgeCheck,
  Users,
  ChevronLeft,
  Star,
} from "lucide-react"
import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { PageHero } from "@/components/marketing/page-hero"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { DataState } from "@/components/ui/data-state"
import { Button } from "@/components/ui/button"
import { Stagger, StaggerItem } from "@/components/motion"
import { FavoriteToggle } from "@/components/favorites/favorite-toggle"
import { listPublishedCenters } from "@/lib/data/centers"
import { query } from "@/lib/db/query"
import { getCurrentUser } from "@/lib/session"
import { getFavoriteRefIds } from "@/lib/data/favorites"
import { countryNameAr } from "@/lib/status-labels"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "مراكز التجميل",
  description:
    "تصفّح مراكز التجميل المعتمدة على Med Aura واطّلع على أطبائها وخدماتها.",
}

export default async function CentersPage() {
  const user = await getCurrentUser()
  const [res, favs] = await Promise.all([
    query(() => listPublishedCenters()),
    user
      ? getFavoriteRefIds(user.id)
      : Promise.resolve({
          doctor: new Set<string>(),
          center: new Set<string>(),
          procedure: new Set<string>(),
        }),
  ])
  const centers = res.status === "ok" ? res.data : []

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <PageHero
          eyebrow="المراكز"
          title="مراكز التجميل المعتمدة"
          subtitle="مراكز تم التحقق من تراخيصها الطبية، بأطباء تجميل معتمدين في كل تخصص."
        />

        <section className="bg-background">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            {res.status !== "ok" ? (
              <DataState
                status={res.status}
                requestId={
                  res.status === "error" ? res.requestId : undefined
                }
              />
            ) : centers.length === 0 ? (
              <Card className="p-12">
                <EmptyState
                  icon={Building2}
                  title="لا توجد مراكز منشورة بعد"
                  description="ستظهر المراكز هنا بعد التحقق من تراخيصها. هل تمثّل مركزًا؟ سجّل مركزك معنا."
                  action={
                    <Button
                      render={
                        <Link href="/for-centers/apply">
                          سجّل مركزك
                          <ChevronLeft className="size-4 rtl:rotate-0 ltr:rotate-180" />
                        </Link>
                      }
                    />
                  }
                />
              </Card>
            ) : (
              <Stagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {centers.map((c) => (
                  <StaggerItem key={c.id}>
                    <Card className="group relative flex h-full flex-col overflow-hidden p-0 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_2px_4px_rgba(20,20,60,0.05),0_12px_28px_-12px_rgba(20,20,60,0.16)]">
                      {/* Top gradient accent */}
                      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent" />

                      {/* Favorite heart */}
                      <div className="absolute end-3 top-3 z-10">
                        <FavoriteToggle
                          kind="center"
                          refId={c.id}
                          initialFavorited={favs.center.has(c.id)}
                          isSignedIn={Boolean(user)}
                          size={32}
                        />
                      </div>

                      {/* Cover strip with icon */}
                      <div className="relative flex h-24 items-end bg-gradient-to-br from-primary/8 via-secondary/40 to-background px-5 pb-3 pt-5">
                        <span className="flex size-14 items-center justify-center rounded-2xl bg-background text-primary ring-1 ring-primary/15 shadow-[0_4px_16px_-8px_rgba(74,29,150,0.28)]">
                          <Building2 className="size-6" />
                        </span>
                      </div>

                      <div className="flex flex-1 flex-col p-5">
                        <div className="flex items-start gap-2">
                          <Link
                            href={`/centers/${c.slug}`}
                            className="font-heading font-bold leading-tight text-foreground transition-colors hover:text-primary"
                          >
                            {c.name}
                          </Link>
                          {c.verified && (
                            <BadgeCheck
                              className="mt-0.5 size-4 shrink-0 text-primary"
                              aria-label="مركز موثّق"
                            />
                          )}
                        </div>
                        <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="size-3" />
                          {[c.city, countryNameAr(c.country)]
                            .filter(Boolean)
                            .join("، ")}
                        </p>
                        {c.description && (
                          <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                            {c.description}
                          </p>
                        )}

                        <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
                          <span className="inline-flex items-center gap-1 text-primary">
                            <Users className="size-3.5" />
                            <span className="font-medium">
                              {c.doctorCount} طبيب
                            </span>
                          </span>
                          {c.reviewCount > 0 && c.rating ? (
                            <span className="inline-flex items-center gap-1 font-medium text-foreground">
                              <Star className="size-3 fill-current text-warning-foreground" />
                              <span className="tabular-nums">{c.rating}</span>
                              <span className="text-muted-foreground">
                                ({c.reviewCount})
                              </span>
                            </span>
                          ) : (
                            <span className="text-muted-foreground/60">
                              لا تقييمات بعد
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="border-t border-border/60 bg-muted/20 px-5 py-3">
                        <Link
                          href={`/centers/${c.slug}`}
                          className="group/link inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                        >
                          استكشف المركز
                          <ChevronLeft className="size-3.5 transition-transform group-hover/link:-translate-x-0.5 rtl:rotate-0 ltr:rotate-180" />
                        </Link>
                      </div>
                    </Card>
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
