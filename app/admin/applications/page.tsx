import { desc, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { providerApplication, user as userT } from "@/lib/db/schema"
import { Inbox } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/empty-state"
import { ApplicationReview } from "@/components/admin/application-review"
import { requirePermissionPage } from "@/lib/session"
import { PERMISSIONS } from "@/lib/rbac"

export const dynamic = "force-dynamic"
export const metadata = { title: "طلبات الانضمام" }

type Payload = {
  name?: string
  title?: string
  country?: string
  city?: string
  yearsExperience?: number
  languages?: string[]
  procedures?: string[]
  license?: { number?: string; issuingAuthority?: string; expiryDate?: string }
}

export default async function ApplicationsPage() {
  await requirePermissionPage(PERMISSIONS.PROVIDER_REVIEW)
  const rows = await db
    .select({
      id: providerApplication.id,
      status: providerApplication.status,
      payload: providerApplication.payload,
      submittedAt: providerApplication.submittedAt,
      notes: providerApplication.reviewerNotes,
      applicantName: userT.name,
      applicantEmail: userT.email,
    })
    .from(providerApplication)
    .innerJoin(userT, eq(providerApplication.applicantUserId, userT.id))
    .orderBy(desc(providerApplication.createdAt))
    .limit(50)

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-foreground">
        طلبات الانضمام
      </h1>

      {rows.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="لا توجد طلبات حتى الآن"
          description="ستظهر هنا طلبات انضمام الأطباء والمراكز عند تقديمها."
        />
      ) : (
        <div className="space-y-4">
          {rows.map((r) => {
            const p = (r.payload ?? {}) as Payload
            const open = ["SUBMITTED", "UNDER_REVIEW", "NEEDS_CHANGES"].includes(
              r.status,
            )
            return (
              <Card key={r.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-heading text-lg font-bold text-foreground">
                        {p.name ?? r.applicantName}
                      </h3>
                      <StatusBadge status={r.status} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {p.title} · {p.city}، {p.country} · خبرة {p.yearsExperience ?? 0} سنة
                    </p>
                    <p dir="ltr" className="text-right text-xs text-muted-foreground">
                      {r.applicantEmail}
                    </p>
                  </div>
                </div>

                <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                  <Info label="اللغات" value={(p.languages ?? []).join("، ") || "—"} />
                  <Info
                    label="الإجراءات"
                    value={(p.procedures ?? []).join("، ") || "—"}
                  />
                  <Info
                    label="الترخيص"
                    value={
                      p.license
                        ? `${p.license.number ?? "—"} · ${p.license.issuingAuthority ?? ""}`
                        : "—"
                    }
                  />
                  <Info
                    label="انتهاء الترخيص"
                    value={p.license?.expiryDate ?? "—"}
                  />
                </dl>

                {r.notes && (
                  <p className="mt-3 rounded-lg bg-muted/60 p-2 text-sm text-muted-foreground">
                    ملاحظة المراجع: {r.notes}
                  </p>
                )}

                {open && <ApplicationReview applicationId={r.id} />}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-1.5">
      <dt className="font-medium text-foreground">{label}:</dt>
      <dd className="text-muted-foreground">{value}</dd>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    SUBMITTED: { label: "تم الإرسال", variant: "secondary" },
    UNDER_REVIEW: { label: "قيد المراجعة", variant: "secondary" },
    NEEDS_CHANGES: { label: "بحاجة لتعديل", variant: "outline" },
    APPROVED: { label: "تمت الموافقة", variant: "default" },
    REJECTED: { label: "مرفوض", variant: "destructive" },
  }
  const s = map[status] ?? { label: status, variant: "outline" as const }
  return <Badge variant={s.variant}>{s.label}</Badge>
}
