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
  locale = "ar",
  className,
}: {
  status: "unavailable" | "error"
  requestId?: string
  locale?: "ar" | "en"
  className?: string
}) {
  const isUnavailable = status === "unavailable"
  const isAr = locale === "ar"
  return (
    <div
      role="status"
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
          {isUnavailable
            ? isAr ? "تعذّر تحميل النتائج مؤقتًا" : "Results are temporarily unavailable"
            : isAr ? "حدث خطأ غير متوقع" : "Something went wrong"}
        </h3>
        <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted-foreground">
          {isUnavailable
            ? isAr
              ? "يرجى المحاولة بعد قليل."
              : "Please try again in a moment."
            : isAr
              ? "نعتذر عن ذلك، يمكنك إعادة المحاولة الآن."
              : "Sorry about that. You can try again now."}
        </p>
        {requestId && (
          <p className="text-xs text-muted-foreground/70">
            {isAr ? "رمز المرجع" : "Reference"}: {requestId}
          </p>
        )}
      </div>
      <RetryButton label={isAr ? "إعادة المحاولة" : "Try again"} />
    </div>
  )
}
