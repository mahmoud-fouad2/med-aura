import Image from "next/image"
import Link from "next/link"
import { BookOpen, Star, Globe2, Eye, EyeOff, Plus, FileText } from "lucide-react"
import { requirePermissionPage } from "@/lib/session"
import { PERMISSIONS } from "@/lib/rbac"
import { listArticlesForAdmin } from "@/lib/data/articles"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Badge } from "@/components/ui/badge"
import { ArticleFormButton, ArticleRowActionsMenu } from "@/components/admin/article-forms"

export const dynamic = "force-dynamic"
export const metadata = { title: "إدارة المقالات والمدونة" }

export default async function AdminArticlesPage() {
  await requirePermissionPage(PERMISSIONS.CATALOG_MANAGE)

  const articles = await listArticlesForAdmin()

  const publishedCount = articles.filter((a) => a.published).length
  const featuredCount = articles.filter((a) => a.featured).length
  const geoTargetedCount = articles.filter((a) => Boolean(a.countryCode)).length

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">
            إدارة المقالات والمدونة (SEO CMS)
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            أنشئ مقالات توعوية وجغرافية لتعزيز أرشفة المنصة في محركات البحث وجذب المرضى الدوليين.
          </p>
        </div>
        <ArticleFormButton />
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="p-4 flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
            <BookOpen className="size-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">إجمالي المقالات</p>
            <p className="font-heading text-xl font-bold">{articles.length}</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <div className="rounded-lg bg-emerald-500/10 p-2.5 text-emerald-500">
            <Eye className="size-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">المقالات المنشورة</p>
            <p className="font-heading text-xl font-bold">{publishedCount}</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <div className="rounded-lg bg-amber-500/10 p-2.5 text-amber-500">
            <Star className="size-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">المقالات المميزة</p>
            <p className="font-heading text-xl font-bold">{featuredCount}</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <div className="rounded-lg bg-sky-500/10 p-2.5 text-sky-500">
            <Globe2 className="size-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">استهداف جغرافي (Geo)</p>
            <p className="font-heading text-xl font-bold">{geoTargetedCount}</p>
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="font-heading text-sm font-bold text-foreground">قائمة المقالات</h2>
          <span className="text-xs text-muted-foreground">{articles.length} مقال مسجل</span>
        </div>

        {articles.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="لا توجد مقالات مضافة حتى الآن"
            description="ابدأ بإنشاء أول مقال توعوي أو دليل جغرافي من الزر أعلاه."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground">
                <tr>
                  <th className="p-3 text-start">المقال</th>
                  <th className="p-3 text-start">الدولة / الوجهة</th>
                  <th className="p-3 text-start">التصنيف</th>
                  <th className="p-3 text-start">وقت القراءة</th>
                  <th className="p-3 text-start">الحالة</th>
                  <th className="p-3 text-start">المميز</th>
                  <th className="p-3 text-end">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {articles.map((art) => (
                  <tr key={art.id} className="hover:bg-muted/20 transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="relative size-12 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
                          <Image
                            src={art.coverImage}
                            alt={art.titleAr}
                            fill
                            className="object-cover"
                            sizes="48px"
                          />
                        </div>
                        <div className="min-w-0 max-w-sm">
                          <p className="font-medium text-foreground truncate">{art.titleAr}</p>
                          <p className="text-xs text-muted-foreground truncate" dir="ltr">
                            {art.slug}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      {art.countryCode ? (
                        <Badge variant="outline" className="font-mono font-bold">
                          {art.countryCode}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">عام</span>
                      )}
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {art.category === "seo_geo" ? "دليل جغرافي" : art.category}
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {art.readTimeMinutes} دقيقة
                    </td>
                    <td className="p-3">
                      {art.published ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                          منشور
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                          مسودة
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      {art.featured ? (
                        <Star className="size-4 fill-amber-500 text-amber-500" />
                      ) : (
                        <span className="text-muted-foreground/30 text-xs">—</span>
                      )}
                    </td>
                    <td className="p-3 text-end">
                      <ArticleRowActionsMenu article={art} />
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
