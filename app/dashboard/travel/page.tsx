import Link from "next/link"
import {
  Plane,
  Hotel,
  Car,
  Languages,
  Users,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  MapPin,
} from "lucide-react"
import { requireUser } from "@/lib/session"
import { db, isDbConfigured } from "@/lib/db"
import { travelRequest, travelOffer, aestheticCase } from "@/lib/db/schema"
import { eq, desc } from "drizzle-orm"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { DashboardHero } from "@/components/dashboard/hero-banner"
import { FadeIn, Reveal } from "@/components/motion"
import { countryNameAr } from "@/lib/status-labels"

export const dynamic = "force-dynamic"
export const metadata = {
  title: "خدمات السفر والاستقبال",
  description: "خدمات السياحة العلاجية، الاستقبال من المطار، الإقامة الفندقية والمترجم الطبي.",
}

function statusBadge(status: string) {
  const map: Record<string, { label: string; bg: string; text: string }> = {
    SUBMITTED: { label: "بانتظار مراجعة الفريق", bg: "bg-warning/15", text: "text-warning-foreground" },
    ASSIGNED: { label: "قيد تجهيز العرض", bg: "bg-primary/10", text: "text-primary" },
    OFFER_SENT: { label: "تم إرسال عرض الباقة", bg: "bg-gold/15", text: "text-gold" },
    ACCEPTED: { label: "تم قبول الباقة", bg: "bg-success/10", text: "text-success" },
    DECLINED: { label: "مرفوض", bg: "bg-muted", text: "text-muted-foreground" },
    CANCELLED: { label: "ملغى", bg: "bg-destructive/10", text: "text-destructive" },
    FULFILLED: { label: "مكتمل", bg: "bg-success/15", text: "text-success" },
  }
  const item = map[status] ?? { label: status, bg: "bg-muted", text: "text-foreground" }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${item.bg} ${item.text}`}>
      {item.label}
    </span>
  )
}

export default async function PatientTravelPage() {
  const user = await requireUser()

  let requests: {
    id: string
    caseId: string
    status: string
    destinationCountry: string
    destinationCity: string | null
    arrivalDate: string | null
    departureDate: string | null
    travelers: number
    needsAccommodation: boolean
    needsAirportTransfer: boolean
    needsInterpreter: boolean
    interpreterLanguage: string | null
    createdAt: Date
    offers: {
      id: string
      totalAmount: string | null
      currency: string
      status: string
      hotelName: string | null
      flightNotes: string | null
      transferNotes: string | null
    }[]
  }[] = []

  let cases: { id: string; reference: string }[] = []

  if (isDbConfigured) {
    const rawRequests = await db
      .select()
      .from(travelRequest)
      .where(eq(travelRequest.patientUserId, user.id))
      .orderBy(desc(travelRequest.createdAt))

    const userCases = await db
      .select({ id: aestheticCase.id, reference: aestheticCase.reference })
      .from(aestheticCase)
      .where(eq(aestheticCase.patientUserId, user.id))

    cases = userCases

    const requestIds = rawRequests.map((r) => r.id)
    const offers = requestIds.length > 0
      ? await db.select().from(travelOffer).where(eq(travelOffer.requestId, requestIds[0]))
      : []

    requests = rawRequests.map((r) => ({
      ...r,
      offers: offers.filter((o) => o.requestId === r.id),
    }))
  }

  return (
    <div className="space-y-8">
      <FadeIn>
        <DashboardHero
          eyebrow="خدمات السياحة العلاجية والكونسيرج"
          greeting="باقات السفر والاستقبال الفاخرة"
          subtitle="نرافقكِ خطوة بخطوة في رحلتكِ العلاجية: الاستقبال الخاص من المطار، حجوزات الفنادق القريبة من المراكز، والمرافقة الطبية."
          actions={
            cases.length > 0 ? (
              <Button
                size="lg"
                className="rounded-xl shadow-sm"
                render={
                  <Link href={`/dashboard/cases/${cases[0].id}`}>
                    <Sparkles className="size-4 text-gold" />
                    طلب باقة سفر لحالتي
                  </Link>
                }
              />
            ) : (
              <Button
                size="lg"
                className="rounded-xl shadow-sm"
                render={
                  <Link href="/dashboard/cases/new">
                    <Sparkles className="size-4 text-gold" />
                    إنشاء حالة لطلب السفر
                  </Link>
                }
              />
            )
          }
        />
      </FadeIn>

      <Reveal>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ServiceHighlightCard
            icon={Car}
            title="استقبال خاص من المطار"
            desc="سائق خاص في انتظاركِ لنقلكِ مباشرة إلى مقر الإقامة أو المركز الطبي براحة تامة."
          />
          <ServiceHighlightCard
            icon={Hotel}
            title="إقامة فندقية فاخرة"
            desc="فنادق 4 و 5 نجوم مختارة بعناية قريبة من المستشفى ومجهزة لراحتكِ وفترة تعافيكِ."
          />
          <ServiceHighlightCard
            icon={Languages}
            title="مترجم ومرافق طبي"
            desc="مترجم معتمد يرافقكِ في الاستشارات والعمليات لتسهيل التواصل الطبي بدقة كاملة."
          />
          <ServiceHighlightCard
            icon={Users}
            title="رعاية المرافقين"
            desc="ترتيبات مخصصة لمرافقي المريض تشمل الإقامة والمواصلات والأنشطة السياحية."
          />
        </div>
      </Reveal>

      <section className="space-y-4">
        <h2 className="font-heading text-lg font-bold text-foreground">
          طلبات السفر والاستقبال الخاصة بكِ
        </h2>

        {requests.length === 0 ? (
          <Card className="rounded-2xl border border-border/80 bg-card p-10 shadow-sm text-center">
            <EmptyState
              icon={Plane}
              title="لم تقدمي أي طلب سفر بعد"
              description="عند حجز استشارة أو إجراء تجميلي خارج مدينتكِ أو دولتكِ، يمكنكِ طلب باقة استقبال وسفر متكاملة ليتولى فريق Med Aura تنظيمها بالكامل."
            />
          </Card>
        ) : (
          <div className="space-y-4">
            {requests.map((r) => (
              <Card
                key={r.id}
                className="overflow-hidden rounded-2xl border border-border/80 bg-card p-6 shadow-sm transition-all hover:border-primary/40 hover:shadow-elegant"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Plane className="size-4" />
                      </span>
                      <h3 className="font-heading text-base font-bold text-foreground">
                        رحلة إلى {countryNameAr(r.destinationCountry)} {r.destinationCity ? `· ${r.destinationCity}` : ""}
                      </h3>
                      {statusBadge(r.status)}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {r.arrivalDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="size-3.5" />
                          الوصول: {r.arrivalDate}
                        </span>
                      )}
                      {r.departureDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="size-3.5" />
                          المغادرة: {r.departureDate}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Users className="size-3.5" />
                        المسافرون: {r.travelers}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {r.needsAirportTransfer && (
                      <span className="rounded-lg bg-secondary/50 px-2.5 py-1 text-xs font-medium text-foreground flex items-center gap-1">
                        <Car className="size-3 text-primary" /> استقبال المطار
                      </span>
                    )}
                    {r.needsAccommodation && (
                      <span className="rounded-lg bg-secondary/50 px-2.5 py-1 text-xs font-medium text-foreground flex items-center gap-1">
                        <Hotel className="size-3 text-primary" /> إقامة فندقية
                      </span>
                    )}
                    {r.needsInterpreter && (
                      <span className="rounded-lg bg-secondary/50 px-2.5 py-1 text-xs font-medium text-foreground flex items-center gap-1">
                        <Languages className="size-3 text-primary" /> مترجم طبي
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-5 border-t border-border/70 pt-4 flex items-center justify-between">
                  <Link
                    href={`/dashboard/cases/${r.caseId}`}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    عرض تفاصيل الحالة المرتبطة
                  </Link>
                  <p className="text-[11px] text-muted-foreground">
                    تاريخ الطلب: {r.createdAt.toLocaleDateString("ar-SA-u-nu-latn")}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function ServiceHighlightCard({
  icon: Icon,
  title,
  desc,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  desc: string
}) {
  return (
    <Card className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-card p-5 shadow-sm transition-all duration-300 hover:border-primary/40 hover:shadow-elegant">
      <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="size-5" />
      </span>
      <div>
        <h3 className="font-heading text-sm font-bold text-foreground">{title}</h3>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{desc}</p>
      </div>
    </Card>
  )
}
