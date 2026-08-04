import Image from "next/image"
import { Sparkles, ImageOff } from "lucide-react"
import { requirePermissionPage } from "@/lib/session"
import { PERMISSIONS } from "@/lib/rbac"
import { listCategoriesForAdmin, listProceduresForAdmin } from "@/lib/data/admin-content"
import { getPublicUrl, isR2Configured } from "@/lib/storage/r2"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { MobileDataCard } from "@/components/ui/mobile-data-card"
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

  const [categories, proceduresRaw] = await Promise.all([
    listCategoriesForAdmin(),
    listProceduresForAdmin(),
  ])
  const categoryOptions = categories.map((c) => ({ id: c.id, nameAr: c.nameAr }))
  const r2Enabled = isR2Configured()
  const categoriesWithImages = categories.map((c) => ({
    ...c,
    imageUrl: c.imageKey ? getPublicUrl(c.imageKey) : null,
  }))
  const procedures = proceduresRaw.map((p) => ({
    ...p,
    imageUrl: p.imageKey ? getPublicUrl(p.imageKey) : null,
    gallery: p.galleryKeys.map((key) => ({ key, url: getPublicUrl(key) })),
  }))

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
          <CategoryFormButton r2Enabled={r2Enabled} />
        </div>
        {categoriesWithImages.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="لا توجد أقسام مضافة"
            description="ابدأ بإضافة قسم جديد من الأعلى."
          />
        ) : (
          <>
            <div className="space-y-2 p-3 sm:hidden">
              {categoriesWithImages.map((c) => (
                <MobileDataCard
                  key={c.id}
                  title={
                    <span className="flex items-center gap-2">
                      <CatalogThumb url={c.imageUrl} size={32} />
                      {c.nameAr}
                    </span>
                  }
                  subtitle={<span dir="ltr">/{c.slug}</span>}
                  badge={
                    <StatusBadge
                      tone={c.visible ? "success" : "neutral"}
                      label={c.visible ? "ظاهر" : "مخفي"}
                    />
                  }
                  rows={[
                    { label: "ترتيب", value: c.sortOrder },
                    {
                      label: "عدد الإجراءات",
                      value: c.procedureCount.toLocaleString("ar-SA-u-nu-latn"),
                    },
                  ]}
                  actions={
                    <div className="flex items-center gap-1">
                      <CategoryFormButton existing={c} r2Enabled={r2Enabled} />
                      <ToggleVisibleButton kind="category" id={c.id} visible={c.visible} />
                      <CatalogDeleteButton kind="category" id={c.id} name={c.nameAr} />
                    </div>
                  }
                />
              ))}
            </div>
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground">
                    <Th>—</Th>
                    <Th>القسم</Th>
                    <Th>الحالة</Th>
                    <Th>ترتيب</Th>
                    <Th>عدد الإجراءات</Th>
                    <Th>—</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {categoriesWithImages.map((c) => (
                    <tr key={c.id} className="transition-colors hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <CatalogThumb url={c.imageUrl} size={40} />
                      </td>
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
                          <CategoryFormButton existing={c} r2Enabled={r2Enabled} />
                          <ToggleVisibleButton kind="category" id={c.id} visible={c.visible} />
                          <CatalogDeleteButton kind="category" id={c.id} name={c.nameAr} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="font-heading text-sm font-bold text-foreground">الإجراءات</h2>
          <ProcedureFormButton categories={categoryOptions} r2Enabled={r2Enabled} />
        </div>
        {procedures.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="لا توجد إجراءات مضافة"
            description="ابدأ بإضافة إجراء جديد من الأعلى."
          />
        ) : (
          <>
            <div className="space-y-2 p-3 sm:hidden">
              {procedures.map((p) => (
                <MobileDataCard
                  key={p.id}
                  title={
                    <span className="flex items-center gap-2">
                      <CatalogThumb url={p.imageUrl} size={32} />
                      {p.nameAr}
                    </span>
                  }
                  subtitle={<span dir="ltr">/{p.slug}</span>}
                  badge={
                    <StatusBadge
                      tone={p.visible ? "success" : "neutral"}
                      label={p.visible ? "ظاهر" : "مخفي"}
                    />
                  }
                  rows={[
                    { label: "القسم", value: p.categoryNameAr },
                    { label: "النوع", value: p.isSurgical ? "جراحي" : "غير جراحي" },
                    {
                      label: "النقاهة",
                      value:
                        p.recoveryDays != null
                          ? `${p.recoveryDays.toLocaleString("ar-SA-u-nu-latn")} يوم`
                          : "—",
                    },
                  ]}
                  actions={
                    <div className="flex items-center gap-1">
                      <ProcedureFormButton existing={p} categories={categoryOptions} r2Enabled={r2Enabled} />
                      <ToggleVisibleButton kind="procedure" id={p.id} visible={p.visible} />
                      <CatalogDeleteButton kind="procedure" id={p.id} name={p.nameAr} />
                    </div>
                  }
                />
              ))}
            </div>
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground">
                    <Th>—</Th>
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
                        <CatalogThumb url={p.imageUrl} size={40} />
                      </td>
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
                          <ProcedureFormButton existing={p} categories={categoryOptions} r2Enabled={r2Enabled} />
                          <ToggleVisibleButton kind="procedure" id={p.id} visible={p.visible} />
                          <CatalogDeleteButton kind="procedure" id={p.id} name={p.nameAr} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-2.5 text-start font-medium">{children}</th>
}

function CatalogThumb({ url, size }: { url: string | null; size: number }) {
  if (!url) {
    return (
      <div
        style={{ width: size, height: size }}
        className="flex shrink-0 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground"
      >
        <ImageOff className="size-3.5" />
      </div>
    )
  }
  return (
    <Image
      src={url}
      alt=""
      width={size}
      height={size}
      className="shrink-0 rounded-lg border border-border object-cover"
      style={{ width: size, height: size }}
    />
  )
}
