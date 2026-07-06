"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Plus, Pencil, Save, X, Power, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import {
  upsertCountryAction,
  toggleCountryActiveAction,
  deleteCountryAction,
  upsertCityAction,
  toggleCityActiveAction,
  deleteCityAction,
  type ActionResult,
} from "@/lib/actions/geography"

export type CountryRow = {
  id: string
  code: string
  nameAr: string
  nameEn: string
  sortOrder: number
  active: boolean
}

export type CityRow = {
  id: string
  countryId: string
  nameAr: string
  nameEn: string
  active: boolean
}

function handle(res: ActionResult, ok: string, after: () => void) {
  if (res.status === "ok") {
    toast.success(ok)
    after()
  } else {
    toast.error(res.message)
  }
}

export function CountryFormButton({ existing }: { existing?: CountryRow }) {
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  const router = useRouter()

  if (!open) {
    return (
      <Button
        type="button"
        variant={existing ? "ghost" : "default"}
        size={existing ? "icon-sm" : "sm"}
        aria-label={existing ? "تعديل الدولة" : "إضافة دولة"}
        onClick={() => setOpen(true)}
      >
        {existing ? <Pencil className="size-4" /> : <><Plus className="size-4" /> دولة جديدة</>}
      </Button>
    )
  }

  return (
    <Card className="space-y-3 border-primary/40 p-4">
      <form
        action={(fd) =>
          start(async () => {
            const res = await upsertCountryAction(fd)
            handle(res, "تم حفظ الدولة.", () => {
              setOpen(false)
              router.refresh()
            })
          })
        }
        className="space-y-3"
      >
        {existing && <input type="hidden" name="id" value={existing.id} />}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="الاسم بالعربية">
            <Input name="nameAr" defaultValue={existing?.nameAr ?? ""} required minLength={2} />
          </Field>
          <Field label="الاسم بالإنجليزية">
            <Input name="nameEn" defaultValue={existing?.nameEn ?? ""} required minLength={2} dir="ltr" />
          </Field>
          <Field label="كود الدولة (حرفان)">
            <Input
              name="code"
              defaultValue={existing?.code ?? ""}
              required
              minLength={2}
              maxLength={2}
              placeholder="SA"
              dir="ltr"
              className="uppercase"
            />
          </Field>
          <Field label="ترتيب العرض">
            <Input type="number" name="sortOrder" defaultValue={existing?.sortOrder ?? 0} min={0} max={9999} />
          </Field>
          <Field label="متاحة للاستخدام">
            <label className="flex h-9 items-center gap-2">
              <input
                type="checkbox"
                name="active"
                defaultChecked={existing?.active ?? true}
                className="size-4 accent-primary"
              />
              <span className="text-sm text-muted-foreground">نشطة</span>
            </label>
          </Field>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={pending}>
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

export function CityFormButton({
  existing,
  countries,
}: {
  existing?: CityRow
  countries: { id: string; nameAr: string }[]
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
        aria-label={existing ? "تعديل المدينة" : "إضافة مدينة"}
        onClick={() => setOpen(true)}
      >
        {existing ? <Pencil className="size-4" /> : <><Plus className="size-4" /> مدينة جديدة</>}
      </Button>
    )
  }

  return (
    <Card className="space-y-3 border-primary/40 p-4">
      <form
        action={(fd) =>
          start(async () => {
            const res = await upsertCityAction(fd)
            handle(res, "تم حفظ المدينة.", () => {
              setOpen(false)
              router.refresh()
            })
          })
        }
        className="space-y-3"
      >
        {existing && <input type="hidden" name="id" value={existing.id} />}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="الدولة">
            <select
              name="countryId"
              defaultValue={existing?.countryId ?? ""}
              required
              className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="" disabled>
                اختر الدولة…
              </option>
              {countries.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nameAr}
                </option>
              ))}
            </select>
          </Field>
          <Field label="متاحة للاستخدام">
            <label className="flex h-9 items-center gap-2">
              <input
                type="checkbox"
                name="active"
                defaultChecked={existing?.active ?? true}
                className="size-4 accent-primary"
              />
              <span className="text-sm text-muted-foreground">نشطة</span>
            </label>
          </Field>
          <Field label="الاسم بالعربية">
            <Input name="nameAr" defaultValue={existing?.nameAr ?? ""} required minLength={2} />
          </Field>
          <Field label="الاسم بالإنجليزية">
            <Input name="nameEn" defaultValue={existing?.nameEn ?? ""} required minLength={2} dir="ltr" />
          </Field>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={pending}>
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

export function GeoToggleButton({
  kind,
  id,
  active,
}: {
  kind: "country" | "city"
  id: string
  active: boolean
}) {
  const [pending, start] = useTransition()
  const router = useRouter()
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={active ? "تعطيل" : "تفعيل"}
      title={active ? "تعطيل" : "تفعيل"}
      loading={pending}
      onClick={() =>
        start(async () => {
          const res =
            kind === "country"
              ? await toggleCountryActiveAction(id)
              : await toggleCityActiveAction(id)
          handle(res, active ? "تم التعطيل." : "تم التفعيل.", () => router.refresh())
        })
      }
    >
      <Power className={"size-4 " + (active ? "text-success" : "text-muted-foreground")} />
    </Button>
  )
}

export function GeoDeleteButton({
  kind,
  id,
  name,
}: {
  kind: "country" | "city"
  id: string
  name: string
}) {
  const [pending, start] = useTransition()
  const router = useRouter()
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label="حذف"
      title="حذف"
      loading={pending}
      onClick={() => {
        if (!confirm(`سيتم حذف "${name}" نهائيًا. هل أنت متأكد؟`)) return
        start(async () => {
          const res =
            kind === "country" ? await deleteCountryAction(id) : await deleteCityAction(id)
          handle(res, "تم الحذف.", () => router.refresh())
        })
      }}
    >
      <Trash2 className="size-4 text-destructive" />
    </Button>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}
