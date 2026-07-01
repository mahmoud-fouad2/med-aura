import Link from "next/link"
import { Building2 } from "lucide-react"
import { getCurrentUser, requirePermissionPage } from "@/lib/session"
import { resolveUserCenterIds, PERMISSIONS } from "@/lib/rbac"
import {
  listCenterCases,
  listCenterPeople,
  listCenterQuotes,
  listCenterBookings,
  listCenterInvoices,
  listCenterFollowUps,
  listCenterSafetyAlerts,
  listCenterReviews,
} from "@/lib/data/center-dashboard"
import { EmptyState } from "@/components/ui/empty-state"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { caseStatusAr } from "@/lib/status-labels"

export const dynamic = "force-dynamic"

export default async function CenterDashboardPage() {
  await requirePermissionPage(PERMISSIONS.CENTER_DASHBOARD_ACCESS)
  const user = (await getCurrentUser())!
  const centerIds = await resolveUserCenterIds(user.id)

  if (centerIds.length === 0) {
    return (
      <EmptyState
        icon={Building2}
        title="لا يوجد مركز مرتبط بحسابك"
        description="لم يتم ربط حسابك بأي مركز بعد."
      />
    )
  }

  const [cases, people, quotes, bookings, invoices, followUps, safetyAlerts, reviews] =
    await Promise.all([
      listCenterCases(centerIds),
      listCenterPeople(centerIds),
      listCenterQuotes(centerIds),
      listCenterBookings(centerIds),
      listCenterInvoices(centerIds),
      listCenterFollowUps(centerIds),
      listCenterSafetyAlerts(centerIds),
      listCenterReviews(centerIds),
    ])

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-foreground">لوحة المركز</h1>

      <Tabs defaultValue="cases">
        <TabsList className="flex-wrap">
          <TabsTrigger value="cases">الحالات ({cases.length})</TabsTrigger>
          <TabsTrigger value="people">الفريق ({people.length})</TabsTrigger>
          <TabsTrigger value="quotes">عروض الأسعار ({quotes.length})</TabsTrigger>
          <TabsTrigger value="bookings">حجوزات الإجراءات ({bookings.length})</TabsTrigger>
          <TabsTrigger value="invoices">الفواتير ({invoices.length})</TabsTrigger>
          <TabsTrigger value="followups">المتابعة ({followUps.length})</TabsTrigger>
          <TabsTrigger value="safety">السلامة ({safetyAlerts.length})</TabsTrigger>
          <TabsTrigger value="reviews">التقييمات ({reviews.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="cases" className="mt-4">
          {cases.length === 0 ? (
            <EmptyState icon={Building2} title="لا توجد حالات بعد" description="ستظهر هنا حالات مرضاك." />
          ) : (
            <div className="space-y-2">
              {cases.map((c) => (
                <Link key={c.id} href={`/dashboard/cases/${c.id}`}>
                  <Card className="flex flex-wrap items-center justify-between gap-2 p-4 transition-colors hover:bg-muted/40">
                    <div>
                      <p className="font-medium text-foreground">{c.patientName} — {c.procedureName}</p>
                      <p className="text-xs text-muted-foreground">{c.reference}</p>
                    </div>
                    <Badge variant="secondary">{caseStatusAr(c.status)}</Badge>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="people" className="mt-4">
          <RowList
            items={people}
            empty="لا يوجد فريق مسجّل بعد."
            render={(p) => (
              <>
                <span className="font-medium text-foreground">{p.name}</span>
                <Badge variant="outline">{p.role}</Badge>
              </>
            )}
          />
        </TabsContent>

        <TabsContent value="quotes" className="mt-4">
          <RowList
            items={quotes}
            empty="لا توجد عروض أسعار بعد."
            render={(q) => (
              <>
                <span className="font-medium text-foreground">{q.quoteNumber}</span>
                <span className="text-sm text-muted-foreground">{Number(q.total).toLocaleString("ar-SA")} {q.currency}</span>
                <Badge variant="outline">{q.status}</Badge>
              </>
            )}
          />
        </TabsContent>

        <TabsContent value="bookings" className="mt-4">
          <RowList
            items={bookings}
            empty="لا توجد حجوزات إجراءات بعد."
            linkHref={(b) => `/dashboard/cases/${b.caseId}`}
            render={(b) => (
              <>
                <span className="font-medium text-foreground">{b.patientName}</span>
                <span className="text-sm text-muted-foreground">{b.scheduledDate ?? "بدون موعد بعد"}</span>
                <Badge variant="outline">{b.status}</Badge>
              </>
            )}
          />
        </TabsContent>

        <TabsContent value="invoices" className="mt-4">
          <RowList
            items={invoices}
            empty="لا توجد فواتير بعد."
            render={(i) => (
              <>
                <span className="font-medium text-foreground">{i.invoiceNumber}</span>
                <span className="text-sm text-muted-foreground">
                  متبقي {Number(i.remainingAmount).toLocaleString("ar-SA")} {i.currency}
                </span>
                <Badge variant="outline">{i.status}</Badge>
              </>
            )}
          />
        </TabsContent>

        <TabsContent value="followups" className="mt-4">
          <RowList
            items={followUps}
            empty="لا توجد مهام متابعة بعد."
            linkHref={(f) => `/dashboard/cases/${f.caseId}`}
            render={(f) => (
              <>
                <span className="font-medium text-foreground">{f.title}</span>
                <span className="text-sm text-muted-foreground">
                  {f.dueAt ? new Date(f.dueAt).toLocaleDateString("ar-SA") : "—"}
                </span>
                <Badge variant={f.status === "MISSED" || f.status === "ESCALATED" ? "destructive" : "outline"}>
                  {f.status}
                </Badge>
              </>
            )}
          />
        </TabsContent>

        <TabsContent value="safety" className="mt-4">
          <RowList
            items={safetyAlerts}
            empty="لا توجد تنبيهات سلامة."
            linkHref={(a) => `/dashboard/cases/${a.caseId}`}
            render={(a) => (
              <>
                <span className="font-medium text-foreground">{a.summary ?? "تنبيه سلامة"}</span>
                <Badge variant="destructive">{a.severity}</Badge>
                <Badge variant="outline">{a.status}</Badge>
              </>
            )}
          />
        </TabsContent>

        <TabsContent value="reviews" className="mt-4">
          <RowList
            items={reviews}
            empty="لا توجد تقييمات بعد."
            render={(r) => (
              <>
                <span className="font-medium text-foreground">{r.overallRating}/5</span>
                <span className="truncate text-sm text-muted-foreground">{r.comment ?? "—"}</span>
              </>
            )}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function RowList<T extends { id: string }>({
  items,
  empty,
  render,
  linkHref,
}: {
  items: T[]
  empty: string
  render: (item: T) => React.ReactNode
  linkHref?: (item: T) => string
}) {
  if (items.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p>
  }
  return (
    <div className="space-y-2">
      {items.map((item) => {
        const body = (
          <Card className="flex flex-wrap items-center gap-3 p-4 transition-colors hover:bg-muted/40">
            {render(item)}
          </Card>
        )
        return linkHref ? (
          <Link key={item.id} href={linkHref(item)}>
            {body}
          </Link>
        ) : (
          <div key={item.id}>{body}</div>
        )
      })}
    </div>
  )
}
