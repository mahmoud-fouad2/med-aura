import { Sparkles } from "lucide-react"
import { requirePermissionPage } from "@/lib/session"
import { PERMISSIONS } from "@/lib/rbac"
import { listCategoriesForAdmin, listProceduresForAdmin } from "@/lib/data/admin-content"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { StatusBadge } from "@/components/admin/status-badge"
import {
  CategoryFormButton,
  ProcedureFormButton,
  ToggleVisibleButton,
  CatalogDeleteButton,
} from "@/components/admin/catalog-forms"

export const dynamic = "force-dynamic"
export const metadata = { title: "المحتوى والإجراءات" }

export default async function AdminProceduresPage() {
  await requirePermissionPage(PERMISSIONS.CATALOG_MANAGE)

  const [categories, procedures] = await Promise.all([
    listCategoriesForAdmin(),
    listProceduresForAdmin(),
  ])
  const categoryOptions = categories.map((c) => ({ id: c.id, nameAr: c.nameAr }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">المحتوى والإجراءات</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {categories.length.toLocaleString("ar-SA-u-nu-latn")} قسم،{" "}
          {procedures.length.toLocaleString("ar-SA-u-nu-latn")} إجراء
        </p>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="font-heading text-sm font-bold text-foreground">الأقسام</h2>
          <CategoryFormButton />
        </div>
        {categories.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="لا توجد أقسام مضافة"
            description="ابدأ بإضافة قسم جديد من الأعلى."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground">
                  <Th>القسم</Th>
                  <Th>الحالة</Th>
                  <Th>ترتيب</Th>
                  <Th>عدد الإجراءات</Th>
                  <Th>—</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {categories.map((c) => (
                  <tr key={c.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{c.nameAr}</div>
                      <div dir="ltr" className="text-xs text-muted-foreground">
                        /{c.slug}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        tone={c.visible ? "success" : "neutral"}
                        label={c.visible ? "ظاهر" : "مخفي"}
                      />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{c.sortOrder}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {c.procedureCount.toLocaleString("ar-SA-u-nu-latn")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <CategoryFormButton existing={c} />
                        <ToggleVisibleButton kind="category" id={c.id} visible={c.visible} />
                        <CatalogDeleteButton kind="category" id={c.id} name={c.nameAr} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="font-heading text-sm font-bold text-foreground">الإجراءات</h2>
          <ProcedureFormButton categories={categoryOptions} />
        </div>
        {procedures.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="لا توجد إجراءات مضافة"
            description="ابدأ بإضافة إجراء جديد من الأعلى."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground">
                  <Th>الإجراء</Th>
                  <Th>القسم</Th>
                  <Th>النوع</Th>
                  <Th>الحالة</Th>
                  <Th>النقاهة</Th>
                  <Th>—</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {procedures.map((p) => (
                  <tr key={p.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{p.nameAr}</div>
                      <div dir="ltr" className="text-xs text-muted-foreground">
                        /{p.slug}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{p.categoryNameAr}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {p.isSurgical ? "جراحي" : "غير جراحي"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        tone={p.visible ? "success" : "neutral"}
                        label={p.visible ? "ظاهر" : "مخفي"}
                      />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {p.recoveryDays != null
                        ? `${p.recoveryDays.toLocaleString("ar-SA-u-nu-latn")} يوم`
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <ProcedureFormButton existing={p} categories={categoryOptions} />
                        <ToggleVisibleButton kind="procedure" id={p.id} visible={p.visible} />
                        <CatalogDeleteButton kind="procedure" id={p.id} name={p.nameAr} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-2.5 text-start font-medium">{children}</th>
}
