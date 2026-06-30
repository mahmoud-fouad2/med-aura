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

export async function FeaturedDoctors() {
  const res = await query(() => searchDoctors({ pageSize: 3 }))
  const results = res.status === "ok" ? res.data.results : []

  return (
    <section className="border-b border-border bg-secondary/30">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading
            align="start"
            eyebrow="نخبة موثّقة"
            title="الأطباء الموثقون"
            subtitle="يظهر هنا الأطباء المعتمدون فقط، بعد التحقق من تراخيصهم."
          />
          {results.length > 0 && (
            <Button
              variant="outline"
              render={
                <Link href="/search">
                  عرض جميع الأطباء
                  <ArrowLeft className="size-4" />
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
              title="نرحّب بأطباء التجميل المعتمدين"
              description="لا يظهر أي طبيب قبل التحقق من ترخيصه. هل أنت طبيب؟ انضم إلى المنصة."
              action={
                <Button render={<Link href="/for-doctors">انضم كطبيب</Link>} />
              }
            />
          </div>
        ) : (
          <Stagger className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((d) => (
              <StaggerItem key={d.id}>
                <DoctorCard doctor={d} />
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </div>
    </section>
  )
}
