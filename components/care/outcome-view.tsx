import { ClipboardCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { suitabilityAr } from "@/lib/status-labels"
import type { OutcomePublic } from "@/lib/data/care"

/** Patient-safe rendering of the consultation outcome (no internal notes). */
export function OutcomeView({ outcome }: { outcome: OutcomePublic }) {
  const tone =
    outcome.suitabilityStatus === "NOT_SUITABLE" ||
    outcome.suitabilityStatus === "REFERRED_ELSEWHERE"
      ? "destructive"
      : outcome.suitabilityStatus === "SUITABLE_PRELIMINARILY"
        ? "default"
        : "secondary"

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <ClipboardCheck className="size-5 text-primary" />
        <h2 className="font-heading text-lg font-bold text-foreground">
          نتيجة الاستشارة
        </h2>
        <Badge variant={tone}>{suitabilityAr(outcome.suitabilityStatus)}</Badge>
      </div>
      {outcome.patientVisibleNotes ? (
        <p className="leading-relaxed text-foreground/85">
          {outcome.patientVisibleNotes}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          سجّل الطبيب نتيجة استشارتك. لمزيد من التفاصيل تواصل عبر حالتك.
        </p>
      )}
      {outcome.completedAt && (
        <p className="text-xs text-muted-foreground">
          {new Date(outcome.completedAt).toLocaleDateString("ar-SA-u-nu-latn")}
        </p>
      )}
      <p className="rounded-lg bg-muted/50 p-3 text-xs leading-relaxed text-muted-foreground">
        النتائج تختلف من حالة لأخرى، ويظل القرار النهائي خاضعًا للفحص الطبي
        والاختبارات المطلوبة.
      </p>
    </div>
  )
}
