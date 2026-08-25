"use client"

import { useState, useEffect, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  History,
  Loader2,
  ExternalLink,
  Eye,
  EyeOff,
  Save,
  Check,
  Plus,
  BadgeCheck,
  CalendarClock,
} from "lucide-react"
import { DataTable } from "@/components/ui/data-table"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { EmptyState } from "@/components/ui/empty-state"
import { Field } from "@/components/ui/field"
import { FormSection } from "@/components/ui/form-section"
import { StatusBadge, providerStatusTone } from "@/components/admin/status-badge"
import { CountrySelectField } from "@/components/admin/country-select-field"
import { TimezoneCombobox } from "@/components/admin/timezone-combobox"
import {
  updateDoctorAction,
  setDoctorStatusAction,
  setDoctorPublishedAction,
  toggleDoctorProcedureAction,
  getDoctorForEditAction,
  getDoctorProceduresAction,
  getDoctorOverviewExtrasAction,
  getDoctorActivityAction,
} from "@/lib/actions/doctor"
import { actionLabelAr } from "@/lib/audit-labels"
import { countryNameAr, providerStatusAr, licenseStatusAr, appointmentTypeAr, dayOfWeekAr } from "@/lib/status-labels"
import { dfMedium } from "@/lib/format"
import type { AdminDoctorRow, DoctorProcedureOption, DoctorLicenseInfo, AvailabilityRuleRow } from "@/lib/data/admin-directory"
import type { ActivityRow } from "@/lib/data/admin-activity"

function fmtTime(t: string): string {
  return t.slice(0, 5)
}

export function DoctorTable({ rows, centers }: { rows: AdminDoctorRow[]; centers: { id: string; name: string }[] }) {
  const [selected, setSelected] = useState<AdminDoctorRow | null>(null)

  return (
    <>
      <DataTable
        rows={rows}
        getRowKey={(d) => d.id}
        onRowClick={setSelected}
        columns={[
          {
            header: "الاسم",
            mobile: "title",
            cell: (d) => (
              <div className="flex items-center gap-2.5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary ring-1 ring-primary/15">
                  {d.name.replace(/^د\.?\s*/, "").trim().charAt(0) || "د"}
                </span>
                <span className="font-medium text-foreground">{d.name}</span>
              </div>
            ),
          },
          {
            header: "الحالة",
            mobile: "badge",
            cell: (d) => <StatusBadge tone={providerStatusTone(d.status)} label={providerStatusAr(d.status)} />,
          },
          {
            header: "الظهور",
            cell: (d) =>
              d.published ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">
                  <Eye className="size-3" /> ظاهر
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  <EyeOff className="size-3" /> مخفي
                </span>
              ),
          },
          { header: "المركز", cell: (d) => d.centerName ?? "—" },
          { header: "الموقع", cell: (d) => `${d.city ? `${d.city}، ` : ""}${countryNameAr(d.country)}` },
          { header: "الخبرة", cell: (d) => `${d.yearsExperience.toLocaleString("ar-SA-u-nu-latn")} سنة` },
        ]}
      />

      <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="sm:max-w-lg">
          {selected ? <DoctorDetailDrawer doctor={selected} centers={centers} /> : null}
        </SheetContent>
      </Sheet>
    </>
  )
}

function DoctorDetailDrawer({ doctor, centers }: { doctor: AdminDoctorRow; centers: { id: string; name: string }[] }) {
  const router = useRouter()
  const [statusPending, startStatus] = useTransition()
  const [publishPending, startPublish] = useTransition()

  function onSetStatus(status: "approved" | "suspended") {
    startStatus(async () => {
      const res = await setDoctorStatusAction({ doctorId: doctor.id, status })
      if (res.ok) {
        toast.success(status === "suspended" ? "تم إيقاف الطبيب." : "تمت إعادة الاعتماد.")
        router.refresh()
      } else {
        toast.error(res.error)
      }
    })
  }

  function onTogglePublished() {
    startPublish(async () => {
      const res = await setDoctorPublishedAction({ doctorId: doctor.id, published: !doctor.published })
      if (res.ok) {
        toast.success(doctor.published ? "تم إخفاء الطبيب." : "تم إظهار الطبيب.")
        router.refresh()
      } else {
        toast.error(res.error)
      }
    })
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle>{doctor.name}</SheetTitle>
        <SheetDescription>
          <StatusBadge tone={providerStatusTone(doctor.status)} label={providerStatusAr(doctor.status)} />
        </SheetDescription>
      </SheetHeader>

      <div className="min-h-0 flex-1 overflow-y-auto px-4">
        <Tabs defaultValue="overview">
          <TabsList className="mb-4 w-full">
            <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
            <TabsTrigger value="edit">تعديل</TabsTrigger>
            <TabsTrigger value="procedures">الإجراءات</TabsTrigger>
            <TabsTrigger value="activity">النشاط</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/doctors/${doctor.slug}`}
                target="_blank"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                عرض الملف العام <ExternalLink className="size-3" />
              </Link>
            </div>
            <div className="space-y-1.5 rounded-lg border border-border/60 p-3 text-sm">
              <Row label="المركز" value={doctor.centerName ?? "—"} />
              <Row label="الموقع" value={`${doctor.city ? `${doctor.city}، ` : ""}${countryNameAr(doctor.country)}`} />
              <Row label="سنوات الخبرة" value={`${doctor.yearsExperience.toLocaleString("ar-SA-u-nu-latn")} سنة`} />
              <Row label="تاريخ الانضمام" value={dfMedium(doctor.createdAt)} />
            </div>

            <div className="space-y-2 rounded-lg border border-border/60 p-3">
              <p className="text-xs font-medium text-muted-foreground">الظهور العام</p>
              <Button
                size="sm"
                variant="outline"
                loading={publishPending}
                disabled={!doctor.published && doctor.status !== "approved"}
                onClick={onTogglePublished}
              >
                {doctor.published ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                {doctor.published ? "إخفاء الطبيب" : "إظهار الطبيب"}
              </Button>
              {!doctor.published && doctor.status !== "approved" && (
                <p className="text-[11px] text-muted-foreground">لا يمكن الإظهار إلا لطبيب معتمد.</p>
              )}
            </div>

            <div className="space-y-2 rounded-lg border border-border/60 p-3">
              <p className="text-xs font-medium text-muted-foreground">حالة الاعتماد</p>
              {doctor.status === "approved" ? (
                <ConfirmDialog
                  trigger={
                    <Button size="sm" variant="destructive" loading={statusPending}>
                      إيقاف الطبيب
                    </Button>
                  }
                  title={`إيقاف ${doctor.name}؟`}
                  description="سيُخفى الطبيب فورًا عن الواجهة العامة ولن يتمكن من استقبال حجوزات جديدة."
                  confirmLabel="إيقاف"
                  tone="destructive"
                  onConfirm={() => onSetStatus("suspended")}
                />
              ) : doctor.status === "suspended" ? (
                <ConfirmDialog
                  trigger={
                    <Button size="sm" loading={statusPending}>
                      إعادة الاعتماد
                    </Button>
                  }
                  title={`إعادة اعتماد ${doctor.name}؟`}
                  description="سيصبح الطبيب معتمدًا مجددًا — أظهره للواجهة العامة يدويًا من زر «إظهار الطبيب» أعلاه."
                  confirmLabel="إعادة الاعتماد"
                  onConfirm={() => onSetStatus("approved")}
                />
              ) : (
                <p className="text-xs text-muted-foreground">
                  حالة الطلبات المعلّقة أو المرفوضة تُدار من قائمة طلبات الانضمام.
                </p>
              )}
            </div>

            <DoctorOverviewExtras doctorId={doctor.id} />
          </TabsContent>

          <TabsContent value="edit">
            <DoctorEditForm doctorId={doctor.id} centers={centers} />
          </TabsContent>

          <TabsContent value="procedures">
            <DoctorProceduresTab doctorId={doctor.id} />
          </TabsContent>

          <TabsContent value="activity">
            <DoctorActivityTab doctorId={doctor.id} />
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  )
}

/** License + availability — both read-only here by design; the doctor manages
 *  their own availability at /dashboard/doctor/availability (this stays a
 *  support/diagnostic view for admins, not a second place to edit it). */
function DoctorOverviewExtras({ doctorId }: { doctorId: string }) {
  const [data, setData] = useState<{ license: DoctorLicenseInfo | null; availability: AvailabilityRuleRow[] } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setData(null)
    setError(null)
    getDoctorOverviewExtrasAction(doctorId).then((res) => {
      if (res.status === "error") setError(res.message)
      else setData({ license: res.license, availability: res.availability })
    })
  }, [doctorId])

  if (error) return <p className="text-sm text-destructive">{error}</p>
  if (!data) {
    return (
      <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> جارٍ التحميل…
      </div>
    )
  }

  return (
    <>
      <div className="space-y-1.5 rounded-lg border border-border/60 p-3 text-sm">
        <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <BadgeCheck className="size-3.5" /> الترخيص
        </p>
        {data.license ? (
          <>
            <Row label="الحالة" value={licenseStatusAr(data.license.status)} />
            <Row label="جهة الإصدار" value={data.license.issuingAuthority} />
            <Row label="ينتهي في" value={data.license.expiryDate} />
            {data.license.numberLast4 && <Row label="آخر 4 أرقام" value={<span dir="ltr">{data.license.numberLast4}</span>} />}
          </>
        ) : (
          <p className="text-xs text-muted-foreground">لا يوجد ترخيص مسجَّل.</p>
        )}
      </div>

      <div className="space-y-1.5 rounded-lg border border-border/60 p-3 text-sm">
        <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <CalendarClock className="size-3.5" /> أوقات التوفر (للعرض فقط)
        </p>
        {data.availability.length === 0 ? (
          <p className="text-xs text-muted-foreground">لا توجد أوقات توفر مُسجَّلة.</p>
        ) : (
          <ul className="space-y-1">
            {data.availability.map((a) => (
              <li key={a.id} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {dayOfWeekAr(a.dayOfWeek)} · {appointmentTypeAr(a.type)}
                </span>
                <span className="tabular-nums text-foreground" dir="ltr">
                  {fmtTime(a.startTime)}–{fmtTime(a.endTime)} · {a.slotMinutes}د {!a.active && "(معطّل)"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}

type DoctorEditData = {
  name: string
  title: string
  bio: string
  country: string
  city: string
  timezone: string
  languages: string[]
  yearsExperience: number
  consultationFee: string
  currency: string
  platformCommissionRate: string
  offersVideo: boolean
  offersInPerson: boolean
  centerId: string
}

function DoctorEditForm({ doctorId, centers }: { doctorId: string; centers: { id: string; name: string }[] }) {
  const router = useRouter()
  const [data, setData] = useState<DoctorEditData | null>(null)
  const [languagesInput, setLanguagesInput] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setData(null)
    setError(null)
    getDoctorForEditAction(doctorId).then((res) => {
      if (res.status === "error") {
        setError(res.message)
        return
      }
      const d = res.doctor
      setData({
        name: d.name,
        title: d.title ?? "",
        bio: d.bio ?? "",
        country: d.country,
        city: d.city ?? "",
        timezone: d.timezone,
        languages: d.languages,
        yearsExperience: d.yearsExperience,
        consultationFee: d.consultationFee ?? "",
        currency: d.currency,
        platformCommissionRate: d.platformCommissionRate ?? "15.00",
        offersVideo: d.offersVideo,
        offersInPerson: d.offersInPerson,
        centerId: d.centerId ?? "",
      })
      setLanguagesInput(d.languages.join(", "))
    })
  }, [doctorId])

  async function onSave() {
    if (!data) return
    setBusy(true)
    setError(null)
    const res = await updateDoctorAction({
      doctorId,
      ...data,
      consultationFee: data.consultationFee === "" ? undefined : Number(data.consultationFee),
      languages: languagesInput.split(",").map((s) => s.trim()).filter(Boolean),
    })
    setBusy(false)
    if (!res.ok) {
      setError(res.error)
      return
    }
    toast.success("تم حفظ بيانات الطبيب.")
    router.refresh()
  }

  if (error && !data) return <p className="py-6 text-center text-sm text-destructive">{error}</p>
  if (!data) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> جارٍ التحميل…
      </div>
    )
  }

  return (
    <div className="space-y-3 pb-1">
      <FormSection title="المعلومات الأساسية">
        <Field label="الاسم">
          <Input value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })} />
        </Field>
        <Field label="المسمى المهني">
          <Input value={data.title} onChange={(e) => setData({ ...data, title: e.target.value })} />
        </Field>
        <Field label="نبذة">
          <Textarea rows={3} value={data.bio} onChange={(e) => setData({ ...data, bio: e.target.value })} />
        </Field>
      </FormSection>

      <FormSection title="الموقع واللغات">
        <div className="grid grid-cols-2 gap-3">
          <Field label="الدولة">
            <CountrySelectField country={data.country} onChange={(code) => setData({ ...data, country: code })} />
          </Field>
          <Field label="المدينة">
            <Input value={data.city} onChange={(e) => setData({ ...data, city: e.target.value })} />
          </Field>
        </div>
        <Field label="اللغات (مفصولة بفاصلة)">
          <Input value={languagesInput} onChange={(e) => setLanguagesInput(e.target.value)} placeholder="العربية, English" />
        </Field>
        <Field label="المنطقة الزمنية للمواعيد">
          <TimezoneCombobox
            value={data.timezone}
            onValueChange={(timezone) => setData({ ...data, timezone })}
          />
        </Field>
      </FormSection>

      <FormSection title="تفاصيل الممارسة">
        <div className="grid grid-cols-2 gap-3">
          <Field label="سنوات الخبرة">
            <Input
              type="number"
              min={0}
              dir="ltr"
              value={data.yearsExperience}
              onChange={(e) => setData({ ...data, yearsExperience: Number(e.target.value) })}
            />
          </Field>
          <Field label="المركز">
            <select
              value={data.centerId}
              onChange={(e) => setData({ ...data, centerId: e.target.value })}
              className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
            >
              <option value="">بلا مركز (مستقل)</option>
              {centers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="رسوم الاستشارة">
            <Input
              type="number"
              min={0}
              step="0.01"
              dir="ltr"
              value={data.consultationFee}
              onChange={(e) => setData({ ...data, consultationFee: e.target.value })}
            />
          </Field>
          <Field label="العملة">
            <Input dir="ltr" className="uppercase" maxLength={3} value={data.currency} onChange={(e) => setData({ ...data, currency: e.target.value.toUpperCase() })} />
          </Field>
          <Field label="عمولة المنصة %">
            <Input
              type="number"
              min={0}
              max={100}
              step="0.01"
              dir="ltr"
              value={data.platformCommissionRate}
              onChange={(e) => setData({ ...data, platformCommissionRate: e.target.value })}
            />
          </Field>
        </div>
        <div className="flex flex-wrap gap-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox checked={data.offersVideo} onCheckedChange={(v) => setData({ ...data, offersVideo: v === true })} />
            استشارة فيديو
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox checked={data.offersInPerson} onCheckedChange={(v) => setData({ ...data, offersInPerson: v === true })} />
            حضوري
          </label>
        </div>
      </FormSection>

      {/* Sticky within the drawer's own scroll container (not the whole
          page) — a long sectioned form shouldn't hide its save button
          below the fold. */}
      <div className="sticky bottom-0 -mx-4 border-t border-border/60 bg-background/95 px-4 py-3 backdrop-blur">
        {error ? <p className="mb-2 text-sm text-destructive">{error}</p> : null}
        <Button size="sm" loading={busy} loadingText="جارٍ الحفظ…" onClick={onSave}>
          <Save className="size-4" /> حفظ التعديلات
        </Button>
      </div>
    </div>
  )
}


function DoctorProceduresTab({ doctorId }: { doctorId: string }) {
  const [procedures, setProcedures] = useState<DoctorProcedureOption[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [, start] = useTransition()

  useEffect(() => {
    setProcedures(null)
    setError(null)
    getDoctorProceduresAction(doctorId).then((res) => {
      if (res.status === "ok") setProcedures(res.procedures)
      else setError(res.message)
    })
  }, [doctorId])

  function toggle(p: DoctorProcedureOption) {
    setBusyId(p.id)
    start(async () => {
      const res = await toggleDoctorProcedureAction({ doctorId, procedureId: p.id, assign: !p.assigned })
      setBusyId(null)
      if (res.ok) {
        setProcedures((prev) => prev?.map((x) => (x.id === p.id ? { ...x, assigned: !p.assigned } : x)) ?? null)
      } else {
        toast.error(res.error)
      }
    })
  }

  if (error) return <p className="py-6 text-center text-sm text-destructive">{error}</p>
  if (procedures === null) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> جارٍ التحميل…
      </div>
    )
  }
  if (procedures.length === 0) {
    return (
      <div className="py-6">
        <EmptyState icon={BadgeCheck} title="لا توجد إجراءات في الكتالوج" description="أضف إجراءات من صفحة المحتوى والإجراءات أولًا." tone="muted" />
      </div>
    )
  }

  const grouped = new Map<string, DoctorProcedureOption[]>()
  for (const p of procedures) {
    const list = grouped.get(p.categoryNameAr) ?? []
    list.push(p)
    grouped.set(p.categoryNameAr, list)
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">اضغط أي إجراء لإسناده لهذا الطبيب أو إزالته.</p>
      {Array.from(grouped.entries()).map(([category, list]) => (
        <div key={category} className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">{category}</p>
          <div className="flex flex-wrap gap-1.5">
            {list.map((p) => {
              const busy = busyId === p.id
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={busy}
                  onClick={() => toggle(p)}
                  aria-pressed={p.assigned}
                  className={
                    "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors disabled:opacity-60 " +
                    (p.assigned
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground")
                  }
                >
                  {busy ? (
                    <span className="size-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : p.assigned ? (
                    <Check className="size-3" />
                  ) : (
                    <Plus className="size-3" />
                  )}
                  {p.nameAr}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function DoctorActivityTab({ doctorId }: { doctorId: string }) {
  const [entries, setEntries] = useState<ActivityRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setEntries(null)
    setError(null)
    getDoctorActivityAction(doctorId).then((res) => {
      if (res.status === "ok") setEntries(res.entries)
      else setError(res.message)
    })
  }, [doctorId])

  if (error) return <p className="py-6 text-center text-sm text-destructive">{error}</p>
  if (entries === null) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> جارٍ التحميل…
      </div>
    )
  }
  if (entries.length === 0) {
    return (
      <div className="py-6">
        <EmptyState icon={History} title="لا يوجد نشاط مسجَّل" description="لم تُسجَّل أي تغييرات على هذا الطبيب بعد." tone="muted" />
      </div>
    )
  }
  return (
    <ul className="space-y-2">
      {entries.map((e) => (
        <li key={e.id} className="rounded-lg border border-border/60 p-3">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium text-foreground">{actionLabelAr(e.action)}</p>
            <span className="whitespace-nowrap text-[11px] text-muted-foreground">{dfMedium(e.createdAt)}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">بواسطة {e.actorName ?? "النظام"}</p>
        </li>
      ))}
    </ul>
  )
}
