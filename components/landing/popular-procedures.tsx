import Link from "next/link"
import Image from "next/image"
import { eq, asc } from "drizzle-orm"
import { ArrowLeft, Sparkles, Syringe } from "lucide-react"
import { db } from "@/lib/db"
import { query } from "@/lib/db/query"
import { procedure as procedureT, procedureCategory } from "@/lib/db/schema"
import { SectionHeading } from "@/components/ui/section-heading"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/empty-state"
import { DataState } from "@/components/ui/data-state"
import { Stagger, StaggerItem } from "@/components/motion"
import { CategoryIconBadge } from "@/components/marketing/category-icon"
import { getPublicUrl } from "@/lib/storage/r2"
import { serviceImageForProcedure } from "@/lib/seo"
import { localizedPath, type Locale } from "@/lib/i18n"
import { formatRecoveryDays } from "@/lib/format"

export async function PopularProcedures({ locale }: { locale: Locale }) {
  const isAr = locale === "ar"
  const res = await query(() =>
    db
      .select({
        slug: procedureT.slug,
        nameAr: procedureT.nameAr,
        nameEn: procedureT.nameEn,
        isSurgical: procedureT.isSurgical,
        recoveryDays: procedureT.recoveryDays,
        categoryNameAr: procedureCategory.nameAr,
        categoryNameEn: procedureCategory.nameEn,
        categoryIcon: procedureCategory.icon,
        categorySlug: procedureCategory.slug,
        imageKey: procedureT.imageKey,
      })
      .from(procedureT)
      .innerJoin(procedureCategory, eq(procedureT.categoryId, procedureCategory.id))
      .where(eq(procedureT.visible, true))
      .orderBy(asc(procedureT.sortOrder))
      .limit(8),
  )
  const rows = res.status === "ok" ? res.data : []

  return (
    <section className="border-b border-border bg-section-soft">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow={isAr ? "الإجراءات الأكثر طلباً" : "Popular choices"}
          title={isAr ? "خيارات علاجية متقدمة تناسب تطلعاتكِ" : "Start with your needs"}
          subtitle={isAr ? "استكشفي أحدث الإجراءات الجراحية وغير الجراحية وقارني بين الأطباء المتخصصين قبل اتخاذ القرار." : "Explore popular options, then compare doctors before booking."}
        />

        {res.status !== "ok" ? (
          <div className="mt-12">
            <DataState
              status={res.status}
              requestId={res.status === "error" ? res.requestId : undefined}
              locale={locale}
            />
          </div>
        ) : rows.length === 0 ? (
          <div className="mt-12">
            <EmptyState
              icon={Sparkles}
              title={isAr ? "ستظهر الإجراءات هنا قريبًا" : "Procedures will appear here soon"}
              description={isAr ? "نعمل على تجهيز معلومات واضحة تساعدك على المقارنة." : "We are preparing clear information to make comparison easier."}
            />
          </div>
        ) : (
          <Stagger className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {rows.map((p) => (
              <StaggerItem key={p.slug}>
                <Link
                  href={localizedPath(`/search?procedure=${p.slug}`, locale)}
                  className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-elegant"
                >
                  <div className="relative h-36 overflow-hidden bg-muted">
                    <Image
                      src={
                        (p.imageKey ? getPublicUrl(p.imageKey) : null) ??
                        serviceImageForProcedure(p.slug, p.categorySlug)
                      }
                      alt=""
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                    <CategoryIconBadge icon={p.categoryIcon} className="absolute bottom-3 right-3 size-10 bg-card/92 ring-1 ring-border/80 border border-primary/20 shadow-elegant transition-transform duration-300 group-hover:scale-105" iconClassName="size-5" />
                    <ArrowLeft className="absolute bottom-5 left-4 size-4 text-white transition-transform duration-300 ltr:rotate-180 rtl:group-hover:-translate-x-1 ltr:group-hover:translate-x-1" />
                  </div>
                  <div className="flex flex-1 flex-col gap-3.5 p-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary/70">
                      {isAr ? p.categoryNameAr : p.categoryNameEn}
                    </p>
                    <h3 className="font-heading text-lg font-bold text-foreground">
                      {isAr ? p.nameAr : p.nameEn}
                    </h3>
                    <Badge variant={p.isSurgical ? "secondary" : "outline"} className="w-fit font-medium">
                      <Syringe className="size-3" />
                      {p.isSurgical
                        ? (isAr ? "جراحي" : "Surgical")
                        : (isAr ? "غير جراحي" : "Non-surgical")}
                    </Badge>
                    <p className="mt-auto border-t border-border/40 pt-3 text-xs font-medium text-muted-foreground">
                      {formatRecoveryDays(p.recoveryDays, locale)}
                    </p>
                  </div>
                </Link>
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </div>
    </section>
  )
}
