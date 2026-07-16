"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Loader2, PhoneOff, ShieldCheck, Video } from "lucide-react"
import type { DailyCall } from "@daily-co/daily-js"
import { Card } from "@/components/ui/card"

/**
 * Web consultation surface (doctor side primarily — same room as the app).
 * Pre-join is honest server state; the call itself embeds the provider's
 * browser client with a short-lived token minted by our backend. The heavy
 * SDK is imported only at join time.
 */

type VideoState = {
  configured: boolean
  allowed: boolean
  reason: string | null
  joinAvailableFrom: string | null
  doctorName: string
  counterpartJoined: boolean
}

const REASON_COPY: Record<string, string> = {
  too_early: "الاستشارة غير متاحة بعد. تُفتح غرفة الانتظار قبل الموعد.",
  expired: "انتهت نافذة الدخول لهذه الاستشارة.",
  cancelled: "هذا الموعد لم يعد قائمًا.",
  not_confirmed: "بانتظار تأكيد الموعد قبل تفعيل الاستشارة.",
  disabled: "الاستشارات عن بُعد غير مفعّلة حاليًا.",
  not_video: "هذا الموعد ليس استشارة عن بُعد.",
}

type Phase = "prejoin" | "joining" | "call" | "ended"

export function WebCall({
  appointmentId,
  counterpartName,
  role,
}: {
  appointmentId: string
  counterpartName: string
  role: "patient" | "doctor" | "staff"
}) {
  const [phase, setPhase] = useState<Phase>("prejoin")
  const [state, setState] = useState<VideoState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const frameRef = useRef<DailyCall | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const base = `/api/mobile/v1/appointments/${appointmentId}/video`

  const refreshState = useCallback(async () => {
    try {
      const res = await fetch(base, { cache: "no-store" })
      const body = await res.json()
      if (body?.ok) setState(body.data as VideoState)
    } catch {
      /* keep the previous state; the join path re-checks everything */
    }
  }, [base])

  // Poll while waiting so the join button appears the moment the window opens.
  useEffect(() => {
    if (phase !== "prejoin") return
    void refreshState()
    const timer = setInterval(() => void refreshState(), 20_000)
    return () => clearInterval(timer)
  }, [phase, refreshState])

  const recordEvent = useCallback(
    (event: string) => {
      void fetch(`${base}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event, deviceType: "web" }),
      }).catch(() => undefined)
    },
    [base],
  )

  const teardown = useCallback(() => {
    const frame = frameRef.current
    frameRef.current = null
    if (frame) {
      void frame.leave().catch(() => undefined)
      frame.destroy()
    }
  }, [])

  useEffect(() => teardown, [teardown])

  const join = useCallback(async () => {
    if (frameRef.current) return
    setError(null)
    setPhase("joining")
    try {
      const sessionRes = await fetch(`${base}/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      })
      const sessionBody = await sessionRes.json()
      if (!sessionBody?.ok) throw new Error(sessionBody?.error)

      const tokenRes = await fetch(`${base}/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      })
      const tokenBody = await tokenRes.json()
      if (!tokenBody?.ok || !tokenBody.data?.roomUrl) throw new Error(tokenBody?.error)

      // The provider SDK loads only now — never on page load.
      const { default: DailyIframe } = await import("@daily-co/daily-js")
      const container = containerRef.current
      if (!container) throw new Error()
      const frame = DailyIframe.createFrame(container, {
        showLeaveButton: true,
        showFullscreenButton: true,
        iframeStyle: {
          width: "100%",
          height: "100%",
          border: "0",
          borderRadius: "16px",
        },
      })
      frameRef.current = frame
      frame.on("joined-meeting", () => recordEvent("joined"))
      frame.on("left-meeting", () => {
        recordEvent(role === "patient" ? "left" : "ended")
        teardown()
        setPhase("ended")
      })
      frame.on("error", () => {
        teardown()
        setPhase("prejoin")
        setError("تعذر تجهيز الاستشارة الآن. حاول مرة أخرى.")
      })

      setPhase("call")
      await frame.join({ url: tokenBody.data.roomUrl, token: tokenBody.data.token })
    } catch (err) {
      teardown()
      setPhase("prejoin")
      setError(
        err instanceof Error && err.message
          ? err.message
          : "تعذر تجهيز الاستشارة الآن. حاول مرة أخرى.",
      )
    }
  }, [base, recordEvent, role, teardown])

  if (phase === "ended") {
    return (
      <Card className="mx-auto max-w-xl p-10 text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-success/10 text-success">
          <ShieldCheck className="size-7" />
        </span>
        <h2 className="mt-4 font-heading text-xl font-bold">انتهت الاستشارة</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          تم تسجيل حالة المكالمة. يمكنك المتابعة من لوحة المواعيد.
        </p>
        <Link
          href="/dashboard/appointments"
          className="mt-6 inline-flex rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          العودة إلى المواعيد
        </Link>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* The call stage — mounted before joining so the frame has a home. */}
      <div
        ref={containerRef}
        className={
          (phase === "call" || phase === "joining"
            ? "h-[70vh] min-h-[420px]"
            : "hidden") + " overflow-hidden rounded-2xl bg-foreground/95 shadow-elegant-lg"
        }
      />
      {phase === "joining" ? (
        <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          جارٍ تجهيز الاستشارة…
        </p>
      ) : null}

      {phase === "prejoin" ? (
        <Card className="mx-auto max-w-xl space-y-5 p-8">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Video className="size-5" />
            </span>
            <div>
              <h2 className="font-heading text-lg font-bold">استشارة عن بُعد</h2>
              <p className="text-sm text-muted-foreground">مع {counterpartName}</p>
            </div>
          </div>

          <div
            className={
              "rounded-xl px-4 py-3 text-sm " +
              (state?.allowed
                ? "bg-success/10 text-success"
                : "bg-secondary text-muted-foreground")
            }
          >
            {state == null
              ? "جارٍ التحقق من حالة الاستشارة…"
              : state.allowed
                ? state.counterpartJoined
                  ? "الطرف الآخر في غرفة الانتظار — يمكنك الدخول الآن."
                  : "الاستشارة متاحة الآن — يمكنك الدخول."
                : (REASON_COPY[state.reason ?? ""] ?? "الاستشارة غير متاحة حاليًا.")}
          </div>

          {error ? (
            <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <button
            type="button"
            disabled={!state?.allowed}
            onClick={() => void join()}
            className="w-full rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            دخول الاستشارة
          </button>

          <p className="text-center text-xs text-muted-foreground">
            سيطلب المتصفح إذن الكاميرا والمايكروفون عند الدخول.
          </p>
        </Card>
      ) : null}
    </div>
  )
}
