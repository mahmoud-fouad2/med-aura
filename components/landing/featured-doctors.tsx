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
import { getI18n, localizedPath } from "@/lib/i18n"

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
            eyebrow={isAr ? "ابدئي المقارنة" : "Start comparing"}
            title={t.home.verifiedDoctors}
            subtitle={isAr ? "تعرّفي على الملفات المنشورة بعد مراجعة بياناتها المهنية، ثم قارني الخبرات والخدمات قبل القرار." : "Explore profiles published after professional details are reviewed, then compare experience and services."}
          />
          {results.length > 0 && (
            <Button
              variant="outline"
              className="rounded-xl"
              render={
                <Link href={localizedPath("/search", locale)}>
                  {isAr ? "استكشفي جميع الأطباء" : "View all doctors"}
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
              locale={locale}
            />
          </div>
        ) : results.length === 0 ? (
          <div className="mt-12">
            <EmptyState
              icon={Stethoscope}
              title={isAr ? "لم تُنشر ملفات أطباء بعد" : "No doctor profiles are published yet"}
              description={isAr ? "ننشر الملفات بعد مراجعة بياناتها المهنية. يمكن للأطباء والمراكز تقديم طلب الانضمام الآن." : "Profiles are published after their professional details are reviewed. Providers can apply now."}
              action={
                <Button render={<Link href={localizedPath("/for-doctors", locale)}>{isAr ? "قدّم طلب الانضمام" : "Apply to join"}</Link>} />
              }
            />
          </div>
        ) : (
          <Stagger className="mt-10 grid gap-6 lg:grid-cols-2 2xl:grid-cols-3">
            {results.map((d) => (
              <StaggerItem key={d.id}>
                <DoctorCard doctor={d} variant="featured" locale={locale} />
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </div>
    </section>
  )
}
