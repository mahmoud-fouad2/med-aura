import Link from "next/link"
import {
  History,
  Search,
  Filter,
  Activity as ActivityIcon,
  User as UserIcon,
} from "lucide-react"
import { requirePermissionPage } from "@/lib/session"
import { PERMISSIONS } from "@/lib/rbac"
import { searchActivity, type ActivityFilter } from "@/lib/data/admin-activity"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { PageHeader } from "@/components/dashboard/page-header"
import { firstParam } from "@/lib/utils"

export const dynamic = "force-dynamic"
export const metadata = { title: "سجل النشاط" }


/**
 * Maps action namespaces to a colored dot so a reviewer scanning the log
 * can visually cluster events by domain (case / payment / provider /
 * safety / auth / notification) without reading the action strings.
 */
function actionTone(action: string): string {
  const [ns] = action.split(".")
  const map: Record<string, string> = {
    case: "bg-primary",
    payment: "bg-success",
    invoice: "bg-success",
    refund: "bg-warning",
    provider: "bg-secondary-foreground",
    safety: "bg-destructive",
    followup: "bg-warning",
    auth: "bg-info",
    login: "bg-info",
    notification: "bg-primary",
    catalog: "bg-secondary-foreground",
    consent: "bg-info",
    quote: "bg-primary",
    treatment_plan: "bg-primary",
    before_after: "bg-primary",
    travel: "bg-primary",
  }
  return map[ns] ?? "bg-muted-foreground"
}

function actionAr(action: string): string {
  const key = action.replace(/\./g, "_")
  const MAP: Record<string, string> = {
    case_create: "إنشاء حالة",
    case_update: "تحديث حالة",
    case_close: "إغلاق حالة",
    payment_success: "دفع ناجح",
    payment_failed: "فشل دفع",
    refund_request: "طلب استرجاع",
    refund_approve: "قبول استرجاع",
    provider_application_submit: "تقديم طلب انضمام",
    provider_approve: "اعتماد مقدم خدمة",
    provider_reject: "رفض مقدم خدمة",
    safety_alert_create: "إنشاء تنبيه سلامة",
    safety_alert_resolve: "معالجة تنبيه سلامة",
    catalog_procedure_create: "إنشاء إجراء",
    catalog_category_create: "إنشاء قسم",
    before_after_case_approve: "اعتماد قبل/بعد",
    consent_grant: "منح موافقة",
    consent_revoke: "سحب موافقة",
    notification_preferences_update: "تحديث تفضيلات الإشعارات",
    travel_request_submit: "طلب سفر",
    travel_offer_send: "إرسال عرض سفر",
    travel_offer_accept: "قبول عرض سفر",
  }
  return MAP[key] ?? action
}

export default async function AdminActivityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requirePermissionPage(PERMISSIONS.AUDIT_READ)
  const sp = await searchParams

  const filter: ActivityFilter = {
    action: firstParam(sp.action),
    actorName: firstParam(sp.actorName),
    from: firstParam(sp.from),
    to: firstParam(sp.to),
  }

  const entries = await searchActivity(filter, 200)
  const activeFilters = [filter.action, filter.actorName, filter.from, filter.to].filter(
    Boolean,
  ).length

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="التدقيق"
        title="سجل النشاط"
        description={`آخر ${entries.length.toLocaleString("ar-SA-u-nu-latn")} عملية — سجل تدقيق كامل لكل الإجراءات الحساسة على المنصة.`}
      />

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between gap-2 border-b border-border/60 pb-3">
          <div className="inline-flex items-center gap-2">
            <Filter className="size-4 text-primary" />
            <h2 className="font-heading text-sm font-bold text-foreground">
              عوامل التصفية
            </h2>
            {activeFilters > 0 && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                {activeFilters}
              </span>
            )}
          </div>
          {activeFilters > 0 && (
            <Link
              href="/admin/activity"
              className="text-xs font-medium text-primary hover:underline"
            >
              مسح الكل
            </Link>
          )}
        </div>
        <form
          method="get"
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          <Field label="نوع الإجراء">
            <div className="relative">
              <Search className="pointer-events-none absolute start-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                name="action"
                defaultValue={filter.action ?? ""}
                placeholder="case.create"
                dir="ltr"
                className="h-9 ps-9 font-mono text-xs"
              />
            </div>
          </Field>
          <Field label="اسم المنفّذ">
            <div className="relative">
              <UserIcon className="pointer-events-none absolute start-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                name="actorName"
                defaultValue={filter.actorName ?? ""}
                placeholder="اسم المستخدم…"
                className="h-9 ps-9"
              />
            </div>
          </Field>
          <Field label="من تاريخ">
            <Input
              type="date"
              name="from"
              defaultValue={filter.from ?? ""}
              className="h-9"
            />
          </Field>
          <Field label="إلى تاريخ">
            <Input
              type="date"
              name="to"
              defaultValue={filter.to ?? ""}
              className="h-9"
            />
          </Field>
          <div className="sm:col-span-2 lg:col-span-4">
            <Button type="submit" size="sm">
              <Filter className="size-4" />
              تطبيق الفلاتر
            </Button>
          </div>
        </form>
      </Card>

      <Card className="overflow-hidden p-0">
        {entries.length === 0 ? (
          <div className="p-10">
            <EmptyState
              icon={History}
              title="لا يوجد نشاط مطابق"
              description="جرّب تعديل الفلاتر أو توسيع نطاق التاريخ."
              tone="muted"
            />
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {entries.map((e) => {
              const actorInitial = e.actorName?.trim().charAt(0) ?? "؟"
              return (
                <li
                  key={e.id}
                  className="flex items-start gap-3 px-5 py-3 transition-colors hover:bg-muted/25"
                >
                  <span
                    aria-hidden="true"
                    className={
                      "mt-2 size-2 shrink-0 rounded-full ring-2 ring-background " +
                      actionTone(e.action)
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {actionAr(e.action)}
                        </p>
                        <p
                          dir="ltr"
                          className="mt-0.5 font-mono text-[10px] text-muted-foreground/70"
                        >
                          {e.action}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3 text-[11px]">
                        {e.entityType && (
                          <span className="rounded-full bg-muted px-2 py-0.5 font-medium text-muted-foreground">
                            {e.entityType}
                          </span>
                        )}
                        <span className="whitespace-nowrap tabular-nums text-muted-foreground">
                          {new Date(e.createdAt).toLocaleString("ar-SA-u-nu-latn")}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary ring-1 ring-primary/15">
                        {actorInitial}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {e.actorName ?? "النظام"}
                      </span>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  )
}
