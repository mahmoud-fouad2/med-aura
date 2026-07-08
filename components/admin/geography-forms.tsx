"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Plus, Pencil, Save, X, Power, Trash2, RotateCcw, Check } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { CountryCombobox } from "@/components/admin/country-combobox"
import { TimezoneCombobox } from "@/components/admin/timezone-combobox"
import {
  upsertCountryAction,
  toggleCountryActiveAction,
  deleteCountryAction,
  upsertCityAction,
  toggleCityActiveAction,
  deleteCityAction,
  type ActionResult,
} from "@/lib/actions/geography"
import { flagFromCountryCode, type CountryPreset } from "@/lib/geo"

export type CountryRow = {
  id: string
  code: string
  nameAr: string
  nameEn: string
  sortOrder: number
  active: boolean
  callingCode: string | null
  currencyCode: string | null
  defaultLanguage: string
  timezone: string | null
}

const LANGUAGE_OPTIONS = [
  { value: "ar", label: "العربية" },
  { value: "en", label: "الإنجليزية" },
  { value: "tr", label: "التركية" },
  { value: "fr", label: "الفرنسية" },
]

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

  // Controlled so picking a preset can fill every field at once instead of
  // asking the admin to type a name, an ISO code, a calling code, a currency
  // code and a timezone from memory for every single country.
  const [nameAr, setNameAr] = useState(existing?.nameAr ?? "")
  const [nameEn, setNameEn] = useState(existing?.nameEn ?? "")
  const [code, setCode] = useState(existing?.code ?? "")
  const [callingCode, setCallingCode] = useState(existing?.callingCode ?? "")
  const [currencyCode, setCurrencyCode] = useState(existing?.currencyCode ?? "")
  const [defaultLanguage, setDefaultLanguage] = useState(existing?.defaultLanguage ?? "ar")
  const [timezone, setTimezone] = useState(existing?.timezone ?? "")
  // A country picked from the combobox that hasn't been applied to the form
  // yet — staged instead of applied instantly whenever there's something to
  // lose (edit mode, or add mode after the admin already typed something),
  // so picking a country never silently overwrites in-progress edits.
  const [pendingPreset, setPendingPreset] = useState<CountryPreset | null>(null)

  function applyPreset(preset: CountryPreset) {
    setNameAr(preset.nameAr)
    setNameEn(preset.nameEn)
    setCode(preset.code)
    setCallingCode(preset.callingCode)
    setCurrencyCode(preset.currencyCode)
    setDefaultLanguage(preset.defaultLanguage)
    setTimezone(preset.timezone)
    setPendingPreset(null)
  }

  function handlePick(preset: CountryPreset) {
    const isPristine = !nameAr && !nameEn && !code && !callingCode && !currencyCode && !timezone
    if (!existing && isPristine) {
      applyPreset(preset)
    } else {
      setPendingPreset(preset)
    }
  }

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

  const flagPreview = flagFromCountryCode(code)

  return (
    <Card className="space-y-5 border-primary/40 p-4 sm:p-5">
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
        <Field label={existing ? "البحث عن دولة لتطبيق بياناتها الجاهزة" : "اختر دولة من القائمة لملء البيانات تلقائيًا"}>
          <CountryCombobox onSelect={handlePick} />
        </Field>

        {pendingPreset && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-background p-2.5 text-xs">
            <span aria-hidden="true" className="text-base leading-none">
              {flagFromCountryCode(pendingPreset.code)}
            </span>
            <span className="flex-1 text-foreground">
              تطبيق بيانات <strong>{pendingPreset.nameAr}</strong> سيستبدل القيم الحالية في الحقول أدناه.
            </span>
            <Button type="button" size="xs" onClick={() => applyPreset(pendingPreset)}>
              <Check className="size-3.5" /> تطبيق
            </Button>
            <Button type="button" size="xs" variant="ghost" onClick={() => setPendingPreset(null)}>
              تجاهل
            </Button>
          </div>
        )}
      </div>

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
        className="space-y-5"
      >
        {existing && <input type="hidden" name="id" value={existing.id} />}

        <FormSection title="معلومات أساسية">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="الاسم بالعربية">
              <Input name="nameAr" value={nameAr} onChange={(e) => setNameAr(e.target.value)} required minLength={2} />
            </Field>
            <Field label="الاسم بالإنجليزية">
              <Input name="nameEn" value={nameEn} onChange={(e) => setNameEn(e.target.value)} required minLength={2} dir="ltr" />
            </Field>
            <Field label="كود الدولة (ISO، حرفان)" hint="يُشتق العلم منه تلقائيًا — لا حاجة لاختياره يدويًا.">
              <div className="flex items-center gap-2">
                <Input
                  name="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  required
                  minLength={2}
                  maxLength={2}
                  placeholder="SA"
                  dir="ltr"
                  className="uppercase"
                />
                <span
                  aria-hidden="true"
                  title="معاينة العلم"
                  className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-dashed border-border text-lg"
                >
                  {flagPreview || "🏳️"}
                </span>
              </div>
            </Field>
            <Field label="ترتيب العرض">
              <Input type="number" name="sortOrder" defaultValue={existing?.sortOrder ?? 0} min={0} max={9999} />
            </Field>
          </div>
        </FormSection>

        <FormSection title="الاتصال">
          <Field label="رمز الاتصال الدولي (اختياري)" hint="بصيغة +رقم — يبقى بالاتجاه الصحيح داخل الواجهة العربية.">
            <Input
              name="callingCode"
              value={callingCode}
              onChange={(e) => setCallingCode(e.target.value)}
              placeholder="+966"
              dir="ltr"
              className="max-w-40"
            />
          </Field>
        </FormSection>

        <FormSection title="الإعدادات المحلية">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="رمز العملة (اختياري)">
              <Input
                name="currencyCode"
                value={currencyCode}
                onChange={(e) => setCurrencyCode(e.target.value.toUpperCase())}
                placeholder="SAR"
                maxLength={3}
                dir="ltr"
                className="uppercase"
              />
            </Field>
            <Field label="اللغة الأساسية">
              <Select
                name="defaultLanguage"
                items={LANGUAGE_OPTIONS.map((l) => ({ value: l.value, label: l.label }))}
                value={defaultLanguage}
                onValueChange={(v) => setDefaultLanguage(String(v))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGE_OPTIONS.map((l) => (
                    <SelectItem key={l.value} value={l.value}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="المنطقة الزمنية الأساسية (اختياري)" full hint="لدول متعددة المناطق الزمنية، اختر المنطقة الأكثر استخدامًا — يبقى الحقل قابلًا للتعديل لاحقًا.">
              <TimezoneCombobox name="timezone" value={timezone} onValueChange={setTimezone} />
            </Field>
          </div>
        </FormSection>

        <FormSection title="حالة الدولة">
          <label className="flex h-9 items-center gap-2">
            <input
              type="checkbox"
              name="active"
              defaultChecked={existing?.active ?? true}
              className="size-4 accent-primary"
            />
            <span className="text-sm text-muted-foreground">متاحة للاستخدام على المنصة</span>
          </label>
        </FormSection>

        <div className="flex justify-end gap-2 border-t border-border/60 pt-4">
          <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={pending}>
            <X className="size-4" /> إلغاء
          </Button>
          <Button type="submit" size="sm" loading={pending} loadingText="جارٍ الحفظ…" disabled={pending}>
            <Save className="size-4" /> حفظ
          </Button>
        </div>
      </form>
    </Card>
  )
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2.5">
      <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      {children}
    </div>
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
  const [countryId, setCountryId] = useState(existing?.countryId ?? "")

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
            <Select
              name="countryId"
              items={countries.map((c) => ({ value: c.id, label: c.nameAr }))}
              value={countryId}
              onValueChange={(v) => setCountryId(String(v))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="اختر الدولة…" />
              </SelectTrigger>
              <SelectContent>
                {countries.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nameAr}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
  const router = useRouter()
  const kindLabel = kind === "country" ? "الدولة" : "المدينة"
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
      description={`سيُحذف "${name}" نهائيًا ولا يمكن التراجع عن هذا الإجراء. إن كانت مرتبطة ببيانات أخرى سنمنع الحذف ونوضح لك السبب.`}
      confirmLabel="حذف نهائيًا"
      tone="destructive"
      onConfirm={async () => {
        const res =
          kind === "country" ? await deleteCountryAction(id) : await deleteCityAction(id)
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
  hint,
  full,
  children,
}: {
  label: string
  hint?: string
  full?: boolean
  children: React.ReactNode
}) {
  return (
    <label className={"space-y-1 " + (full ? "sm:col-span-2" : "")}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
      {hint && <span className="block text-[11px] leading-relaxed text-muted-foreground/80">{hint}</span>}
    </label>
  )
}
