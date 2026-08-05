"use client"

import { useState, useEffect, useTransition } from "react"
import Link from "next/link"
import { History, Loader2, FileHeart, Receipt, Bell } from "lucide-react"
import { DataTable } from "@/components/ui/data-table"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { StatusBadge, userAccountStatusTone } from "@/components/admin/status-badge"
import { UserAccountMenu } from "@/components/admin/user-account-menu"
import { EmptyState } from "@/components/ui/empty-state"
import { getUserActivityAction } from "@/lib/actions/users"
import { getPatientCasesAction, getPatientPaymentsAction, getPatientNotificationsAction } from "@/lib/actions/admin-patients"
import { actionLabelAr } from "@/lib/audit-labels"
import { caseStatusAr, invoiceStatusAr, countryNameAr, userAccountStatusAr } from "@/lib/status-labels"
import { dtfMedium, safeName, isGarbled } from "@/lib/format"
import type { AdminPatientRow } from "@/lib/data/admin-directory"
import type { PatientCaseRow, PatientNotificationRow } from "@/lib/data/admin-patient-detail"
import type { MyPaymentRow } from "@/lib/data/invoice"
import type { ActivityRow } from "@/lib/data/admin-activity"

/**
 * Patients admin table + row-details drawer. Reuses the exact same shell,
 * account menu, and activity tab as the Users admin drawer (patients are
 * users) — only the clinical/billing/notifications tabs are patient-specific
 * and don't exist anywhere else.
 */
export function PatientTable({ rows, canViewActivity, canManageAccount }: { rows: AdminPatientRow[]; canViewActivity: boolean; canManageAccount: boolean }) {
  const [selected, setSelected] = useState<AdminPatientRow | null>(null)

  return (
    <>
      <DataTable
        rows={rows}
        getRowKey={(p) => p.userId}
        onRowClick={setSelected}
        columns={[
          {
            header: "المريض",
            mobile: "title",
            cell: (p) => (
              <div className="flex items-center gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 font-heading text-xs font-bold text-primary">
                  {p.name.trim().charAt(0) || "؟"}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{safeName(p.name)}</p>
                  <p dir="ltr" className="truncate text-xs text-muted-foreground">{p.email}</p>
                </div>
              </div>
            ),
          },
          {
            header: "الموقع",
            cell: (p) => `${p.city && !isGarbled(p.city) ? `${p.city}، ` : ""}${p.residenceCountry ? countryNameAr(p.residenceCountry) : "—"}`,
          },
          {
            header: "الحالة",
            mobile: "badge",
            cell: (p) => <StatusBadge tone={userAccountStatusTone(p.status)} label={userAccountStatusAr(p.status)} />,
          },
          {
            header: "الحالات الطبية",
            cell: (p) =>
              p.caseCount > 0 ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium tabular-nums text-primary">
                  {p.caseCount.toLocaleString("ar-SA-u-nu-latn")}
                </span>
              ) : (
                <span className="text-muted-foreground/50">—</span>
              ),
          },
          {
            header: "تاريخ التسجيل",
            cell: (p) => new Date(p.createdAt).toLocaleDateString("ar-SA-u-nu-latn", { day: "numeric", month: "short", year: "numeric" }),
          },
        ]}
      />

      <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="sm:max-w-md">
          {selected ? (
            <PatientDetailDrawer
              patient={selected}
              canViewActivity={canViewActivity}
              canManageAccount={canManageAccount}
            />
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  )
}

function PatientDetailDrawer({
  patient,
  canViewActivity,
  canManageAccount,
}: {
  patient: AdminPatientRow
  canViewActivity: boolean
  canManageAccount: boolean
}) {
  return (
    <>
      <SheetHeader>
        <SheetTitle>{safeName(patient.name)}</SheetTitle>
        <SheetDescription dir="ltr" className="text-start">
          {patient.email}
        </SheetDescription>
      </SheetHeader>

      <div className="min-h-0 flex-1 overflow-y-auto px-4">
        <Tabs defaultValue="overview">
          <TabsList className="mb-4 w-full">
            <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
            <TabsTrigger value="cases">الحالات</TabsTrigger>
            <TabsTrigger value="billing">الفواتير</TabsTrigger>
            <TabsTrigger value="notifications">الإشعارات</TabsTrigger>
            {canManageAccount && <TabsTrigger value="security">الأمان</TabsTrigger>}
            {canViewActivity && <TabsTrigger value="activity">النشاط</TabsTrigger>}
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <DetailGroup>
              <DetailRow label="الحالة" value={<StatusBadge tone={userAccountStatusTone(patient.status)} label={userAccountStatusAr(patient.status)} />} />
              <DetailRow label="الهاتف" value={patient.phone ? <span dir="ltr">{patient.phone}</span> : "—"} />
              <DetailRow
                label="الموقع"
                value={`${patient.city && !isGarbled(patient.city) ? `${patient.city}، ` : ""}${patient.residenceCountry ? countryNameAr(patient.residenceCountry) : "—"}`}
              />
              <DetailRow label="عدد الحالات الطبية" value={patient.caseCount.toLocaleString("ar-SA-u-nu-latn")} />
              <DetailRow label="تاريخ التسجيل" value={dtfMedium(patient.createdAt)} />
            </DetailGroup>
          </TabsContent>

          <TabsContent value="cases">
            <PatientCasesTab userId={patient.userId} />
          </TabsContent>

          <TabsContent value="billing">
            <PatientBillingTab userId={patient.userId} />
          </TabsContent>

          <TabsContent value="notifications">
            <PatientNotificationsTab userId={patient.userId} />
          </TabsContent>

          {canManageAccount && (
            <TabsContent value="security" className="space-y-3">
              <p className="text-xs text-muted-foreground">
                تعديل البيانات، تعطيل/تفعيل الحساب، تسجيل الخروج من كل الأجهزة، أو إرسال رابط
                إعادة تعيين كلمة المرور.
              </p>
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <span className="text-sm font-medium text-foreground">إجراءات الحساب</span>
                <UserAccountMenu
                  userId={patient.userId}
                  userName={safeName(patient.name)}
                  userPhone={patient.phone}
                  isActive={patient.status === "active"}
                  isSelf={false}
                />
              </div>
            </TabsContent>
          )}

          {canViewActivity && (
            <TabsContent value="activity">
              <PatientActivityTab userId={patient.userId} />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </>
  )
}

function PatientCasesTab({ userId }: { userId: string }) {
  const [rows, setRows] = useState<PatientCaseRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [, start] = useTransition()

  useEffect(() => {
    setRows(null)
    setError(null)
    start(async () => {
      const res = await getPatientCasesAction(userId)
      if (res.status === "ok") setRows(res.rows)
      else setError(res.message)
    })
  }, [userId])

  if (error) return <p className="py-6 text-center text-sm text-destructive">{error}</p>
  if (rows === null) return <LoadingRow />
  if (rows.length === 0) {
    return (
      <div className="py-6">
        <EmptyState icon={FileHeart} title="لا توجد حالات طبية" description="لم يفتح هذا المريض أي حالة بعد." tone="muted" />
      </div>
    )
  }
  return (
    <ul className="space-y-2">
      {rows.map((c) => (
        <li key={c.id} className="rounded-lg border border-border/60 p-3">
          <div className="flex items-start justify-between gap-2">
            <Link href={`/admin/cases?q=${encodeURIComponent(c.reference)}`} className="text-sm font-medium text-primary hover:underline">
              {c.reference}
            </Link>
            <span className="whitespace-nowrap text-[11px] text-muted-foreground">{dtfMedium(c.createdAt)}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {c.procedureNameAr} · {caseStatusAr(c.status)}
            {c.doctorName ? ` · د. ${c.doctorName}` : ""}
          </p>
        </li>
      ))}
    </ul>
  )
}

/** Exported: also reused by the Users admin drawer for patient-role accounts. */
export function PatientBillingTab({ userId }: { userId: string }) {
  const [rows, setRows] = useState<MyPaymentRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [, start] = useTransition()

  useEffect(() => {
    setRows(null)
    setError(null)
    start(async () => {
      const res = await getPatientPaymentsAction(userId)
      if (res.status === "ok") setRows(res.rows)
      else setError(res.message)
    })
  }, [userId])

  if (error) return <p className="py-6 text-center text-sm text-destructive">{error}</p>
  if (rows === null) return <LoadingRow />
  if (rows.length === 0) {
    return (
      <div className="py-6">
        <EmptyState icon={Receipt} title="لا توجد فواتير" description="لا يوجد سجل مدفوعات لهذا المريض بعد." tone="muted" />
      </div>
    )
  }
  return (
    <ul className="space-y-2">
      {rows.map((p) => (
        <li key={p.paymentId} className="rounded-lg border border-border/60 p-3">
          <div className="flex items-start justify-between gap-2">
            <span dir="ltr" className="text-sm font-medium text-foreground">
              {Number(p.amount).toLocaleString("ar-SA-u-nu-latn")} {p.currency}
            </span>
            <StatusBadge tone={p.status === "PAID" ? "success" : p.status === "OVERDUE" ? "danger" : "neutral"} label={invoiceStatusAr(p.status)} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {p.serviceNameAr ?? p.appointmentType ?? "—"}
            {p.doctorName ? ` · د. ${p.doctorName}` : ""} · {dtfMedium(p.createdAt)}
          </p>
        </li>
      ))}
    </ul>
  )
}

function PatientNotificationsTab({ userId }: { userId: string }) {
  const [rows, setRows] = useState<PatientNotificationRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [, start] = useTransition()

  useEffect(() => {
    setRows(null)
    setError(null)
    start(async () => {
      const res = await getPatientNotificationsAction(userId)
      if (res.status === "ok") setRows(res.rows)
      else setError(res.message)
    })
  }, [userId])

  if (error) return <p className="py-6 text-center text-sm text-destructive">{error}</p>
  if (rows === null) return <LoadingRow />
  if (rows.length === 0) {
    return (
      <div className="py-6">
        <EmptyState icon={Bell} title="لا توجد إشعارات" description="لم يصل هذا المريض أي إشعار بعد." tone="muted" />
      </div>
    )
  }
  return (
    <ul className="space-y-2">
      {rows.map((n) => (
        <li key={n.id} className="rounded-lg border border-border/60 p-3">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium text-foreground">{n.title}</p>
            {!n.readAt && <StatusBadge tone="info" label="غير مقروء" />}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">{dtfMedium(n.createdAt)}</p>
        </li>
      ))}
    </ul>
  )
}

function PatientActivityTab({ userId }: { userId: string }) {
  const [entries, setEntries] = useState<ActivityRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [, start] = useTransition()

  useEffect(() => {
    setEntries(null)
    setError(null)
    start(async () => {
      const res = await getUserActivityAction(userId)
      if (res.status === "ok") setEntries(res.entries)
      else setError(res.message)
    })
  }, [userId])

  if (error) return <p className="py-6 text-center text-sm text-destructive">{error}</p>
  if (entries === null) return <LoadingRow />
  if (entries.length === 0) {
    return (
      <div className="py-6">
        <EmptyState icon={History} title="لا يوجد نشاط مسجَّل" description="لم تُسجَّل أي تغييرات على هذا الحساب بعد." tone="muted" />
      </div>
    )
  }
  return (
    <ul className="space-y-2">
      {entries.map((e) => (
        <li key={e.id} className="rounded-lg border border-border/60 p-3">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium text-foreground">{actionLabelAr(e.action)}</p>
            <span className="whitespace-nowrap text-[11px] text-muted-foreground">{dtfMedium(e.createdAt)}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">بواسطة {e.actorName ?? "النظام"}</p>
        </li>
      ))}
    </ul>
  )
}

function LoadingRow() {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" /> جارٍ التحميل…
    </div>
  )
}

function DetailGroup({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      {title ? <p className="text-xs font-medium text-muted-foreground">{title}</p> : null}
      <div className="space-y-1.5 rounded-lg border border-border/60 p-3">{children}</div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  )
}
