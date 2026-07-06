import Link from "next/link"
import Image from "next/image"
import { ImageOff } from "lucide-react"
import { requirePermissionPage } from "@/lib/session"
import { PERMISSIONS } from "@/lib/rbac"
import { listBeforeAfterQueue } from "@/lib/data/before-after"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { StatusBadge, type StatusTone } from "@/components/admin/status-badge"
import { ModerationActions } from "@/components/admin/before-after-moderation"

export const dynamic = "force-dynamic"
export const metadata = { title: "قبل وبعد — المراجعة" }

const STATUS_TABS: { key?: string; label: string }[] = [
  { key: "SUBMITTED", label: "قيد المراجعة" },
  { key: "APPROVED", label: "معتمدة" },
  { key: "REJECTED", label: "مرفوضة" },
  { key: "DRAFT", label: "مسودّات" },
  { key: "ARCHIVED", label: "مؤرشفة" },
]

function statusLabel(s: string): string {
  const MAP: Record<string, string> = {
    DRAFT: "مسودّة",
    SUBMITTED: "قيد المراجعة",
    APPROVED: "معتمدة",
    REJECTED: "مرفوضة",
    ARCHIVED: "مؤرشفة",
  }
  return MAP[s] ?? s
}

function statusTone(s: string): StatusTone {
  if (s === "APPROVED") return "success"
  if (s === "REJECTED") return "danger"
  if (s === "SUBMITTED") return "warning"
  return "neutral"
}

function str(v: string | string[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v
  return s?.trim() ? s : undefined
}

export default async function AdminBeforeAfterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requirePermissionPage(PERMISSIONS.BEFORE_AFTER_MODERATE)
  const sp = await searchParams
  const status = str(sp.status) ?? "SUBMITTED"

  const items = await listBeforeAfterQueue(status)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">
          قبل وبعد — المراجعة
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          الحالات لا تُنشر للعامّة إلا بعد اعتمادها هنا، ولا يمكن اعتماد أي
          حالة بدون تأكيد وجود موافقة موثقة من المريض.
        </p>
      </div>

      <Card className="p-2">
        <div className="flex flex-wrap gap-1">
          {STATUS_TABS.map((t) => (
            <Link
              key={t.key ?? "all"}
              href={`/admin/before-after?status=${t.key}`}
              className={
                "rounded-full px-3 py-1.5 text-xs font-medium transition-colors " +
                (status === t.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/70")
              }
            >
              {t.label}
            </Link>
          ))}
        </div>
      </Card>

      {items.length === 0 ? (
        <EmptyState
          icon={ImageOff}
          title={`لا توجد حالات ${statusLabel(status).toLowerCase()}`}
          description="ستظهر الحالات هنا عند إرسال الأطباء والمراكز طلباتهم للمراجعة."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <Card key={item.id} className="overflow-hidden p-0">
              <div className="grid grid-cols-2 gap-px bg-border">
                <MediaTile url={item.beforeUrl} label="قبل" />
                <MediaTile url={item.afterUrl} label="بعد" />
              </div>
              <div className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-primary">
                      {item.procedureNameAr}
                    </p>
                    <h3 className="font-heading font-bold text-foreground">
                      {item.titleAr}
                    </h3>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {item.doctorName ?? item.centerName ?? "—"}
                    </p>
                  </div>
                  <StatusBadge
                    tone={statusTone(item.status)}
                    label={statusLabel(item.status)}
                  />
                </div>

                <div className="flex items-center gap-2 text-[11px]">
                  {item.consentGranted ? (
                    <span className="rounded-full bg-success/10 px-2 py-0.5 font-medium text-success">
                      موافقة موثقة
                    </span>
                  ) : (
                    <span className="rounded-full bg-destructive/10 px-2 py-0.5 font-medium text-destructive">
                      بلا موافقة
                    </span>
                  )}
                  <span className="text-muted-foreground">
                    {new Date(item.createdAt).toLocaleDateString("ar-SA-u-nu-latn")}
                  </span>
                </div>

                {item.rejectionReason && (
                  <p className="rounded-md bg-destructive/5 p-2 text-[11px] text-destructive">
                    سبب الرفض السابق: {item.rejectionReason}
                  </p>
                )}

                <ModerationActions
                  caseId={item.id}
                  status={item.status}
                  consentGranted={item.consentGranted}
                />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function MediaTile({
  url,
  label,
}: {
  url: string | null
  label: string
}) {
  return (
    <div className="relative aspect-square bg-muted">
      {url ? (
        <Image
          src={url}
          alt={label}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 50vw, 200px"
          draggable={false}
        />
      ) : (
        <div className="flex h-full items-center justify-center text-muted-foreground">
          <ImageOff className="size-5" />
        </div>
      )}
      <span className="absolute start-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white">
        {label}
      </span>
    </div>
  )
}
