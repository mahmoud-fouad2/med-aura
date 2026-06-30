import { CloudOff, TriangleAlert } from "lucide-react"
import { RetryButton } from "@/components/ui/retry-button"

/**
 * Renders the non-success states of a {@link QueryResult} with human, Arabic
 * messages — no technical detail. `unavailable` = temporary load failure;
 * `error` = unexpected error with a retry. Use for `status !== "ok"`.
 */
export function DataState({
  status,
  requestId,
  className,
}: {
  status: "unavailable" | "error"
  requestId?: string
  className?: string
}) {
  const isUnavailable = status === "unavailable"
  return (
    <div
      className={
        "flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-14 text-center " +
        (className ?? "")
      }
    >
      <span className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        {isUnavailable ? <CloudOff className="size-7" /> : <TriangleAlert className="size-7" />}
      </span>
      <div className="space-y-1">
        <h3 className="font-heading text-lg font-bold text-foreground">
          {isUnavailable ? "تعذّر تحميل النتائج مؤقتًا" : "حدث خطأ غير متوقع"}
        </h3>
        <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted-foreground">
          {isUnavailable
            ? "يرجى المحاولة لاحقًا. نعمل على عودة الخدمة في أسرع وقت."
            : "نعتذر عن ذلك، يمكنك إعادة المحاولة الآن."}
        </p>
        {requestId && (
          <p className="text-xs text-muted-foreground/70">رمز المرجع: {requestId}</p>
        )}
      </div>
      <RetryButton />
    </div>
  )
}
