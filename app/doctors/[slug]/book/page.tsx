import { notFound } from "next/navigation"
import { Clock } from "lucide-react"
import { requireAuthPage } from "@/lib/session"
import { getPublicDoctorBySlug } from "@/lib/data/doctors"
import { getAvailableSlots } from "@/lib/data/availability"
import { isStripeConfigured } from "@/lib/env"
import { query } from "@/lib/db/query"
import { SiteHeader } from "@/components/layout/site-header"
import { Card } from "@/components/ui/card"
import { DataState } from "@/components/ui/data-state"
import { BookingClient } from "@/components/booking/booking-client"
import { currencyAr } from "@/lib/status-labels"
import { getI18n, localizedPath } from "@/lib/i18n"
import { EventTracker } from "@/components/analytics/event-tracker"

export const dynamic = "force-dynamic"

export default async function BookPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ case?: string }>
}) {
  const { slug } = await params
  const { case: caseId } = await searchParams
  const { locale } = await getI18n()
  const isAr = locale === "ar"

  await requireAuthPage(
    `${localizedPath(`/doctors/${slug}/book`, locale)}${caseId ? `?case=${caseId}` : ""}`,
  )

  const r = await query(() => getPublicDoctorBySlug(slug))
  if (r.status !== "ok") {
    return (
      <div className="flex min-h-svh flex-col">
        <SiteHeader />
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-16">
          <DataState
            status={r.status}
            requestId={r.status === "error" ? r.requestId : undefined}
            locale={locale}
          />
        </main>
      </div>
    )
  }
  const doctor = r.data
  if (!doctor) notFound()

  const slots = await getAvailableSlots(doctor.id, {
    type: "VIDEO_CONSULTATION",
    locale,
  })
  const feeLabel = doctor.consultationFee
    ? `${Number(doctor.consultationFee).toLocaleString(isAr ? "ar-SA-u-nu-latn" : "en-US")} ${isAr ? currencyAr(doctor.currency) : doctor.currency}`
    : null

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1 bg-muted/20">
        <EventTracker
          name="booking_started"
          locale={locale}
          properties={{ doctorId: doctor.id, type: "VIDEO_CONSULTATION" }}
        />
        <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
          <h1 className="font-heading text-2xl font-bold text-foreground">
            {isAr ? `حجز استشارة مع ${doctor.name}` : `Book a consultation with ${doctor.name}`}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {feeLabel
              ? isAr ? `سعر الاستشارة ${feeLabel}` : `Consultation fee: ${feeLabel}`
              : isAr ? "سعر الاستشارة غير محدد" : "Consultation fee is not set"}
          </p>
          
          <div className="mt-4 rounded-xl border border-warning/50 bg-warning/10 p-4 text-sm text-warning-foreground flex items-start gap-3">
            <Clock className="size-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">{isAr ? "توقيت المواعيد" : "Appointment times"}</p>
              <p className="mt-1 opacity-90">
                {isAr
                  ? "تظهر المواعيد بتوقيت عيادة الطبيب. سيظهر وقت جلستك المحلي في تأكيد الحجز والتقويم."
                  : "Availability is shown in the doctor's clinic time zone. Your local session time will appear in the booking confirmation and calendar."}
              </p>
            </div>
          </div>

          <div className="mt-6">
            {!doctor.consultationFee ? (
              <Card className="p-6 text-muted-foreground">
                {isAr
                  ? "هذا الطبيب لم يحدّد سعر استشارة بعد، لذا لا يمكن الحجز حاليًا."
                  : "This doctor has not set a consultation fee, so booking is not available yet."}
              </Card>
            ) : slots.length === 0 ? (
              <Card className="p-6 text-muted-foreground">
                {isAr
                  ? "لا توجد مواعيد متاحة حاليًا. يرجى المحاولة لاحقًا."
                  : "No appointments are currently available. Please try again later."}
              </Card>
            ) : !isStripeConfigured() ? (
              // Booking always requires payment to confirm — bookConsultation()
              // rejects the request outright when Stripe isn't configured, so
              // opening the slot picker just to fail at the end would be
              // misleading. Say so up front instead.
              <Card className="p-6 text-muted-foreground">
                {isAr
                  ? "الحجز عبر الموقع غير متاح مؤقتًا. يرجى التواصل معنا لإتمام الحجز."
                  : "Online booking is temporarily unavailable. Please contact us for assistance."}
              </Card>
            ) : (
              <BookingClient
                doctorId={doctor.id}
                slots={slots}
                caseId={caseId}
                feeLabel={feeLabel!}
                locale={locale}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
