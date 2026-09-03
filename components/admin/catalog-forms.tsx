"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Plus, Pencil, Save, X, EyeOff, Eye, Trash2, ImagePlus, ImageOff, MoreVertical } from "lucide-react"
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
import { Field } from "@/components/ui/field"
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
              <CategoryImageUploader categoryId={existing.id} imageUrl={existing.imageUrl} r2Enabled={r2Enabled} />
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

/** Runs an async image action (upload/remove) with consistent busy/error/toast
 *  handling — shared by ImageSlot's own upload/remove and the procedure
 *  gallery's, which used to each hand-roll this wiring and had drifted (only
 *  one of the two toasted on failure). */
async function runImageAction(
  setBusy: (busy: boolean) => void,
  setError: (error: string | null) => void,
  fn: () => Promise<void>,
  fallbackMessage: string,
) {
  setBusy(true)
  setError(null)
  try {
    await fn()
  } catch (err) {
    const message = err instanceof Error ? err.message : fallbackMessage
    setError(message)
    toast.error(message)
  } finally {
    setBusy(false)
  }
}

/** Shown instead of any uploader when the R2 bucket isn't configured on this deploy. */
function ImageUploadDisabledNotice() {
  return (
    <p className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
      <ImageOff className="size-3.5 shrink-0" /> رفع الصور غير مفعّل حاليًا على هذا الخادم.
    </p>
  )
}

/**
 * One "current image, with a trigger to replace/upload and a delete button"
 * slot — the exact UI category's single image and a procedure's main image
 * share; only the request each makes on upload/remove differs, so that part
 * is left to the caller rather than baked in here. Manages its own busy/
 * error state so the caller doesn't have to.
 */
function ImageSlot({
  label,
  imageUrl,
  onUpload,
  onRemove,
  externallyDisabled,
}: {
  label: string
  imageUrl: string | null
  onUpload: (file: File) => Promise<void>
  onRemove?: () => Promise<void>
  externallyDisabled?: boolean
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const disabled = busy || Boolean(externallyDisabled)

  async function handleUpload(file: File) {
    await runImageAction(setBusy, setError, () => onUpload(file), "تعذّر رفع الصورة")
  }

  async function handleRemove() {
    if (!onRemove) return
    await runImageAction(setBusy, setError, onRemove, "تعذّر حذف الصورة")
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <label className="cursor-pointer">
          <span className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
            <ImagePlus className="size-3.5" /> {imageUrl ? "استبدال" : "رفع صورة"}
          </span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            disabled={disabled}
            onChange={(e) => {
              const file = e.target.files?.[0]
              e.target.value = ""
              if (file) void handleUpload(file)
            }}
          />
        </label>
      </div>
      {imageUrl && (
        <div className="relative inline-block">
          <Image src={imageUrl} alt="" width={120} height={80} className="rounded-lg border border-border object-cover" />
          {onRemove && (
            <button
              type="button"
              onClick={() => void handleRemove()}
              disabled={disabled}
              className="absolute -end-1.5 -top-1.5 flex size-6 items-center justify-center rounded-full bg-destructive text-white shadow-sm"
              aria-label={`حذف ${label}`}
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      )}
      {busy && <p className="text-xs text-muted-foreground">جارٍ المعالجة…</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

function CategoryImageUploader({
  categoryId,
  imageUrl,
  r2Enabled,
}: {
  categoryId: string
  imageUrl: string | null
  r2Enabled: boolean
}) {
  const router = useRouter()
  if (!r2Enabled) return <ImageUploadDisabledNotice />

  return (
    <ImageSlot
      label="صورة القسم"
      imageUrl={imageUrl}
      onUpload={async (rawFile) => {
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
      }}
      onRemove={async () => {
        const res = await fetch(`/api/admin/categories/${categoryId}/image`, { method: "DELETE" })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? "تعذّر حذف الصورة")
        toast.success("تم حذف الصورة")
        router.refresh()
      }}
    />
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
  const [galleryBusy, setGalleryBusy] = useState(false)
  const [galleryError, setGalleryError] = useState<string | null>(null)

  // Downscale before upload — see lib/client/image-resize.ts. Every consumer
  // downstream (the web image optimizer, the mobile app fetching R2 directly)
  // gets a reasonably sized source instead of whatever the admin's camera produced.
  async function uploadToSlot(rawFile: File, slot: "main" | "gallery") {
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
  }

  async function removeObject(objectKey: string) {
    const res = await fetch(`/api/admin/procedures/${procedureId}/image`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ objectKey }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? "تعذّر حذف الصورة")
  }

  async function handleGalleryUpload(file: File) {
    await runImageAction(
      setGalleryBusy,
      setGalleryError,
      async () => {
        await uploadToSlot(file, "gallery")
        toast.success("تم رفع الصورة")
        router.refresh()
      },
      "تعذّر رفع الصورة",
    )
  }

  async function handleGalleryRemove(objectKey: string) {
    await runImageAction(
      setGalleryBusy,
      setGalleryError,
      async () => {
        await removeObject(objectKey)
        toast.success("تم حذف الصورة")
        router.refresh()
      },
      "تعذّر حذف الصورة",
    )
  }

  if (!r2Enabled) return <ImageUploadDisabledNotice />

  return (
    <div className="space-y-3 rounded-lg border border-border/60 p-3">
      <ImageSlot
        label="الصورة الرئيسية"
        imageUrl={imageUrl}
        externallyDisabled={galleryBusy}
        onUpload={async (file) => {
          await uploadToSlot(file, "main")
          toast.success("تم رفع الصورة")
          router.refresh()
        }}
        onRemove={
          imageKey
            ? async () => {
                await removeObject(imageKey)
                toast.success("تم حذف الصورة")
                router.refresh()
              }
            : undefined
        }
      />

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
            disabled={galleryBusy}
            onChange={(e) => {
              const file = e.target.files?.[0]
              e.target.value = ""
              if (file) void handleGalleryUpload(file)
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
                onClick={() => void handleGalleryRemove(g.key)}
                disabled={galleryBusy}
                className="absolute -end-1.5 -top-1.5 flex size-6 items-center justify-center rounded-full bg-destructive text-white shadow-sm"
                aria-label="حذف صورة من المعرض"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {galleryBusy && <p className="text-xs text-muted-foreground">جارٍ المعالجة…</p>}
      {galleryError && <p className="text-xs text-destructive">{galleryError}</p>}
    </div>
  )
}

/**
 * Replaces what used to be two separate always-visible icon buttons
 * (toggle-visible, delete) sitting right next to Edit in every row — three
 * equal-weight buttons with no distinction between a safe toggle and a
 * destructive delete. Edit stays its own visible button (the action you
 * take most often); this menu holds the two secondary ones, with delete
 * visually separated and red inside it instead of sitting flush against
 * the others.
 */
export function CatalogRowActionsMenu({
  kind,
  id,
  name,
  visible,
}: {
  kind: "category" | "procedure"
  id: string
  name: string
  visible: boolean
}) {
  const [pending, start] = useTransition()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const router = useRouter()
  const kindLabel = kind === "category" ? "القسم" : "الإجراء"

  function toggleVisible() {
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

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button type="button" variant="ghost" size="icon-sm" aria-label="مزيد من الإجراءات" loading={pending} />}
        >
          <MoreVertical className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={toggleVisible} disabled={pending}>
            {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            {visible ? "إخفاء" : "إظهار"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => setConfirmOpen(true)}>
            <Trash2 className="size-4" /> حذف
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Controlled, not `trigger`-based — the trigger above lives inside
          the dropdown's own dismissible layer, which would unmount this
          dialog the instant the menu item click closes the menu. */}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
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
    </>
  )
}

