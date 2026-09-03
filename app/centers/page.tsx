import Link from "next/link"
import Image from "next/image"
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
import { countryNameAr, countryNameEn } from "@/lib/status-labels"
import { absoluteUrl, breadcrumbJsonLd, buildPageMetadata, itemListJsonLd, jsonLdScript, localizedUrl } from "@/lib/seo"
import { PUBLIC_MEDIA } from "@/lib/public-media"
import { formatDoctorCount } from "@/lib/format"
import { getI18n, localizedPath } from "@/lib/i18n"
import { SeoEditorialBand } from "@/components/marketing/seo-editorial-band"

export const dynamic = "force-dynamic"

export async function generateMetadata() {
  const { locale } = await getI18n()
  return buildPageMetadata({
    title: locale === "ar" ? "مراكز وعيادات التجميل" : "Aesthetic clinics and centers",
    description: locale === "ar"
      ? "قارن مراكز وعيادات التجميل حسب الموقع والأطباء والخدمات واللغات والتقييمات المنشورة قبل طلب الاستشارة."
      : "Compare aesthetic clinics and centers by location, doctors, services, languages, and published reviews before requesting a consultation.",
    path: "/centers",
    image: PUBLIC_MEDIA.centers,
    locale,
    keywords: locale === "ar" ? ["مراكز تجميل", "عيادات تجميل", "مركز تجميل معتمد", "مستشفى تجميل"] : ["aesthetic clinics", "cosmetic centers", "verified aesthetic clinic", "plastic surgery center"],
  })
}

export default async function CentersPage() {
  const [user, { locale }] = await Promise.all([getCurrentUser(), getI18n()])
  const isAr = locale === "ar"
  const l = (ar: string, en: string) => (isAr ? ar : en)
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
  const doctorsTotal = centers.reduce((sum, c) => sum + c.doctorCount, 0)
  const structuredData = [
    breadcrumbJsonLd([
      { name: l("الرئيسية", "Home"), url: localizedUrl("/", locale) },
      { name: l("المراكز", "Centers"), url: localizedUrl("/centers", locale) },
    ]),
    itemListJsonLd({
      name: l("مراكز التجميل على Med Aura", "Aesthetic centers on Med Aura"),
      items: centers.map((c) => ({
        name: c.name,
        url: localizedUrl(`/centers/${c.slug}`, locale),
        image: absoluteUrl(c.coverUrl ?? PUBLIC_MEDIA.centers),
      })),
    }),
  ]

  return (
    <div className="flex min-h-svh flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(structuredData) }}
      />
      <SiteHeader />
      <main className="flex-1">
        <PageHero
          eyebrow={l("المراكز", "Centers")}
          title={l("مراكز مختارة لرحلة أكثر اطمئنانًا", "Compare carefully selected centers")}
          subtitle={l("تعرّف على المراكز التي تجمع بين أطباء معتمدين وبيئة عناية واضحة.", "Explore centers with licensed doctors, clear profiles, and suitable care options.")}
          imageSrc={PUBLIC_MEDIA.centers}
          imageAlt={l("استقبال مركز تجميل حديث", "Modern aesthetic center reception")}
          stats={[
            { label: l("مراكز", "Centers"), value: centers.length.toLocaleString(isAr ? "ar-SA-u-nu-latn" : "en-US") },
            { label: l("أطباء", "Doctors"), value: doctorsTotal.toLocaleString(isAr ? "ar-SA-u-nu-latn" : "en-US") },
            { label: l("الحجز", "Booking"), value: l("مباشر", "Direct") },
          ]}
        />

        <section className="bg-section-soft">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            {res.status !== "ok" ? (
              <DataState
                status={res.status}
                requestId={
                  res.status === "error" ? res.requestId : undefined
                }
                locale={locale}
              />
            ) : centers.length === 0 ? (
              <Card className="p-12">
                <EmptyState
                  icon={Building2}
                  title={l("لا توجد مراكز منشورة بعد", "No centers are published yet")}
                  description={l("ستظهر المراكز هنا بعد التحقق من تراخيصها.", "Centers will appear here after their licenses are reviewed.")}
                  action={
                    <div className="flex flex-wrap justify-center gap-2">
                      <Button render={<Link href={localizedPath("/online-consultation", locale)}>{l("اطلب مساعدة في الاختيار", "Get help choosing")}</Link>} />
                      <Button variant="outline" render={<Link href={localizedPath("/for-centers/apply", locale)}>{l("سجّل مركزك", "Register your center")}<ChevronLeft className="size-4 rtl:rotate-0 ltr:rotate-180" /></Link>} />
                    </div>
                  }
                />
              </Card>
            ) : (
              <Stagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {centers.map((c) => (
                  <StaggerItem key={c.id}>
                    <Card className="group relative flex h-full flex-col overflow-hidden p-0 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_2px_4px_rgba(20,20,60,0.05),0_12px_28px_-12px_rgba(20,20,60,0.16)]">
                      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent" />

                      <div className="absolute end-3 top-3 z-10">
                        <FavoriteToggle
                          kind="center"
                          refId={c.id}
                          initialFavorited={favs.center.has(c.id)}
                          isSignedIn={Boolean(user)}
                          size={32}
                        />
                      </div>

                      <div className="relative flex h-36 items-end overflow-hidden bg-muted px-5 pb-3 pt-5">
                        <Image
                          src={c.coverUrl ?? PUBLIC_MEDIA.centers}
                          alt={l(`واجهة ${c.name}`, `${c.name} center`)}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent" />
                        <span className="relative flex size-14 items-center justify-center rounded-2xl bg-white/92 text-primary ring-1 ring-white/50 shadow-elegant backdrop-blur">
                          <Building2 className="size-6" />
                        </span>
                      </div>

                      <div className="flex flex-1 flex-col p-5">
                        <div className="flex items-start gap-2">
                          <Link
                            href={localizedPath(`/centers/${c.slug}`, locale)}
                            className="font-heading font-bold leading-tight text-foreground transition-colors hover:text-primary"
                          >
                            {c.name}
                          </Link>
                          {c.verified && (
                            <BadgeCheck
                              className="mt-0.5 size-4 shrink-0 text-primary"
                              aria-label={l("مركز موثّق", "Verified center")}
                            />
                          )}
                        </div>
                        <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="size-3" />
                          {[c.city, isAr ? countryNameAr(c.country) : countryNameEn(c.country)]
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
                              {formatDoctorCount(c.doctorCount, locale)}
                            </span>
                          </span>
                          {c.reviewCount > 0 && c.rating ? (
                            <span className="inline-flex items-center gap-1 font-medium text-foreground">
                              <Star className="size-3 fill-current text-gold" />
                              <span className="tabular-nums">{c.rating}</span>
                              <span className="text-muted-foreground">
                                ({c.reviewCount})
                              </span>
                            </span>
                          ) : (
                            <span className="text-muted-foreground/60">
                              {l("لا تقييمات بعد", "No reviews yet")}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="border-t border-border/60 bg-muted/20 px-5 py-3">
                        <Link
                          href={localizedPath(`/centers/${c.slug}`, locale)}
                          className="group/link inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                        >
                          {l("استكشف المركز", "View center")}
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
        <SeoEditorialBand
          eyebrow={l("مقارنة عملية", "A practical comparison")}
          title={l("ماذا تراجع قبل اختيار مركز تجميل؟", "What should you review before choosing an aesthetic clinic?")}
          intro={l("اسم المركز أو جمال المكان لا يكفيان. راجع الفريق الطبي ونطاق الخدمات ومكان الإجراء وخطة المتابعة وكيفية التعامل مع الطوارئ.", "A clinic name or polished setting is not enough. Review the medical team, service scope, procedure location, follow-up plan, and emergency arrangements.")}
          items={isAr ? [
            { title: "الفريق والمسؤولية الطبية", body: "تأكد من هوية الطبيب الذي سيقيّم الحالة وينفذ الإجراء ومن يتابعك بعده." },
            { title: "المعلومات المكتوبة", body: "اطلب خطة واضحة تشمل التكلفة وما تتضمنه والمواعيد والتعليمات قبل الدفع." },
            { title: "المتابعة والسلامة", body: "اسأل عن التواصل بعد الإجراء وسياسة المراجعة والتصرف عند ظهور عرض غير متوقع." },
          ] : [
            { title: "Team and clinical responsibility", body: "Confirm who assesses you, who performs the procedure, and who follows up afterward." },
            { title: "Written information", body: "Request a clear plan covering cost, inclusions, timings, and instructions before payment." },
            { title: "Follow-up and safety", body: "Ask about post-procedure contact, review policy, and what happens if an unexpected symptom appears." },
          ]}
        />
      </main>
      <SiteFooter />
    </div>
  )
}
