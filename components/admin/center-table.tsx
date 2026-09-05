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
  Users as UsersIcon,
  BadgeCheck,
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
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { EmptyState } from "@/components/ui/empty-state"
import { StatusBadge, providerStatusTone } from "@/components/admin/status-badge"
import { Field } from "@/components/ui/field"
import { FormSection } from "@/components/ui/form-section"
import { CenterCoordinatesForm } from "@/components/admin/center-coordinates-form"
import { CountrySelectField } from "@/components/admin/country-select-field"
import {
  updateCenterAction,
  setCenterStatusAction,
  setCenterVerifiedAction,
  setCenterPublishedAction,
  getCenterForEditAction,
  getCenterDoctorsAction,
  getCenterActivityAction,
} from "@/lib/actions/center"
import { actionLabelAr } from "@/lib/audit-labels"
import { countryNameAr, providerStatusAr } from "@/lib/status-labels"
import { dfMedium } from "@/lib/format"
import type { AdminCenterRow, CenterDoctorRow } from "@/lib/data/admin-directory"
import type { ActivityRow } from "@/lib/data/admin-activity"

export function CenterTable({ rows }: { rows: AdminCenterRow[] }) {
  const [selected, setSelected] = useState<AdminCenterRow | null>(null)

  return (
    <>
      <DataTable
        rows={rows}
        getRowKey={(c) => c.id}
        onRowClick={setSelected}
        columns={[
          {
            header: "الاسم",
            mobile: "title",
            cell: (c) => (
              <div className="flex items-center gap-2.5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xs font-bold text-primary ring-1 ring-primary/15">
                  {c.name.trim().charAt(0) || "م"}
                </span>
                <span className="font-medium text-foreground">{c.name}</span>
              </div>
            ),
          },
          {
            header: "الحالة",
            mobile: "badge",
            cell: (c) => <StatusBadge tone={providerStatusTone(c.status)} label={providerStatusAr(c.status)} />,
          },
          {
            header: "الظهور",
            cell: (c) =>
              c.published ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">
                  <Eye className="size-3" /> ظاهر
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  <EyeOff className="size-3" /> مخفي
                </span>
              ),
          },
          { header: "الموقع", cell: (c) => `${c.city ? `${c.city}، ` : ""}${countryNameAr(c.country)}` },
          {
            header: "الأطباء",
            cell: (c) => (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium tabular-nums text-primary">
                <UsersIcon className="size-3" /> {c.doctorCount.toLocaleString("ar-SA-u-nu-latn")}
              </span>
            ),
          },
        ]}
      />

      <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="sm:max-w-lg">
          {selected ? <CenterDetailDrawer center={selected} /> : null}
        </SheetContent>
      </Sheet>
    </>
  )
}

function CenterDetailDrawer({ center }: { center: AdminCenterRow }) {
  const router = useRouter()
  const [statusPending, startStatus] = useTransition()
  const [publishPending, startPublish] = useTransition()
  const [verifyPending, startVerify] = useTransition()

  function onSetStatus(status: "approved" | "suspended") {
    startStatus(async () => {
      const res = await setCenterStatusAction({ centerId: center.id, status })
      if (res.ok) {
        toast.success(status === "suspended" ? "تم إيقاف المركز." : "تم إعادة اعتماد المركز.")
        router.refresh()
      } else {
        toast.error(res.error)
      }
    })
  }

  function onTogglePublished() {
    startPublish(async () => {
      const res = await setCenterPublishedAction({ centerId: center.id, published: !center.published })
      if (res.ok) {
        toast.success(center.published ? "تم إخفاء المركز." : "تم إظهار المركز.")
        router.refresh()
      } else {
        toast.error(res.error)
      }
    })
  }

  function onToggleVerified() {
    startVerify(async () => {
      const res = await setCenterVerifiedAction({ centerId: center.id, verified: !center.verified })
      if (res.ok) {
        toast.success(center.verified ? "تم إلغاء توثيق المركز." : "تم توثيق المركز بنجاح.")
        router.refresh()
      } else {
        toast.error(res.error)
      }
    })
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle>{center.name}</SheetTitle>
        <SheetDescription>
          <StatusBadge tone={providerStatusTone(center.status)} label={providerStatusAr(center.status)} />
        </SheetDescription>
      </SheetHeader>

      <div className="min-h-0 flex-1 overflow-y-auto px-4">
        <Tabs defaultValue="overview">
          <TabsList className="mb-4 w-full">
            <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
            <TabsTrigger value="edit">تعديل</TabsTrigger>
            <TabsTrigger value="doctors">الأطباء</TabsTrigger>
            <TabsTrigger value="activity">النشاط</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/centers/${center.slug}`}
                target="_blank"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                عرض الملف العام <ExternalLink className="size-3" />
              </Link>
            </div>
            <div className="space-y-1.5 rounded-lg border border-border/60 p-3 text-sm">
              <Row label="الموقع" value={`${center.city ? `${center.city}، ` : ""}${countryNameAr(center.country)}`} />
              <Row label="عدد الأطباء" value={center.doctorCount.toLocaleString("ar-SA-u-nu-latn")} />
              <Row label="تاريخ الإنشاء" value={dfMedium(center.createdAt)} />
            </div>

            <div className="space-y-2 rounded-lg border border-border/60 p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">التحقق والتوثيق</p>
                {center.verified ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">
                    <BadgeCheck className="size-3" /> موثَّق
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    غير موثَّق
                  </span>
                )}
              </div>
              <Button
                size="sm"
                variant={center.verified ? "ghost" : "outline"}
                loading={verifyPending}
                onClick={onToggleVerified}
              >
                <BadgeCheck className="size-4" />
                {center.verified ? "إلغاء التوثيق" : "توثيق المركز الآن"}
              </Button>
            </div>

            <div className="space-y-2 rounded-lg border border-border/60 p-3">
              <p className="text-xs font-medium text-muted-foreground">الظهور العام</p>
              <Button
                size="sm"
                variant="outline"
                loading={publishPending}
                disabled={!center.published && (center.status !== "approved" || !center.verified)}
                onClick={onTogglePublished}
              >
                {center.published ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                {center.published ? "إخفاء المركز" : "إظهار المركز"}
              </Button>
              {!center.published && (center.status !== "approved" || !center.verified) && (
                <p className="text-[11px] text-muted-foreground">
                  يلزم اعتماد المركز وإكمال التحقق من بياناته قبل الإظهار.
                </p>
              )}
            </div>

            <div className="space-y-2 rounded-lg border border-border/60 p-3">
              <p className="text-xs font-medium text-muted-foreground">حالة الاعتماد</p>
              {center.status === "approved" ? (
                <ConfirmDialog
                  trigger={
                    <Button size="sm" variant="destructive" loading={statusPending}>
                      إيقاف المركز
                    </Button>
                  }
                  title={`إيقاف مركز ${center.name}؟`}
                  description="سيُخفى المركز فورًا عن الواجهة العامة ولن يتمكن أطباؤه من استقبال حجوزات جديدة عبره."
                  confirmLabel="إيقاف"
                  tone="destructive"
                  onConfirm={() => onSetStatus("suspended")}
                />
              ) : center.status === "suspended" ? (
                <ConfirmDialog
                  trigger={
                    <Button size="sm" loading={statusPending}>
                      إعادة الاعتماد
                    </Button>
                  }
                  title={`إعادة اعتماد مركز ${center.name}؟`}
                  description="سيصبح المركز معتمدًا مجددًا — أظهره للواجهة العامة يدويًا من زر «إظهار المركز» أعلاه."
                  confirmLabel="إعادة الاعتماد"
                  onConfirm={() => onSetStatus("approved")}
                />
              ) : (
                <p className="text-xs text-muted-foreground">
                  حالة الطلبات المعلّقة أو المرفوضة تُدار من قائمة طلبات الانضمام.
                </p>
              )}
            </div>

            <div className="space-y-2 rounded-lg border border-border/60 p-3">
              <p className="text-xs font-medium text-muted-foreground">الموقع الجغرافي (لترتيب الأقرب)</p>
              <CenterCoordinatesForm centerId={center.id} latitude={center.latitude} longitude={center.longitude} />
            </div>
          </TabsContent>

          <TabsContent value="edit">
            <CenterEditForm centerId={center.id} />
          </TabsContent>

          <TabsContent value="doctors">
            <CenterDoctorsTab centerId={center.id} />
          </TabsContent>

          <TabsContent value="activity">
            <CenterActivityTab centerId={center.id} />
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

type CenterEditData = {
  legalName: string
  name: string
  description: string
  country: string
  city: string
  address: string
  phone: string
  email: string
  website: string
  languages: string[]
  platformCommissionRate: string
}

function CenterEditForm({ centerId }: { centerId: string }) {
  const router = useRouter()
  const [data, setData] = useState<CenterEditData | null>(null)
  const [languagesInput, setLanguagesInput] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setData(null)
    setError(null)
    getCenterForEditAction(centerId).then((res) => {
      if (res.status === "error") {
        setError(res.message)
        return
      }
      const c = res.center
      setData({
        legalName: c.legalName ?? "",
        name: c.name ?? "",
        description: c.description ?? "",
        country: c.country ?? "",
        city: c.city ?? "",
        address: c.address ?? "",
        phone: c.phone ?? "",
        email: c.email ?? "",
        website: c.website ?? "",
        languages: c.languages ?? [],
        platformCommissionRate: c.platformCommissionRate ?? "15.00",
      })
      setLanguagesInput((c.languages ?? []).join(", "))
    })
  }, [centerId])

  async function onSave() {
    if (!data) return
    setBusy(true)
    setError(null)
    const res = await updateCenterAction({
      centerId,
      ...data,
      languages: languagesInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    })
    setBusy(false)
    if (!res.ok) {
      setError(res.error)
      return
    }
    toast.success("تم حفظ بيانات المركز.")
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
      <FormSection title="الهوية">
        <Field label="الاسم القانوني">
          <Input value={data.legalName} onChange={(e) => setData({ ...data, legalName: e.target.value })} />
        </Field>
        <Field label="الاسم التجاري">
          <Input value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })} />
        </Field>
        <Field label="الوصف">
          <Textarea rows={3} value={data.description} onChange={(e) => setData({ ...data, description: e.target.value })} />
        </Field>
      </FormSection>

      <FormSection title="الموقع">
        <div className="grid grid-cols-2 gap-3">
          <Field label="الدولة">
            <CountrySelectField country={data.country} onChange={(code) => setData({ ...data, country: code })} />
          </Field>
          <Field label="المدينة">
            <Input value={data.city} onChange={(e) => setData({ ...data, city: e.target.value })} />
          </Field>
        </div>
        <Field label="العنوان">
          <Input value={data.address} onChange={(e) => setData({ ...data, address: e.target.value })} />
        </Field>
      </FormSection>

      <FormSection title="التواصل">
        <div className="grid grid-cols-2 gap-3">
          <Field label="الهاتف">
            <Input dir="ltr" value={data.phone} onChange={(e) => setData({ ...data, phone: e.target.value })} />
          </Field>
          <Field label="البريد الإلكتروني">
            <Input dir="ltr" type="email" value={data.email} onChange={(e) => setData({ ...data, email: e.target.value })} />
          </Field>
        </div>
        <Field label="الموقع الإلكتروني">
          <Input dir="ltr" value={data.website} onChange={(e) => setData({ ...data, website: e.target.value })} />
        </Field>
        <Field label="اللغات (مفصولة بفاصلة)">
          <Input value={languagesInput} onChange={(e) => setLanguagesInput(e.target.value)} placeholder="العربية, English" />
        </Field>
      </FormSection>

      <FormSection title="المالية">
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
      </FormSection>

      <div className="sticky bottom-0 -mx-4 border-t border-border/60 bg-background/95 px-4 py-3 backdrop-blur">
        {error ? <p className="mb-2 text-sm text-destructive">{error}</p> : null}
        <Button size="sm" loading={busy} loadingText="جارٍ الحفظ…" onClick={onSave}>
          <Save className="size-4" /> حفظ التعديلات
        </Button>
      </div>
    </div>
  )
}


function CenterDoctorsTab({ centerId }: { centerId: string }) {
  const [doctors, setDoctors] = useState<CenterDoctorRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [, start] = useTransition()

  useEffect(() => {
    setDoctors(null)
    setError(null)
    start(async () => {
      const res = await getCenterDoctorsAction(centerId)
      if (res.status === "ok") setDoctors(res.doctors)
      else setError(res.message)
    })
  }, [centerId])

  if (error) return <p className="py-6 text-center text-sm text-destructive">{error}</p>
  if (doctors === null) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> جارٍ التحميل…
      </div>
    )
  }
  if (doctors.length === 0) {
    return (
      <div className="py-6">
        <EmptyState icon={UsersIcon} title="لا يوجد أطباء بهذا المركز" description="لم يُسند أي طبيب لهذا المركز بعد." tone="muted" />
      </div>
    )
  }
  return (
    <ul className="space-y-2">
      {doctors.map((d) => (
        <li key={d.id} className="flex items-center justify-between gap-2 rounded-lg border border-border/60 p-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{d.name}</p>
            <div className="mt-1 flex items-center gap-2">
              <StatusBadge tone={providerStatusTone(d.status)} label={providerStatusAr(d.status)} />
              {!d.published && <Badge variant="outline">مخفي</Badge>}
            </div>
          </div>
          <Link
            href={`/doctors/${d.slug}`}
            target="_blank"
            aria-label={`فتح الملف العام لـ${d.name} في تبويب جديد`}
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-primary hover:bg-muted"
          >
            <ExternalLink className="size-4" />
          </Link>
        </li>
      ))}
    </ul>
  )
}

function CenterActivityTab({ centerId }: { centerId: string }) {
  const [entries, setEntries] = useState<ActivityRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [, start] = useTransition()

  useEffect(() => {
    setEntries(null)
    setError(null)
    start(async () => {
      const res = await getCenterActivityAction(centerId)
      if (res.status === "ok") setEntries(res.entries)
      else setError(res.message)
    })
  }, [centerId])

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
        <EmptyState icon={History} title="لا يوجد نشاط مسجَّل" description="لم تُسجَّل أي تغييرات على هذا المركز بعد." tone="muted" />
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
