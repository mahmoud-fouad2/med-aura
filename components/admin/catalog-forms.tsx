"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Plus, Pencil, Save, X, EyeOff, Eye } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import {
  upsertCategoryAction,
  upsertProcedureAction,
  toggleCategoryVisibleAction,
  toggleProcedureVisibleAction,
  type ActionResult,
} from "@/lib/actions/catalog"

export type CategoryRow = {
  id: string
  slug: string
  nameAr: string
  nameEn: string
  descriptionAr?: string | null
  descriptionEn?: string | null
  icon?: string | null
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
}

async function handleResult(res: ActionResult, onOk: () => void) {
  if (res.status === "ok") {
    toast.success("تم الحفظ")
    onOk()
  } else {
    toast.error(res.message)
  }
}

export function CategoryFormButton({ existing }: { existing?: CategoryRow }) {
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  const router = useRouter()

  if (!open) {
    return (
      <Button
        type="button"
        variant={existing ? "ghost" : "default"}
        size={existing ? "icon-sm" : "sm"}
        aria-label={existing ? "تعديل القسم" : "إضافة قسم"}
        onClick={() => setOpen(true)}
      >
        {existing ? <Pencil className="size-4" /> : <><Plus className="size-4" /> قسم جديد</>}
      </Button>
    )
  }

  return (
    <Card className="space-y-3 border-primary/40 p-4">
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
        className="space-y-3"
      >
        {existing && <input type="hidden" name="id" value={existing.id} />}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="الرابط الفريد (slug)">
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
          <Field label="أيقونة (اسم Lucide، اختياري)">
            <Input
              name="icon"
              defaultValue={existing?.icon ?? ""}
              placeholder="Sparkles"
              dir="ltr"
            />
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
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            <X className="size-4" /> إلغاء
          </Button>
          <Button type="submit" size="sm" loading={pending} loadingText="جارٍ الحفظ…">
            <Save className="size-4" /> حفظ
          </Button>
        </div>
      </form>
    </Card>
  )
}

export function ProcedureFormButton({
  existing,
  categories,
}: {
  existing?: ProcedureRow
  categories: { id: string; nameAr: string }[]
}) {
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  const router = useRouter()

  if (!open) {
    return (
      <Button
        type="button"
        variant={existing ? "ghost" : "default"}
        size={existing ? "icon-sm" : "sm"}
        aria-label={existing ? "تعديل الإجراء" : "إضافة إجراء"}
        onClick={() => setOpen(true)}
      >
        {existing ? <Pencil className="size-4" /> : <><Plus className="size-4" /> إجراء جديد</>}
      </Button>
    )
  }

  return (
    <Card className="space-y-3 border-primary/40 p-4">
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
        className="space-y-3"
      >
        {existing && <input type="hidden" name="id" value={existing.id} />}
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
          <Field label="الرابط الفريد (slug)">
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
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            <X className="size-4" /> إلغاء
          </Button>
          <Button type="submit" size="sm" loading={pending} loadingText="جارٍ الحفظ…">
            <Save className="size-4" /> حفظ
          </Button>
        </div>
      </form>
    </Card>
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
