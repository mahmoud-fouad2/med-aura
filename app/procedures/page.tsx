import Link from "next/link"
import { ArrowLeft, Syringe, Sparkles } from "lucide-react"
import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { PageHero } from "@/components/marketing/page-hero"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/empty-state"
import { DataState } from "@/components/ui/data-state"
import { Stagger, StaggerItem } from "@/components/motion"
import { CategoryIconBadge } from "@/components/marketing/category-icon"
import { listProceduresGrouped } from "@/lib/data/procedures"
import { query } from "@/lib/db/query"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "إجراءات التجميل",
  description:
    "تصفّح إجراءات التجميل الجراحية وغير الجراحية على Med Aura، مصنّفة حسب المنطقة، وابدأ رحلتك مع طبيب معتمد.",
}

export default async function ProceduresPage() {
  const res = await query(() => listProceduresGrouped())
  const groups = res.status === "ok" ? res.data : []
  const hasAny = groups.some((g) => g.procedures.length > 0)

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <PageHero
          eyebrow="الإجراءات"
          title="إجراءات التجميل"
          subtitle="استكشف الإجراءات الجراحية وغير الجراحية حسب المنطقة، واختر ما يناسبك مع طبيب معتمد."
        />

        <section className="bg-background">
          <div className="mx-auto max-w-7xl space-y-16 px-4 py-16 sm:px-6 lg:px-8">
            {res.status !== "ok" ? (
              <DataState
                status={res.status}
                requestId={res.status === "error" ? res.requestId : undefined}
              />
            ) : !hasAny ? (
              <EmptyState
                icon={Sparkles}
                title="سيتم عرض الإجراءات قريبًا"
                description="تُدار قائمة الإجراءات من لوحة الإدارة وتظهر فور إضافتها."
              />
            ) : (
              groups
                .filter((g) => g.procedures.length > 0)
                .map((g) => (
                  <div key={g.slug}>
                    <div className="mb-6 flex items-center gap-4">
                      <CategoryIconBadge icon={g.icon} className="size-14" iconClassName="size-7" />
                      <div>
                        <h2 className="font-heading text-2xl font-bold text-foreground">
                          {g.nameAr}
                        </h2>
                        {g.descriptionAr && (
                          <p className="mt-1 text-muted-foreground">{g.descriptionAr}</p>
                        )}
                      </div>
                    </div>
                    <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      {g.procedures.map((p) => (
                        <StaggerItem key={p.slug}>
                          <Link
                            href={`/procedures/${p.slug}`}
                            className="group flex h-full flex-col gap-3 rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-elegant"
                          >
                            <div className="flex items-center justify-between">
                              <CategoryIconBadge icon={g.icon} className="size-10" iconClassName="size-5" />
                              <ArrowLeft className="size-4 text-muted-foreground transition-transform duration-300 rtl:rotate-0 ltr:rotate-180 rtl:group-hover:-translate-x-1 ltr:group-hover:translate-x-1 group-hover:text-primary" />
                            </div>
                            <h3 className="font-heading text-lg font-bold text-foreground">
                              {p.nameAr}
                            </h3>
                            <Badge variant={p.isSurgical ? "secondary" : "outline"} className="w-fit">
                              <Syringe className="size-3" />
                              {p.isSurgical ? "جراحي" : "غير جراحي"}
                            </Badge>
                            {p.recoveryDays != null && p.recoveryDays > 0 && (
                              <p className="mt-auto text-sm text-muted-foreground">
                                تعافٍ تقديري {p.recoveryDays} يوم
                              </p>
                            )}
                          </Link>
                        </StaggerItem>
                      ))}
                    </Stagger>
                  </div>
                ))
            )}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
