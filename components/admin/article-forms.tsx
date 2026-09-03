"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import {
  Plus,
  Pencil,
  Save,
  X,
  Eye,
  EyeOff,
  Trash2,
  ImagePlus,
  ImageOff,
  Star,
  ExternalLink,
  MoreVertical,
  BookOpen,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Field } from "@/components/ui/field"
import {
  upsertArticleAction,
  toggleArticlePublishedAction,
  toggleArticleFeaturedAction,
  deleteArticleAction,
  type ArticleInput,
} from "@/lib/actions/article"
import type { Article } from "@/lib/data/articles"

const COUNTRY_OPTIONS = [
  { code: "", label: "بدون استهداف جغرافي محدد (عام)" },
  { code: "SA", label: "المملكة العربية السعودية (SA)" },
  { code: "AE", label: "الإمارات العربية المتحدة (AE)" },
  { code: "TR", label: "الجمهورية التركية (TR)" },
  { code: "EG", label: "جمهورية مصر العربية (EG)" },
  { code: "QA", label: "دولة قطر (QA)" },
  { code: "JO", label: "المملكة الأردنية الهاشمية (JO)" },
  { code: "BH", label: "مملكة البحرين (BH)" },
  { code: "OM", label: "سلطنة عُمان (OM)" },
  { code: "LB", label: "الجمهورية اللبنانية (LB)" },
  { code: "KW", label: "دولة الكويت (KW)" },
]

const CATEGORY_OPTIONS = [
  { value: "seo_geo", label: "دليل سياحي وجغرافي (SEO Geo)" },
  { value: "guides", label: "أدلة جراحية وطبية" },
  { value: "recovery", label: "التعافي والرعاية اللاحقة" },
  { value: "lifestyle", label: "الجمال ونمط الحياة" },
]

export function ArticleFormButton({ article }: { article?: Article }) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  const isEdit = Boolean(article)

  const [form, setForm] = useState<ArticleInput>({
    id: article?.id,
    slug: article?.slug ?? "",
    titleAr: article?.titleAr ?? "",
    titleEn: article?.titleEn ?? "",
    excerptAr: article?.excerptAr ?? "",
    excerptEn: article?.excerptEn ?? "",
    contentAr: article?.contentAr ?? "",
    contentEn: article?.contentEn ?? "",
    coverImage: article?.coverImage ?? "/blog/rhinoplasty-turkey-saudi.jpg",
    category: article?.category ?? "seo_geo",
    countryCode: article?.countryCode ?? "",
    tags: article?.tags ?? [],
    authorNameAr: article?.authorNameAr ?? "فريق Med Aura الطبي",
    authorNameEn: article?.authorNameEn ?? "Med Aura Medical Editorial",
    readTimeMinutes: article?.readTimeMinutes ?? 5,
    seoTitleAr: article?.seoTitleAr ?? "",
    seoTitleEn: article?.seoTitleEn ?? "",
    seoDescriptionAr: article?.seoDescriptionAr ?? "",
    seoDescriptionEn: article?.seoDescriptionEn ?? "",
    published: article?.published ?? true,
    featured: article?.featured ?? false,
    sortOrder: article?.sortOrder ?? 0,
  })

  const [tagsInput, setTagsInput] = useState((article?.tags ?? []).join(", "))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const parsedTags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)

      const payload = {
        ...form,
        tags: parsedTags,
        countryCode: form.countryCode ? form.countryCode.toUpperCase() : null,
      }

      const res = await upsertArticleAction(payload)
      if (res.ok) {
        toast.success(isEdit ? "تم تحديث المقال بنجاح" : "تم إنشاء المقال بنجاح")
        setOpen(false)
        router.refresh()
      } else {
        toast.error(res.error || "تعذر حفظ المقال")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          isEdit ? (
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Pencil className="size-4" />
              <span className="sr-only">تعديل</span>
            </Button>
          ) : (
            <Button size="sm" className="gap-1.5">
              <Plus className="size-4" />
              <span>مقال جديد</span>
            </Button>
          )
        }
      />
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="size-5 text-primary" />
            {isEdit ? "تعديل المقال" : "إضافة مقال جديد"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <DialogBody className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="الرابط اللطيف (Slug) بالإنجليزية">
                <Input
                  dir="ltr"
                  placeholder="e.g. rhinoplasty-in-dubai-guide"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  required
                />
              </Field>
              <Field label="رابط صورة الغلاف (مسار في /blog/ أو رابط مباشر)">
                <Input
                  dir="ltr"
                  placeholder="/blog/rhinoplasty-turkey-saudi.jpg"
                  value={form.coverImage}
                  onChange={(e) => setForm({ ...form, coverImage: e.target.value })}
                  required
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="العنوان (بالعربية)">
                <Input
                  placeholder="عنوان المقال الجذاب..."
                  value={form.titleAr}
                  onChange={(e) => setForm({ ...form, titleAr: e.target.value })}
                  required
                />
              </Field>
              <Field label="العنوان (بالإنجليزية)">
                <Input
                  dir="ltr"
                  placeholder="Article English title..."
                  value={form.titleEn}
                  onChange={(e) => setForm({ ...form, titleEn: e.target.value })}
                  required
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="المقتطف الترويجي (بالعربية)">
                <textarea
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  rows={3}
                  placeholder="موجز المقال الذي يظهر في البطاقات ومحركات البحث..."
                  value={form.excerptAr}
                  onChange={(e) => setForm({ ...form, excerptAr: e.target.value })}
                  required
                />
              </Field>
              <Field label="المقتطف الترويجي (بالإنجليزية)">
                <textarea
                  dir="ltr"
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  rows={3}
                  placeholder="Brief excerpt for cards and previews..."
                  value={form.excerptEn}
                  onChange={(e) => setForm({ ...form, excerptEn: e.target.value })}
                  required
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="التصنيف">
                <select
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="الاستهداف الجغرافي (الدولة)">
                <select
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm"
                  value={form.countryCode ?? ""}
                  onChange={(e) => setForm({ ...form, countryCode: e.target.value })}
                >
                  {COUNTRY_OPTIONS.map((co) => (
                    <option key={co.code} value={co.code}>
                      {co.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="وقت القراءة المقدر (بالدقائق)">
                <Input
                  type="number"
                  min={1}
                  max={60}
                  value={form.readTimeMinutes}
                  onChange={(e) => setForm({ ...form, readTimeMinutes: Number(e.target.value) })}
                  required
                />
              </Field>
            </div>

            <div className="space-y-4 rounded-lg border border-border p-4">
              <h3 className="font-heading text-sm font-semibold text-foreground">محتوى المقال (يدعم Markdown والعناوين)</h3>
              <div className="space-y-4">
                <Field label="المحتوى الكامل (بالعربية)">
                  <textarea
                    className="font-mono text-sm w-full rounded-md border border-input bg-transparent p-3 shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    rows={8}
                    placeholder="## عنوان الفقرة الأولى&#10;&#10;اكتب المحتوى هنا..."
                    value={form.contentAr}
                    onChange={(e) => setForm({ ...form, contentAr: e.target.value })}
                    required
                  />
                </Field>
                <Field label="المحتوى الكامل (بالإنجليزية)">
                  <textarea
                    dir="ltr"
                    className="font-mono text-sm w-full rounded-md border border-input bg-transparent p-3 shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    rows={8}
                    placeholder="## Section Heading&#10;&#10;Write article body here..."
                    value={form.contentEn}
                    onChange={(e) => setForm({ ...form, contentEn: e.target.value })}
                    required
                  />
                </Field>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="الوسوم (مفصولة بفاصلة)">
                <Input
                  placeholder="تجميل الأنف, الرياض, السياحة العلاجية"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                />
              </Field>
              <div className="flex items-center gap-6 pt-6">
                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                  <input
                    type="checkbox"
                    className="rounded border-border text-primary focus:ring-primary size-4"
                    checked={form.published}
                    onChange={(e) => setForm({ ...form, published: e.target.checked })}
                  />
                  <span>نشر المقال للجمهور</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                  <input
                    type="checkbox"
                    className="rounded border-border text-primary focus:ring-primary size-4"
                    checked={form.featured}
                    onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                  />
                  <span>تثبيت في الرئيسية (مميز)</span>
                </label>
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button">إلغاء</Button>} />
            <Button type="submit" disabled={pending}>
              <Save className="size-4" />
              <span>{pending ? "جارٍ الحفظ..." : isEdit ? "تحديث المقال" : "حفظ المقال"}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function ArticleRowActionsMenu({ article }: { article: Article }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const handleTogglePublished = () => {
    startTransition(async () => {
      const res = await toggleArticlePublishedAction(article.id, !article.published)
      if (res.ok) {
        toast.success(article.published ? "تم إخفاء المقال" : "تم نشر المقال")
        router.refresh()
      } else {
        toast.error(res.error || "فشل تحديث الحالة")
      }
    })
  }

  const handleToggleFeatured = () => {
    startTransition(async () => {
      const res = await toggleArticleFeaturedAction(article.id, !article.featured)
      if (res.ok) {
        toast.success(article.featured ? "تمت إزالة التمييز" : "تم تثبيت المقال كمميز")
        router.refresh()
      } else {
        toast.error(res.error || "فشل تحديث التمييز")
      }
    })
  }

  const handleDelete = () => {
    startTransition(async () => {
      const res = await deleteArticleAction(article.id)
      if (res.ok) {
        toast.success("تم حذف المقال بنجاح")
        router.refresh()
      } else {
        toast.error(res.error || "فشل حذف المقال")
      }
    })
  }

  return (
    <div className="flex items-center gap-1">
      <ArticleFormButton article={article} />
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="size-4" />
              <span className="sr-only">خيارات المقال</span>
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => window.open(`/blog/${article.slug}`, "_blank")}
            className="gap-2"
          >
            <ExternalLink className="size-4" />
            <span>عرض المقال العام</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleTogglePublished} disabled={pending} className="gap-2">
            {article.published ? (
              <>
                <EyeOff className="size-4" />
                <span>إخفاء (مسودة)</span>
              </>
            ) : (
              <>
                <Eye className="size-4" />
                <span>نشر المقال</span>
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleToggleFeatured} disabled={pending} className="gap-2">
            <Star className={article.featured ? "size-4 fill-amber-500 text-amber-500" : "size-4"} />
            <span>{article.featured ? "إلغاء التمييز" : "تثبيت كمميز"}</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setConfirmDelete(true)}
            disabled={pending}
            className="gap-2 text-destructive focus:text-destructive"
          >
            <Trash2 className="size-4" />
            <span>حذف المقال</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="حذف المقال"
        description={`هل أنت متأكد من رغبتك في حذف مقال "${article.titleAr}"؟ لا يمكن التراجع عن هذا الإجراء.`}
        confirmLabel="نعم، احذف المقال"
        cancelLabel="إلغاء"
        tone="destructive"
        onConfirm={handleDelete}
      />
    </div>
  )
}
