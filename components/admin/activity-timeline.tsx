import { History } from "lucide-react"
import type { ActivityRow } from "@/lib/data/admin-activity"

/** Human label for a dotted audit action key, e.g. "case.create" → "إنشاء الحالة". */
const ACTION_LABELS: Record<string, string> = {
  "case.create": "إنشاء الحالة",
  "medical.approve": "اعتماد طبي",
  "center.confirm": "تأكيد المركز للموعد",
  "procedure.confirm": "تأكيد الإجراء",
  "procedure.complete": "اكتمال الإجراء",
  "quote.create": "إصدار عرض سعر",
  "quote.accept": "قبول عرض السعر",
  "invoice.final_payment.create": "طلب سداد المتبقي",
  "case.close": "إغلاق الحالة",
  "case.reopen": "إعادة فتح الحالة",
  "safety.create": "إنشاء تنبيه سلامة",
  "safety.escalate": "تصعيد تنبيه سلامة",
  "safety.close": "إغلاق تنبيه سلامة",
  "followup.task.create": "إنشاء مهمة متابعة",
  "followup.task.complete": "إكمال مهمة متابعة",
  "refund.request": "طلب استرجاع",
  "refund.approve": "الموافقة على الاسترجاع",
  "refund.reject": "رفض الاسترجاع",
  "auth.login": "تسجيل دخول",
  "auth.signup": "إنشاء حساب",
  "provider.approve": "اعتماد مقدّم خدمة",
  "provider.reject": "رفض طلب انضمام",
}

function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action
}

export function ActivityTimeline({ entries, emptyText }: { entries: ActivityRow[]; emptyText?: string }) {
  if (entries.length === 0) {
    return emptyText ? <p className="text-sm text-muted-foreground">{emptyText}</p> : null
  }
  return (
    <div className="space-y-3">
      <h2 className="flex items-center gap-2 font-heading text-lg font-bold text-foreground">
        <History className="size-5 text-primary" /> سجل النشاط
      </h2>
      <ol className="space-y-3 border-r-2 border-border pr-4">
        {entries.map((e) => (
          <li key={e.id} className="relative">
            <span className="absolute top-1.5 -right-[21px] size-2.5 rounded-full bg-primary" />
            <p className="text-sm font-medium text-foreground">{actionLabel(e.action)}</p>
            <p className="text-xs text-muted-foreground">
              {e.actorName ?? "النظام"} · {new Date(e.createdAt).toLocaleString("ar-SA")}
            </p>
          </li>
        ))}
      </ol>
    </div>
  )
}
