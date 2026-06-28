import { notFound } from "next/navigation"
import { requireAuthPage } from "@/lib/session"
import { getPublicDoctorBySlug } from "@/lib/data/doctors"
import { getAvailableSlots } from "@/lib/data/availability"
import { isStripeConfigured } from "@/lib/env"
import { SiteHeader } from "@/components/layout/site-header"
import { Card } from "@/components/ui/card"
import { BookingClient } from "@/components/booking/booking-client"

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

  await requireAuthPage(`/doctors/${slug}/book${caseId ? `?case=${caseId}` : ""}`)

  const doctor = await getPublicDoctorBySlug(slug)
  if (!doctor) notFound()

  const slots = await getAvailableSlots(doctor.id, {
    type: "VIDEO_CONSULTATION",
  })

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1 bg-muted/20">
        <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
          <h1 className="font-heading text-2xl font-bold text-foreground">
            حجز استشارة مع {doctor.name}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {doctor.consultationFee
              ? `سعر الاستشارة ${Number(doctor.consultationFee).toLocaleString("ar-SA")} ${doctor.currency}`
              : "سعر الاستشارة غير محدد"}
          </p>

          <div className="mt-6">
            {!doctor.consultationFee ? (
              <Card className="p-6 text-muted-foreground">
                هذا الطبيب لم يحدّد سعر استشارة بعد، لذا لا يمكن الحجز حاليًا.
              </Card>
            ) : slots.length === 0 ? (
              <Card className="p-6 text-muted-foreground">
                لا توجد مواعيد متاحة حاليًا. يرجى المحاولة لاحقًا.
              </Card>
            ) : (
              <BookingClient
                doctorId={doctor.id}
                slots={slots}
                caseId={caseId}
                paymentsConfigured={isStripeConfigured()}
                feeLabel={`${Number(doctor.consultationFee).toLocaleString("ar-SA")} ${doctor.currency}`}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
