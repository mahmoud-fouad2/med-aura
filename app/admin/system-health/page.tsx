import { CheckCircle2, XCircle, AlertTriangle, Database, Plug } from "lucide-react"
import { requirePermissionPage } from "@/lib/session"
import { PERMISSIONS } from "@/lib/rbac"
import { getMigrationStatus } from "@/lib/db/migration-status"
import {
  isStripeConfigured,
  isStripeWebhookConfigured,
  isR2Configured,
  isEmailConfigured,
  isVideoConfigured,
  isRecaptchaConfigured,
} from "@/lib/env"
import { Card } from "@/components/ui/card"

export const dynamic = "force-dynamic"
export const metadata = { title: "جاهزية المنصة" }

export default async function SystemHealthPage() {
  await requirePermissionPage(PERMISSIONS.ADMIN_ACCESS)
  const db = await getMigrationStatus()

  const integrations = [
    { label: "بوابة الدفع الإلكتروني", ok: isStripeConfigured() },
    { label: "تحديثات الدفع التلقائية", ok: isStripeWebhookConfigured() },
    { label: "التخزين السحابي للملفات", ok: isR2Configured() },
    { label: "البريد", ok: isEmailConfigured() },
    { label: "الفيديو", ok: isVideoConfigured() },
    { label: "حماية النماذج", ok: isRecaptchaConfigured() },
  ]

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-foreground">جاهزية المنصة</h1>

      {db.configured && db.connected && !db.ready && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm">
          <AlertTriangle className="mt-0.5 size-5 text-destructive" />
          <div>
            <p className="font-medium text-foreground">
              تحديثات بنية بانتظار التطبيق
            </p>
            <p className="text-muted-foreground">
              توجد {db.pending} تحديثات لم تكتمل بعد. تواصل مع فريق الإعداد
              لإكمال التجهيز قبل استخدام الميزات الجديدة.
            </p>
          </div>
        </div>
      )}

      <Card className="space-y-4 p-6">
        <h2 className="flex items-center gap-2 font-heading text-lg font-bold text-foreground">
          <Database className="size-5 text-primary" /> حفظ البيانات
        </h2>
        <dl className="space-y-2 text-sm">
          <HealthRow label="الإعداد الأساسي" ok={db.configured} />
          <HealthRow
            label="الاتصال"
            ok={db.connected}
            detail={
              db.connected ? undefined : "تعذّر الوصول لخدمة حفظ البيانات حاليًا"
            }
          />
          <Row label="التحديثات المكتملة" value={`${db.appliedCount} / ${db.journalCount}`} />
          <Row label="بانتظار التطبيق" value={String(db.pending)} />
          <HealthRow label="جاهزة" ok={db.ready} />
        </dl>
      </Card>

      <Card className="space-y-4 p-6">
        <h2 className="flex items-center gap-2 font-heading text-lg font-bold text-foreground">
          <Plug className="size-5 text-primary" /> الخدمات الأساسية
        </h2>
        <dl className="space-y-2 text-sm">
          {integrations.map((i) => (
            <HealthRow key={i.label} label={i.label} ok={i.ok} okLabel="مفعّلة" badLabel="غير مهيأة" />
          ))}
        </dl>
      </Card>
    </div>
  )
}

function HealthRow({
  label,
  ok,
  detail,
  okLabel = "سليم",
  badLabel = "غير متاح",
}: {
  label: string
  ok: boolean
  detail?: string
  okLabel?: string
  badLabel?: string
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-muted-foreground">
        {label}
        {detail && <span className="block text-xs text-muted-foreground/70">{detail}</span>}
      </dt>
      <dd className={`inline-flex items-center gap-1 font-medium ${ok ? "text-success" : "text-destructive"}`}>
        {ok ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}
        {ok ? okLabel : badLabel}
      </dd>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </div>
  )
}
