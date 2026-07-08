import Link from "next/link"
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

export async function PopularProcedures() {
  const res = await query(() =>
    db
      .select({
        slug: procedureT.slug,
        nameAr: procedureT.nameAr,
        isSurgical: procedureT.isSurgical,
        recoveryDays: procedureT.recoveryDays,
        categoryNameAr: procedureCategory.nameAr,
        categoryIcon: procedureCategory.icon,
      })
      .from(procedureT)
      .innerJoin(procedureCategory, eq(procedureT.categoryId, procedureCategory.id))
      .where(eq(procedureT.visible, true))
      .orderBy(asc(procedureT.sortOrder))
      .limit(8),
  )
  const rows = res.status === "ok" ? res.data : []

  return (
    <section className="border-b border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="الإجراءات"
          title="الإجراءات الأكثر طلبًا"
          subtitle="إجراءات تجميل جراحية وغير جراحية، يقدّمها أطباء ومراكز معتمدون."
        />

        {res.status !== "ok" ? (
          <div className="mt-12">
            <DataState
              status={res.status}
              requestId={res.status === "error" ? res.requestId : undefined}
            />
          </div>
        ) : rows.length === 0 ? (
          <div className="mt-12">
            <EmptyState
              icon={Sparkles}
              title="سيتم عرض الإجراءات هنا قريبًا"
              description="تُدار قائمة الإجراءات من لوحة الإدارة وتظهر فور إضافتها."
            />
          </div>
        ) : (
          <Stagger className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {rows.map((p) => (
              <StaggerItem key={p.slug}>
                <Link
                  href={`/search?procedure=${p.slug}`}
                  className="group flex h-full flex-col gap-3 rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-elegant"
                >
                  <div className="flex items-center justify-between">
                    <CategoryIconBadge icon={p.categoryIcon} className="size-10" iconClassName="size-5" />
                    <ArrowLeft className="size-4 text-muted-foreground transition-transform duration-300 rtl:rotate-0 ltr:rotate-180 rtl:group-hover:-translate-x-1 ltr:group-hover:translate-x-1 group-hover:text-primary" />
                  </div>
                  <h3 className="font-heading text-lg font-bold text-foreground">
                    {p.nameAr}
                  </h3>
                  <Badge variant={p.isSurgical ? "secondary" : "outline"} className="w-fit">
                    <Syringe className="size-3" />
                    {p.isSurgical ? "جراحي" : "غير جراحي"}
                  </Badge>
                  <p className="mt-auto text-sm text-muted-foreground">
                    {p.categoryNameAr}
                    {p.recoveryDays != null && p.recoveryDays > 0
                      ? ` · تعافٍ تقديري ${p.recoveryDays} يوم`
                      : ""}
                  </p>
                </Link>
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </div>
    </section>
  )
}
