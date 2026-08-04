"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Plus, Pencil, Save, X, EyeOff, Eye, Trash2, ImagePlus, ImageOff } from "lucide-react"
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
  upsertCategoryAction,
  upsertProcedureAction,
  toggleCategoryVisibleAction,
  toggleProcedureVisibleAction,
  deleteCategoryAction,
  deleteProcedureAction,
  type ActionResult,
} from "@/lib/actions/catalog"
import { resizeImageFile } from "@/lib/client/image-resize"
import { CATEGORY_ICON_NAMES, CATEGORY_ICONS } from "@/components/marketing/category-icon"
import { cn } from "@/lib/utils"

export type CategoryRow = {
  id: string
  slug: string
  nameAr: string
  nameEn: string
  descriptionAr?: string | null
  descriptionEn?: string | null
  icon?: string | null
  imageKey: string | null
  imageUrl: string | null
  sortOrder: number
  visible: boolean
}

export type ProcedureRow = {
  id: string
  categoryId: string
  slug: string
  nameAr: string
  nameEn: string
  descriptionAr?: string | null
  descriptionEn?: string | null
  isSurgical: boolean
  recoveryDays?: number | null
  sortOrder: number
  visible: boolean
  imageKey: string | null
  imageUrl: string | null
  gallery: { key: string; url: string | null }[]
  seoTitleAr?: string | null
  seoTitleEn?: string | null
  seoDescriptionAr?: string | null
  seoDescriptionEn?: string | null
}

async function handleResult(res: ActionResult, onOk: () => void) {
  if (res.status === "ok") {
    toast.success("تم الحفظ")
    onOk()
  } else {
    toast.error(res.message)
  }
}

export function CategoryFormButton({
  existing,
  r2Enabled,
}: {
  existing?: CategoryRow
  r2Enabled: boolean
}) {
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  const router = useRouter()
  const [icon, setIcon] = useState(
    existing?.icon && CATEGORY_ICON_NAMES.includes(existing.icon as (typeof CATEGORY_ICON_NAMES)[number])
      ? existing.icon
      : CATEGORY_ICON_NAMES[0],
  )

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant={existing ? "ghost" : "default"}
            size={existing ? "icon-sm" : "sm"}
            aria-label={existing ? "تعديل القسم" : "إضافة قسم"}
          />
        }
      >
        {existing ? <Pencil className="size-4" /> : <><Plus className="size-4" /> قسم جديد</>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existing ? `تعديل قسم "${existing.nameAr}"` : "قسم جديد"}</DialogTitle>
        </DialogHeader>
        <form
          action={(fd) =>
            start(async () => {
              const res = await upsertCategoryAction(fd)
              handleResult(res, () => {
                setOpen(false)
                router.refresh()
              })
            })
          }
          className="flex min-h-0 flex-1 flex-col"
        >
          {existing && <input type="hidden" name="id" value={existing.id} />}
          <DialogBody className="space-y-3">
            {existing ? (
              <CategoryImageUploader categoryId={existing.id} imageKey={existing.imageKey} imageUrl={existing.imageUrl} r2Enabled={r2Enabled} />
            ) : (
              <p className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                احفظ القسم أولًا، ثم افتح التعديل لإضافة صورة.
              </p>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
            <Field label="الرابط الفريد">
              <Input
                name="slug"
                defaultValue={existing?.slug ?? ""}
                placeholder="body-contouring"
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                required
                dir="ltr"
              />
            </Field>
            <Field label="ترتيب العرض">
              <Input
                type="number"
                name="sortOrder"
                defaultValue={existing?.sortOrder ?? 0}
                min={0}
                max={9999}
              />
            </Field>
            <Field label="الاسم بالعربية">
              <Input name="nameAr" defaultValue={existing?.nameAr ?? ""} required />
            </Field>
            <Field label="الاسم بالإنجليزية">
              <Input name="nameEn" defaultValue={existing?.nameEn ?? ""} required dir="ltr" />
            </Field>
            <Field label="الأيقونة" full>
              <input type="hidden" name="icon" value={icon} />
              <div className="flex flex-wrap gap-2">
                {CATEGORY_ICON_NAMES.map((name) => {
                  const IconComp = CATEGORY_ICONS[name]
                  const selected = icon === name
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setIcon(name)}
                      aria-pressed={selected}
                      aria-label={name}
                      className={cn(
                        "flex size-10 items-center justify-center rounded-xl border transition-colors",
                        selected
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
                      )}
                    >
                      <IconComp className="size-5" />
                    </button>
                  )
                })}
              </div>
            </Field>
            <Field label="ظاهر للجمهور">
              <label className="flex h-9 items-center gap-2">
                <input
                  type="checkbox"
                  name="visible"
                  defaultChecked={existing?.visible ?? true}
                  className="size-4 accent-primary"
                />
                <span className="text-sm text-muted-foreground">مرئي</span>
              </label>
            </Field>
            <Field label="وصف عربي (اختياري)" full>
              <Input name="descriptionAr" defaultValue={existing?.descriptionAr ?? ""} />
            </Field>
            <Field label="وصف إنجليزي (اختياري)" full>
              <Input
                name="descriptionEn"
                defaultValue={existing?.descriptionEn ?? ""}
                dir="ltr"
              />
            </Field>
            </div>
          </DialogBody>
          <DialogFooter>
            <DialogClose
              render={<Button type="button" variant="ghost" size="sm" disabled={pending} />}
            >
              <X className="size-4" /> إلغاء
            </DialogClose>
            <Button type="submit" size="sm" loading={pending} loadingText="جارٍ الحفظ…">
              <Save className="size-4" /> حفظ
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function CategoryImageUploader({
  categoryId,
  imageKey,
  imageUrl,
  r2Enabled,
}: {
  categoryId: string
  imageKey: string | null
  imageUrl: string | null
  r2Enabled: boolean
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function upload(rawFile: File) {
    setBusy(true)
    setError(null)
    try {
      const file = await resizeImageFile(rawFile)
      const presignRes = await fetch(`/api/admin/categories/${categoryId}/image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, contentType: file.type, sizeBytes: file.size }),
      })
      const presign = await presignRes.json()
      if (!presignRes.ok) throw new Error(presign.error ?? "تعذّر بدء الرفع")

      const putRes = await fetch(presign.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      })
      if (!putRes.ok) throw new Error("تعذّر رفع الصورة")

      const finalizeRes = await fetch(`/api/admin/categories/${categoryId}/image`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ objectKey: presign.objectKey }),
      })
      const finalize = await finalizeRes.json()
      if (!finalizeRes.ok) throw new Error(finalize.error ?? "تعذّر حفظ الصورة")

      toast.success("تم رفع الصورة")
      router.refresh()
    } catch (err) {
      const message = err instanceof Error ? err.message : "تعذّر رفع الصورة"
      setError(message)
      toast.error(message)
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!imageKey) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/categories/${categoryId}/image`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "تعذّر حذف الصورة")
      toast.success("تم حذف الصورة")
      router.refresh()
    } catch (err) {
      const message = err instanceof Error ? err.message : "تعذّر حذف الصورة"
      setError(message)
      toast.error(message)
    } finally {
      setBusy(false)
    }
  }

  if (!r2Enabled) {
    return (
      <p className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        <ImageOff className="size-3.5 shrink-0" /> رفع الصور غير مفعّل حاليًا على هذا الخادم.
      </p>
    )
  }

  return (
    <div className="space-y-3 rounded-lg border border-border/60 p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">صورة القسم</span>
        <label className="cursor-pointer">
          <span className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
            <ImagePlus className="size-3.5" /> {imageUrl ? "استبدال" : "رفع صورة"}
          </span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0]
              e.target.value = ""
              if (file) void upload(file)
            }}
          />
        </label>
      </div>
      {imageUrl && imageKey && (
        <div className="relative inline-block">
          <Image src={imageUrl} alt="" width={120} height={80} className="rounded-lg border border-border object-cover" />
          <button
            type="button"
            onClick={() => void remove()}
            disabled={busy}
            className="absolute -end-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-destructive text-white shadow-sm"
            aria-label="حذف صورة القسم"
          >
            <X className="size-3" />
          </button>
        </div>
      )}
      {busy && <p className="text-xs text-muted-foreground">جارٍ المعالجة…</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

export function ProcedureFormButton({
  existing,
  categories,
  r2Enabled,
}: {
  existing?: ProcedureRow
  categories: { id: string; nameAr: string }[]
  r2Enabled: boolean
}) {
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  const router = useRouter()

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant={existing ? "ghost" : "default"}
            size={existing ? "icon-sm" : "sm"}
            aria-label={existing ? "تعديل الإجراء" : "إضافة إجراء"}
          />
        }
      >
        {existing ? <Pencil className="size-4" /> : <><Plus className="size-4" /> إجراء جديد</>}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{existing ? `تعديل إجراء "${existing.nameAr}"` : "إجراء جديد"}</DialogTitle>
        </DialogHeader>
        <form
          action={(fd) =>
            start(async () => {
              const res = await upsertProcedureAction(fd)
              handleResult(res, () => {
                setOpen(false)
                router.refresh()
              })
            })
          }
          className="flex min-h-0 flex-1 flex-col"
        >
          {existing && <input type="hidden" name="id" value={existing.id} />}
          <DialogBody className="space-y-3">
        {existing ? (
          <ProcedureImageUploader procedureId={existing.id} imageKey={existing.imageKey} imageUrl={existing.imageUrl} gallery={existing.gallery} r2Enabled={r2Enabled} />
        ) : (
          <p className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            احفظ الإجراء أولًا، ثم افتح التعديل لإضافة الصور.
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="القسم">
            <select
              name="categoryId"
              defaultValue={existing?.categoryId ?? ""}
              required
              className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="" disabled>
                اختر قسمًا…
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nameAr}
                </option>
              ))}
            </select>
          </Field>
          <Field label="الرابط الفريد">
            <Input
              name="slug"
              defaultValue={existing?.slug ?? ""}
              placeholder="rhinoplasty"
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              required
              dir="ltr"
            />
          </Field>
          <Field label="الاسم بالعربية">
            <Input name="nameAr" defaultValue={existing?.nameAr ?? ""} required />
          </Field>
          <Field label="الاسم بالإنجليزية">
            <Input name="nameEn" defaultValue={existing?.nameEn ?? ""} required dir="ltr" />
          </Field>
          <Field label="أيام النقاهة (اختياري)">
            <Input
              type="number"
              name="recoveryDays"
              defaultValue={existing?.recoveryDays ?? ""}
              min={0}
              max={365}
            />
          </Field>
          <Field label="ترتيب العرض">
            <Input
              type="number"
              name="sortOrder"
              defaultValue={existing?.sortOrder ?? 0}
              min={0}
              max={9999}
            />
          </Field>
          <Field label="جراحي؟">
            <label className="flex h-9 items-center gap-2">
              <input
                type="checkbox"
                name="isSurgical"
                defaultChecked={existing?.isSurgical ?? false}
                className="size-4 accent-primary"
              />
              <span className="text-sm text-muted-foreground">جراحي</span>
            </label>
          </Field>
          <Field label="ظاهر للجمهور">
            <label className="flex h-9 items-center gap-2">
              <input
                type="checkbox"
                name="visible"
                defaultChecked={existing?.visible ?? true}
                className="size-4 accent-primary"
              />
              <span className="text-sm text-muted-foreground">مرئي</span>
            </label>
          </Field>
          <Field label="الوصف بالعربية" full>
            <textarea
              name="descriptionAr"
              defaultValue={existing?.descriptionAr ?? ""}
              rows={3}
              className="w-full rounded-lg border border-input bg-background p-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </Field>
          <Field label="الوصف بالإنجليزية" full>
            <textarea
              name="descriptionEn"
              defaultValue={existing?.descriptionEn ?? ""}
              rows={3}
              dir="ltr"
              className="w-full rounded-lg border border-input bg-background p-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </Field>
        </div>

        <details className="rounded-lg border border-border/60 p-3">
          <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
            بيانات SEO (اختياري)
          </summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="عنوان SEO (عربي)">
              <Input name="seoTitleAr" defaultValue={existing?.seoTitleAr ?? ""} maxLength={160} />
            </Field>
            <Field label="عنوان SEO (إنجليزي)">
              <Input name="seoTitleEn" defaultValue={existing?.seoTitleEn ?? ""} maxLength={160} dir="ltr" />
            </Field>
            <Field label="وصف SEO (عربي)" full>
              <textarea
                name="seoDescriptionAr"
                defaultValue={existing?.seoDescriptionAr ?? ""}
                rows={2}
                maxLength={300}
                className="w-full rounded-lg border border-input bg-background p-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </Field>
            <Field label="وصف SEO (إنجليزي)" full>
              <textarea
                name="seoDescriptionEn"
                defaultValue={existing?.seoDescriptionEn ?? ""}
                rows={2}
                maxLength={300}
                dir="ltr"
                className="w-full rounded-lg border border-input bg-background p-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </Field>
          </div>
        </details>
          </DialogBody>
          <DialogFooter>
            <DialogClose
              render={<Button type="button" variant="ghost" size="sm" disabled={pending} />}
            >
              <X className="size-4" /> إلغاء
            </DialogClose>
            <Button type="submit" size="sm" loading={pending} loadingText="جارٍ الحفظ…">
              <Save className="size-4" /> حفظ
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ProcedureImageUploader({
  procedureId,
  imageKey,
  imageUrl,
  gallery,
  r2Enabled,
}: {
  procedureId: string
  imageKey: string | null
  imageUrl: string | null
  gallery: { key: string; url: string | null }[]
  r2Enabled: boolean
}) {
  const router = useRouter()
  const [busy, setBusy] = useState<"main" | "gallery" | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function upload(rawFile: File, slot: "main" | "gallery") {
    setBusy(slot)
    setError(null)
    try {
      // Downscale before upload — see lib/client/image-resize.ts. Every
      // consumer downstream (the web image optimizer, the mobile app
      // fetching R2 directly) gets a reasonably sized source instead of
      // whatever the admin's camera produced.
      const file = await resizeImageFile(rawFile)
      const presignRes = await fetch(`/api/admin/procedures/${procedureId}/image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, contentType: file.type, sizeBytes: file.size, slot }),
      })
      const presign = await presignRes.json()
      if (!presignRes.ok) throw new Error(presign.error ?? "تعذّر بدء الرفع")

      const putRes = await fetch(presign.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      })
      if (!putRes.ok) throw new Error("تعذّر رفع الصورة")

      const finalizeRes = await fetch(`/api/admin/procedures/${procedureId}/image`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ objectKey: presign.objectKey, slot }),
      })
      const finalize = await finalizeRes.json()
      if (!finalizeRes.ok) throw new Error(finalize.error ?? "تعذّر حفظ الصورة")

      toast.success("تم رفع الصورة")
      router.refresh()
    } catch (err) {
      const message = err instanceof Error ? err.message : "تعذّر رفع الصورة"
      setError(message)
      toast.error(message)
    } finally {
      setBusy(null)
    }
  }

  async function remove(objectKey: string) {
    setBusy("main")
    setError(null)
    try {
      const res = await fetch(`/api/admin/procedures/${procedureId}/image`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ objectKey }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "تعذّر حذف الصورة")
      toast.success("تم حذف الصورة")
      router.refresh()
    } catch (err) {
      const message = err instanceof Error ? err.message : "تعذّر حذف الصورة"
      setError(message)
      toast.error(message)
    } finally {
      setBusy(null)
    }
  }

  if (!r2Enabled) {
    return (
      <p className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        <ImageOff className="size-3.5 shrink-0" /> رفع الصور غير مفعّل حاليًا على هذا الخادم.
      </p>
    )
  }

  return (
    <div className="space-y-3 rounded-lg border border-border/60 p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">الصورة الرئيسية</span>
        <label className="cursor-pointer">
          <span className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
            <ImagePlus className="size-3.5" /> {imageUrl ? "استبدال" : "رفع صورة"}
          </span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            disabled={busy !== null}
            onChange={(e) => {
              const file = e.target.files?.[0]
              e.target.value = ""
              if (file) void upload(file, "main")
            }}
          />
        </label>
      </div>
      {imageUrl && imageKey && (
        <div className="relative inline-block">
          <Image src={imageUrl} alt="" width={120} height={80} className="rounded-lg border border-border object-cover" />
          <button
            type="button"
            onClick={() => void remove(imageKey)}
            disabled={busy !== null}
            className="absolute -end-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-destructive text-white shadow-sm"
            aria-label="حذف الصورة الرئيسية"
          >
            <X className="size-3" />
          </button>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-border/60 pt-3">
        <span className="text-xs font-medium text-muted-foreground">صور المعرض</span>
        <label className="cursor-pointer">
          <span className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
            <ImagePlus className="size-3.5" /> إضافة صورة
          </span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            disabled={busy !== null}
            onChange={(e) => {
              const file = e.target.files?.[0]
              e.target.value = ""
              if (file) void upload(file, "gallery")
            }}
          />
        </label>
      </div>
      {gallery.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {gallery.map((g) => (
            <div key={g.key} className="relative inline-block">
              {g.url && (
                <Image src={g.url} alt="" width={80} height={60} className="rounded-lg border border-border object-cover" />
              )}
              <button
                type="button"
                onClick={() => void remove(g.key)}
                disabled={busy !== null}
                className="absolute -end-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-destructive text-white shadow-sm"
                aria-label="حذف صورة من المعرض"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {busy && <p className="text-xs text-muted-foreground">جارٍ المعالجة…</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

export function ToggleVisibleButton({
  kind,
  id,
  visible,
}: {
  kind: "category" | "procedure"
  id: string
  visible: boolean
}) {
  const [pending, start] = useTransition()
  const router = useRouter()
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={visible ? "إخفاء" : "إظهار"}
      loading={pending}
      onClick={() =>
        start(async () => {
          const res =
            kind === "category"
              ? await toggleCategoryVisibleAction(id)
              : await toggleProcedureVisibleAction(id)
          if (res.status === "ok") {
            toast.success(visible ? "تم الإخفاء" : "تم الإظهار")
            router.refresh()
          } else {
            toast.error(res.message)
          }
        })
      }
    >
      {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
    </Button>
  )
}

export function CatalogDeleteButton({
  kind,
  id,
  name,
}: {
  kind: "category" | "procedure"
  id: string
  name: string
}) {
  const router = useRouter()
  const kindLabel = kind === "category" ? "القسم" : "الإجراء"
  return (
    <ConfirmDialog
      trigger={
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="حذف"
          title="حذف"
        >
          <Trash2 className="size-4 text-destructive" />
        </Button>
      }
      title={`حذف ${kindLabel} "${name}"؟`}
      description={`سيُحذف "${name}" نهائيًا ولا يمكن التراجع عن هذا الإجراء. إن كان مرتبطًا بحالات مرضى أو أطباء سنمنع الحذف ونوضح لك السبب.`}
      confirmLabel="حذف نهائيًا"
      tone="destructive"
      onConfirm={async () => {
        const res =
          kind === "category"
            ? await deleteCategoryAction(id)
            : await deleteProcedureAction(id)
        if (res.status === "ok") {
          toast.success("تم الحذف.")
          router.refresh()
          return true
        }
        toast.error(res.message)
        return false
      }}
    />
  )
}

function Field({
  label,
  full,
  children,
}: {
  label: string
  full?: boolean
  children: React.ReactNode
}) {
  return (
    <label className={"space-y-1 " + (full ? "sm:col-span-2" : "")}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}
