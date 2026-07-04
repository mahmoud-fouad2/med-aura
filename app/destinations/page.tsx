import Link from "next/link"
import { Globe2, MapPin, Users, Building2 } from "lucide-react"
import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { PageHero } from "@/components/marketing/page-hero"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { DataState } from "@/components/ui/data-state"
import { Stagger, StaggerItem } from "@/components/motion"
import { listDestinations } from "@/lib/data/destinations"
import { query } from "@/lib/db/query"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "الوجهات",
  description:
    "استكشف الدول التي تعتمد فيها Med Aura أطباء ومراكز تجميل موثقة، واختر وجهتك المناسبة لرحلتك التجميلية.",
}

export default async function DestinationsPage() {
  const res = await query(() => listDestinations())
  const destinations = res.status === "ok" ? res.data : []

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <PageHero
          eyebrow="الوجهات"
          title="اختر وجهتك التجميلية"
          subtitle="دول بها أطباء ومراكز معتمدة على Med Aura. لكل وجهة إحصائيات لحظية لعدد الأطباء والمراكز واللغات."
        />

        <section className="bg-background">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            {res.status !== "ok" ? (
              <DataState
                status={res.status}
                requestId={res.status === "error" ? res.requestId : undefined}
              />
            ) : destinations.length === 0 ? (
              <EmptyState
                icon={Globe2}
                title="لا توجد وجهات منشورة بعد"
                description="ستظهر الوجهات هنا فور اعتماد أطباء ومراكز فيها."
              />
            ) : (
              <Stagger className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {destinations.map((d) => {
                  const inactive = d.approvedDoctors + d.approvedCenters === 0
                  return (
                    <StaggerItem key={d.code}>
                      <Link
                        href={`/destinations/${d.code.toLowerCase()}`}
                        aria-disabled={inactive}
                        className={inactive ? "pointer-events-none" : ""}
                      >
                        <Card
                          className={
                            "h-full p-6 transition-all duration-300 " +
                            (inactive
                              ? "opacity-60"
                              : "hover:-translate-y-1 hover:border-primary/40 hover:shadow-elegant")
                          }
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                              <MapPin className="size-6" />
                            </span>
                            <span
                              dir="ltr"
                              className="rounded-full bg-muted px-2 py-0.5 font-mono text-[10px] font-medium text-muted-foreground"
                            >
                              {d.code}
                            </span>
                          </div>
                          <h3 className="mt-4 font-heading text-lg font-bold text-foreground">
                            {d.nameAr}
                          </h3>
                          <p dir="ltr" className="text-right text-xs text-muted-foreground">
                            {d.nameEn}
                          </p>
                          <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
                            <Stat
                              icon={Users}
                              value={d.approvedDoctors}
                              label="طبيب"
                            />
                            <Stat
                              icon={Building2}
                              value={d.approvedCenters}
                              label="مركز"
                            />
                            <Stat
                              icon={Globe2}
                              value={d.citiesCount}
                              label="مدينة"
                            />
                          </dl>
                          {d.languagesTop.length > 0 && (
                            <p className="mt-4 flex flex-wrap gap-1 text-xs text-muted-foreground">
                              اللغات:
                              {d.languagesTop.map((l) => (
                                <span
                                  key={l}
                                  className="rounded-full bg-muted px-2 py-0.5 font-medium"
                                >
                                  {l}
                                </span>
                              ))}
                            </p>
                          )}
                          {inactive && (
                            <p className="mt-4 text-xs text-muted-foreground">
                              لا يوجد مقدّم خدمة معتمد بعد
                            </p>
                          )}
                        </Card>
                      </Link>
                    </StaggerItem>
                  )
                })}
              </Stagger>
            )}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}

function Stat({
  icon: Icon,
  value,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>
  value: number
  label: string
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-lg bg-muted/40 p-2">
      <Icon className="size-4 text-primary" />
      <span className="font-heading text-lg font-bold text-foreground">
        {value.toLocaleString("ar-SA")}
      </span>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  )
}
