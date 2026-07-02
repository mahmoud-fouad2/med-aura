import { Sparkles } from "lucide-react"
import { requirePermissionPage } from "@/lib/session"
import { PERMISSIONS } from "@/lib/rbac"
import { listCategoriesForAdmin, listProceduresForAdmin } from "@/lib/data/admin-content"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { StatusBadge } from "@/components/admin/status-badge"

export const dynamic = "force-dynamic"
export const metadata = { title: "المحتوى والإجراءات" }

export default async function AdminProceduresPage() {
  await requirePermissionPage(PERMISSIONS.CATALOG_MANAGE)

  const [categories, procedures] = await Promise.all([listCategoriesForAdmin(), listProceduresForAdmin()])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">المحتوى والإجراءات</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {categories.length.toLocaleString("ar-SA")} قسم، {procedures.length.toLocaleString("ar-SA")} إجراء
        </p>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-border px-4 py-3">
          <h2 className="font-heading text-sm font-bold text-foreground">الأقسام</h2>
        </div>
        {categories.length === 0 ? (
          <EmptyState icon={Sparkles} title="لا توجد أقسام مضافة" description="أضف الأقسام عبر seed-catalog." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground">
                <Th>القسم</Th>
                <Th>الحالة</Th>
                <Th>عدد الإجراءات</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {categories.map((c) => (
                <tr key={c.id} className="transition-colors hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium text-foreground">{c.nameAr}</td>
                  <td className="px-4 py-3">
                    <StatusBadge tone={c.visible ? "success" : "neutral"} label={c.visible ? "ظاهر" : "مخفي"} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{c.procedureCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-border px-4 py-3">
          <h2 className="font-heading text-sm font-bold text-foreground">الإجراءات</h2>
        </div>
        {procedures.length === 0 ? (
          <EmptyState icon={Sparkles} title="لا توجد إجراءات مضافة" description="أضف الإجراءات عبر seed-catalog." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground">
                <Th>الإجراء</Th>
                <Th>القسم</Th>
                <Th>النوع</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {procedures.map((p) => (
                <tr key={p.id} className="transition-colors hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium text-foreground">{p.nameAr}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.categoryNameAr}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.isSurgical ? "جراحي" : "غير جراحي"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-2.5 text-start font-medium">{children}</th>
}
