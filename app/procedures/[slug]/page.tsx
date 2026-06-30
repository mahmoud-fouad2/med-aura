import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { Clock, Syringe, ChevronLeft, Stethoscope } from "lucide-react"
import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { DataState } from "@/components/ui/data-state"
import { DoctorCard } from "@/components/search/doctor-card"
import { Stagger, StaggerItem, Reveal } from "@/components/motion"
import { getProcedureBySlug } from "@/lib/data/procedures"
import { searchDoctors } from "@/lib/data/doctors"
import { query } from "@/lib/db/query"
import { appUrl } from "@/lib/env"

export const dynamic = "force-dynamic"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const r = await query(() => getProcedureBySlug(slug))
  const p = r.status === "ok" ? r.data : null
  if (!p) return { title: "الإجراء غير موجود" }
  return {
    title: `${p.nameAr} — ${p.categoryNameAr}`,
    description:
      p.descriptionAr ??
      `تعرّف على إجراء ${p.nameAr} واحجز استشارة مع طبيب تجميل معتمد على Med Aura.`,
  }
}

export default async function ProcedureDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const procRes = await query(() => getProcedureBySlug(slug))
  if (procRes.status !== "ok") {
    return (
      <div className="flex min-h-svh flex-col">
        <SiteHeader />
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-16">
          <DataState
            status={procRes.status}
            requestId={procRes.status === "error" ? procRes.requestId : undefined}
          />
        </main>
        <SiteFooter />
      </div>
    )
  }
  const procedure = procRes.data
  if (!procedure) notFound()

  const doctorsRes = await query(() => searchDoctors({ procedure: slug, pageSize: 6 }))
  const results = doctorsRes.status === "ok" ? doctorsRes.data.results : []

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "MedicalProcedure",
    name: procedure.nameAr,
    alternateName: procedure.nameEn,
    category: procedure.categoryNameAr,
    description: procedure.descriptionAr ?? undefined,
    url: `${appUrl()}/procedures/${procedure.slug}`,
  }

  return (
    <div className="flex min-h-svh flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SiteHeader />
      <main className="flex-1">
        {/* header band */}
        <section className="border-b border-border bg-mesh">
          <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8">
            <nav className="mb-4 flex items-center gap-1 text-sm text-muted-foreground">
              <Link href="/procedures" className="hover:text-primary">
                الإجراءات
              </Link>
              <ChevronLeft className="size-4" />
              <span className="text-foreground">{procedure.nameAr}</span>
            </nav>
            <Reveal>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                  {procedure.nameAr}
                </h1>
                <Badge variant={procedure.isSurgical ? "secondary" : "outline"}>
                  <Syringe className="size-3" />
                  {procedure.isSurgical ? "جراحي" : "غير جراحي"}
                </Badge>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span>التصنيف: {procedure.categoryNameAr}</span>
                {procedure.recoveryDays != null && procedure.recoveryDays > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="size-4" />
                    تعافٍ تقديري {procedure.recoveryDays} يوم
                  </span>
                )}
              </div>
              {procedure.descriptionAr && (
                <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted-foreground">
                  {procedure.descriptionAr}
                </p>
              )}
              <div className="mt-6">
                <Button
                  size="lg"
                  render={
                    <Link href={`/search?procedure=${procedure.slug}`}>
                      ابحث عن طبيب لهذا الإجراء
                    </Link>
                  }
                />
              </div>
            </Reveal>
          </div>
        </section>

        {/* doctors */}
        <section className="bg-background">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <h2 className="mb-8 font-heading text-2xl font-bold text-foreground">
              أطباء يقدّمون هذا الإجراء
            </h2>
            {doctorsRes.status !== "ok" ? (
              <DataState
                status={doctorsRes.status}
                requestId={doctorsRes.status === "error" ? doctorsRes.requestId : undefined}
              />
            ) : results.length === 0 ? (
              <EmptyState
                icon={Stethoscope}
                title="لا يوجد أطباء معتمدون لهذا الإجراء بعد"
                description="نضيف الأطباء بعد التحقق من تراخيصهم. تحقّق لاحقًا أو تصفّح إجراءات أخرى."
                action={<Button render={<Link href="/procedures">كل الإجراءات</Link>} />}
              />
            ) : (
              <Stagger className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {results.map((d) => (
                  <StaggerItem key={d.id}>
                    <DoctorCard doctor={d} />
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
