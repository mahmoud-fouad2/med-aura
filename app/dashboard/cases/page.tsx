import Link from "next/link"
import {
  FileText,
  Plus,
  Sparkles,
  ChevronLeft,
  Activity,
  CheckCircle2,
} from "lucide-react"
import { getCurrentUser } from "@/lib/session"
import { listCasesForPatient } from "@/lib/data/cases"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { PageHeader } from "@/components/dashboard/page-header"
import { MetricCard } from "@/components/dashboard/metric-card"
import { SectionCard } from "@/components/dashboard/section-card"
import { caseStatusAr } from "@/lib/status-labels"

export const dynamic = "force-dynamic"

const ACTIVE = new Set([
  "SUBMITTED",
  "MATCHING",
  "SHARED_WITH_PROVIDER",
  "UNDER_REVIEW",
  "MORE_INFORMATION_REQUIRED",
  "CONSULTATION_REQUIRED",
  "CONSULTATION_BOOKED",
  "CONSULTATION_COMPLETED",
  "TREATMENT_PLAN_ISSUED",
  "QUOTE_ISSUED",
  "PATIENT_REVIEWING",
  "QUOTE_ACCEPTED",
  "DEPOSIT_PAID",
  "MEDICALLY_APPROVED",
  "CENTER_CONFIRMED",
  "FULLY_PAID",
  "PROCEDURE_CONFIRMED",
  "PROCEDURE_COMPLETED",
  "FOLLOW_UP",
])
const CLOSED = new Set(["CLOSED", "CANCELLED"])
const NEEDS_ATTENTION = new Set([
  "MORE_INFORMATION_REQUIRED",
  "PATIENT_REVIEWING",
  "QUOTE_ISSUED",
])

function stagePill(status: string) {
  if (CLOSED.has(status))
    return "bg-muted text-muted-foreground"
  if (NEEDS_ATTENTION.has(status))
    return "bg-warning/15 text-warning-foreground"
  if (status === "PROCEDURE_COMPLETED" || status === "FULLY_PAID")
    return "bg-success/10 text-success"
  return "bg-primary/10 text-primary"
}

export default async function CasesPage() {
  const user = (await getCurrentUser())!
  const cases = await listCasesForPatient(user.id)

  const active = cases.filter((c) => ACTIVE.has(c.status))
  const closed = cases.filter((c) => CLOSED.has(c.status))
  const attention = cases.filter((c) => NEEDS_ATTENTION.has(c.status))

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="ملفاتي"
        title="حالاتي"
        description="كل حالاتك التجميلية على Med Aura مع مرحلتها الحالية وآخر التحديثات."
        actions={
          <Button
            render={
              <Link href="/dashboard/cases/new">
                <Plus className="size-4" />
                حالة جديدة
              </Link>
            }
          />
        }
      />

      {cases.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          <MetricCard
            icon={Activity}
            label="حالات نشطة"
            value={active.length.toLocaleString("ar-SA")}
            hint={active.length === 0 ? "لا حالات نشطة" : "في مرحلة قيد التقدّم"}
            tone={active.length > 0 ? "primary" : "neutral"}
            emphasis
          />
          <MetricCard
            icon={Sparkles}
            label="تحتاج انتباهك"
            value={attention.length.toLocaleString("ar-SA")}
            hint={
              attention.length === 0
                ? "كل شيء على ما يرام"
                : "بحاجة لإجراء منك"
            }
            tone={attention.length > 0 ? "warning" : "success"}
            emphasis
          />
          <MetricCard
            icon={CheckCircle2}
            label="حالات مغلقة"
            value={closed.length.toLocaleString("ar-SA")}
            hint="اكتملت أو أُلغيت"
            tone="neutral"
            emphasis
          />
        </div>
      )}

      {cases.length === 0 ? (
        <Card className="p-12">
          <EmptyState
            icon={FileText}
            title="لم تُنشئ أي حالة بعد"
            description="ابدأ رحلتك التجميلية بإنشاء حالة، شارك صورك بأمان، واستلم خطة وسعرًا واضحًا من طبيب موثّق."
            action={
              <Button
                render={
                  <Link href="/dashboard/cases/new">
                    <Sparkles className="size-4" />
                    أنشئ حالتك الأولى
                  </Link>
                }
              />
            }
          />
        </Card>
      ) : (
        <SectionCard
          icon={FileText}
          title="جميع الحالات"
          description={`${cases.length.toLocaleString("ar-SA")} ${cases.length === 1 ? "حالة" : "حالة"} بترتيب من الأحدث`}
        >
          <ul className="divide-y divide-border/60">
            {cases.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/dashboard/cases/${c.id}`}
                  className="group flex items-center justify-between gap-4 px-5 py-4 text-sm transition-colors hover:bg-muted/25"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
                      <Sparkles className="size-[18px]" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-heading font-bold text-foreground">
                        {c.procedureName}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {c.doctorName ?? "بانتظار تعيين طبيب"}
                      </p>
                      <div
                        dir="ltr"
                        className="mt-1 font-mono text-[10px] text-muted-foreground"
                      >
                        {c.reference}
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span
                      className={
                        "rounded-full px-2.5 py-0.5 text-[11px] font-medium " +
                        stagePill(c.status)
                      }
                    >
                      {caseStatusAr(c.status)}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      {new Date(c.createdAt).toLocaleDateString("ar-SA")}
                      <ChevronLeft className="size-3 text-muted-foreground transition-transform group-hover:-translate-x-0.5 rtl:rotate-0 ltr:rotate-180" />
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}
    </div>
  )
}
