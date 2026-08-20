import Link from "next/link"
import Image from "next/image"
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
import {
  SITE_NAME,
  absoluteUrl,
  breadcrumbJsonLd,
  buildPageMetadata,
  jsonLdScript,
  serviceImageForProcedure,
} from "@/lib/seo"

import { getI18n } from "@/lib/i18n"
import { formatRecoveryDays } from "@/lib/format"

export const dynamic = "force-dynamic"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const { t, locale } = await getI18n()
  const r = await query(() => getProcedureBySlug(slug))
  const p = r.status === "ok" ? r.data : null
  if (!p) return { title: t.common.none }
  return buildPageMetadata({
    title: `${locale === "ar" ? p.nameAr : p.nameEn} — ${locale === "ar" ? p.categoryNameAr : p.categoryNameEn}`,
    description:
      (locale === "ar" ? p.descriptionAr : p.descriptionEn) ??
      (locale === "ar"
        ? `تعرّف على ${p.nameAr} وقارن بين الأطباء المناسبين قبل حجز الاستشارة.`
        : `Learn about ${p.nameEn} and compare suitable doctors before booking.`),
    path: `/procedures/${p.slug}`,
    image: serviceImageForProcedure(p.slug, p.categorySlug),
    locale: locale === "en" ? "en" : "ar",
    type: "article",
  })
}

export default async function ProcedureDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const [{ slug }, { t, locale }] = await Promise.all([
    params,
    getI18n()
  ])
  const isAr = locale === "ar"
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

  const doctorsRes = await query(() => searchDoctors({ procedure: slug, pageSize: 6, locale }))
  const results = doctorsRes.status === "ok" ? doctorsRes.data.results : []
  const procedureImage =
    procedure.imageUrl ?? serviceImageForProcedure(procedure.slug, procedure.categorySlug)

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "MedicalProcedure",
    name: isAr ? procedure.nameAr : procedure.nameEn,
    alternateName: procedure.nameEn,
    category: procedure.categoryNameAr,
    description: (isAr ? procedure.descriptionAr : procedure.descriptionEn) ?? undefined,
    image: procedure.imageUrl ?? absoluteUrl(procedureImage),
    url: absoluteUrl(`/procedures/${procedure.slug}`),
    provider: {
      "@type": "Organization",
      name: SITE_NAME,
      url: absoluteUrl("/"),
    },
    potentialAction: {
      "@type": "SearchAction",
      target: `${absoluteUrl("/search")}?procedure=${procedure.slug}`,
    },
  }
  const breadcrumb = breadcrumbJsonLd([
    { name: isAr ? "الرئيسية" : "Home", url: absoluteUrl("/") },
    { name: isAr ? "إجراءات التجميل" : "Aesthetic procedures", url: absoluteUrl("/procedures") },
    { name: isAr ? procedure.nameAr : procedure.nameEn, url: absoluteUrl(`/procedures/${procedure.slug}`) },
  ])

  return (
    <div className="flex min-h-svh flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript([jsonLd, breadcrumb]) }}
      />
      <SiteHeader />
      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-border bg-background">
          <div className="absolute inset-0">
            <Image
              src={procedureImage}
              alt={isAr ? procedure.nameAr : procedure.nameEn}
              fill
              priority
              className="object-cover object-center"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-l from-background via-background/94 to-background/70" />
          </div>
          <div className="relative mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8">
            <nav className="mb-4 flex items-center gap-1 text-sm text-muted-foreground">
              <Link href="/procedures" className="hover:text-primary">
                {t.nav.procedures}
              </Link>
              <ChevronLeft className="size-4 rtl:rotate-0 ltr:rotate-180" />
              <span className="text-foreground">{isAr ? procedure.nameAr : procedure.nameEn}</span>
            </nav>
            <Reveal>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                  {isAr ? procedure.nameAr : procedure.nameEn}
                </h1>
                <Badge variant={procedure.isSurgical ? "secondary" : "outline"}>
                  <Syringe className="size-3" />
                  {procedure.isSurgical ? (isAr ? "جراحي" : "Surgical") : (isAr ? "غير جراحي" : "Non-surgical")}
                </Badge>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span>{isAr ? `التصنيف: ${procedure.categoryNameAr}` : `Category: ${procedure.categoryNameEn}`}</span>
                {procedure.recoveryDays != null && procedure.recoveryDays > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="size-4" />
                    {formatRecoveryDays(procedure.recoveryDays, locale)}
                  </span>
                )}
              </div>
              {procedure.descriptionAr && (
                <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted-foreground">
                  {isAr ? procedure.descriptionAr : procedure.descriptionEn || procedure.descriptionAr}
                </p>
              )}
              <div className="mt-6">
                <Button
                  size="lg"
                  render={
                    <Link href={`/search?procedure=${procedure.slug}`}>
                      {isAr ? "ابحث عن طبيب لهذا الإجراء" : "Find a Doctor for This Procedure"}
                    </Link>
                  }
                />
              </div>
              {procedure.gallery.length > 0 && (
                <div className="mt-8 flex gap-3 overflow-x-auto pb-1">
                  {procedure.gallery.map((url) => (
                    <div key={url} className="relative h-24 w-32 shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
                      <Image src={url} alt="" fill className="object-cover" sizes="128px" />
                    </div>
                  ))}
                </div>
              )}
            </Reveal>
          </div>
        </section>

        <section className="border-b border-border bg-background">
          <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
            <h2 className="font-heading text-2xl font-bold text-foreground">
              {isAr ? "نقاط تناقشها في الاستشارة" : "What to discuss in your consultation"}
            </h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                isAr ? "مدى ملاءمة الإجراء لهدفك وحالتك الصحية" : "Whether the procedure fits your goals and health history",
                isAr ? "النتيجة المتوقعة وحدود ما يمكن تحقيقه" : "Expected outcomes and realistic limitations",
                isAr ? "فترة التعافي والتعليمات الخاصة بك" : "Your recovery timeline and aftercare instructions",
                isAr ? "التكلفة الكاملة وما تتضمنه الخطة" : "The complete cost and what the plan includes",
              ].map((point) => (
                <div key={point} className="rounded-lg border border-border/70 bg-card p-4 text-sm leading-6 text-muted-foreground">
                  {point}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-section-soft">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <h2 className="mb-8 font-heading text-2xl font-bold text-foreground">
              {isAr ? "أطباء يقدّمون هذا الإجراء" : "Accredited Doctors Performing This Procedure"}
            </h2>
            {doctorsRes.status !== "ok" ? (
              <DataState
                status={doctorsRes.status}
                requestId={doctorsRes.status === "error" ? doctorsRes.requestId : undefined}
              />
            ) : results.length === 0 ? (
              <EmptyState
                icon={Stethoscope}
                title={isAr ? "لا يوجد أطباء معتمدون لهذا الإجراء بعد" : "No accredited doctors for this procedure yet"}
                description={isAr ? "نضيف الأطباء بعد التحقق من تراخيصهم. تحقّق لاحقًا أو تصفّح إجراءات أخرى." : "Doctors are listed after strict license checks. Check back soon or browse other procedures."}
                action={<Button render={<Link href="/procedures">{isAr ? "كل الإجراءات" : "All Procedures"}</Link>} />}
              />
            ) : (
              <Stagger className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {results.map((d) => (
                  <StaggerItem key={d.id}>
                    <DoctorCard doctor={d} locale={locale} />
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
