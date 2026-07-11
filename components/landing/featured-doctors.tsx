import Link from "next/link"
import { Stethoscope, ArrowLeft } from "lucide-react"
import { searchDoctors } from "@/lib/data/doctors"
import { query } from "@/lib/db/query"
import { SectionHeading } from "@/components/ui/section-heading"
import { EmptyState } from "@/components/ui/empty-state"
import { DataState } from "@/components/ui/data-state"
import { Button } from "@/components/ui/button"
import { DoctorCard } from "@/components/search/doctor-card"
import { Stagger, StaggerItem } from "@/components/motion"
import { getI18n } from "@/lib/i18n"

export async function FeaturedDoctors() {
  const [res, { locale, t }] = await Promise.all([
    query(() => searchDoctors({ pageSize: 3 })),
    getI18n()
  ])
  const results = res.status === "ok" ? res.data.results : []
  const isAr = locale === "ar"

  return (
    <section className="border-b border-border bg-section-soft">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading
            align="start"
            eyebrow={isAr ? "اختيارات موثوقة" : "Verified Selection"}
            title={t.home.verifiedDoctors}
            subtitle={isAr ? "اختيارك لخبير موثوق هو أول خطوة نحو نتيجة آمنة ومرضية." : "Start with a trusted expert before making your treatment decision."}
          />
          {results.length > 0 && (
            <Button
              variant="outline"
              render={
                <Link href="/search">
                  {isAr ? "عرض جميع الأطباء" : "View all doctors"}
                  <ArrowLeft className="size-4 transition-transform duration-300 rtl:rotate-0 ltr:rotate-180 rtl:group-hover/button:-translate-x-1 ltr:group-hover/button:translate-x-1" />
                </Link>
              }
            />
          )}
        </div>

        {res.status !== "ok" ? (
          <div className="mt-12">
            <DataState
              status={res.status}
              requestId={res.status === "error" ? res.requestId : undefined}
            />
          </div>
        ) : results.length === 0 ? (
          <div className="mt-12">
            <EmptyState
              icon={Stethoscope}
              title={isAr ? "نرحّب بأطباء التجميل المعتمدين" : "Welcome Accredited Aesthetic Doctors"}
              description={isAr ? "لا يظهر أي طبيب قبل التحقق من ترخيصه. هل أنت طبيب؟ انضم إلى المنصة." : "No doctor appears prior to verified licensing. Are you a doctor? Join the platform."}
              action={
                <Button render={<Link href="/for-doctors">{isAr ? "انضم كطبيب" : "Join as a doctor"}</Link>} />
              }
            />
          </div>
        ) : (
          <Stagger className="mt-10 grid gap-6 lg:grid-cols-2 2xl:grid-cols-3">
            {results.map((d) => (
              <StaggerItem key={d.id}>
                <DoctorCard doctor={d} variant="featured" />
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </div>
    </section>
  )
}
