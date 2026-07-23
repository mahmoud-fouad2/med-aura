"use client"

import { useState, useTransition } from "react"
import { Copy, Check, Video, Square } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { markUserAsTestAccount } from "@/lib/actions/video-qa"

type TestUser = { id: string; name: string; email: string }

type SessionResult = {
  roomName: string
  expiresAt: string
  patient: { name: string; deepLink: string }
  doctor: { name: string; deepLink: string }
}

export function VideoQaPanel({
  testPatients,
  testDoctors,
}: {
  testPatients: TestUser[]
  testDoctors: TestUser[]
}) {
  const [patientId, setPatientId] = useState(testPatients[0]?.id ?? "")
  const [doctorId, setDoctorId] = useState(testDoctors[0]?.id ?? "")
  const [session, setSession] = useState<SessionResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [markEmail, setMarkEmail] = useState("")
  const [markPending, startMark] = useTransition()
  const [markNotice, setMarkNotice] = useState<string | null>(null)

  const createSession = async () => {
    if (!patientId || !doctorId) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch("/api/dev/video-qa/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientUserId: patientId, doctorUserId: doctorId }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body?.error ?? "تعذّر إنشاء الجلسة.")
      setSession(body)
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذّر إنشاء الجلسة.")
    } finally {
      setBusy(false)
    }
  }

  const endSession = async () => {
    if (!session) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/dev/video-qa/sessions/${encodeURIComponent(session.roomName)}`,
        { method: "DELETE" },
      )
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error ?? "تعذّر إنهاء الجلسة.")
      }
      setSession(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذّر إنهاء الجلسة.")
    } finally {
      setBusy(false)
    }
  }

  const markTest = () => {
    setMarkNotice(null)
    startMark(async () => {
      const result = await markUserAsTestAccount({ email: markEmail.trim() })
      if (result.ok && result.data) {
        setMarkNotice(
          `تم تحديد ${result.data.name} (${result.data.role === "patient" ? "مريض" : "طبيب"}) كحساب اختبار.`,
        )
        setMarkEmail("")
      } else if (!result.ok) {
        setMarkNotice(result.error)
      }
    })
  }

  if (testPatients.length === 0 || testDoctors.length === 0) {
    return (
      <Card className="space-y-4 p-6">
        <p className="text-sm text-muted-foreground">
          لا توجد بعد حسابات اختبار كافية (يلزم حساب مريض واحد على الأقل وحساب طبيب واحد على
          الأقل بعلامة isTest). حوّل حسابًا موجودًا بإدخال بريده الإلكتروني:
        </p>
        <div className="flex max-w-md items-center gap-2">
          <Input
            type="email"
            placeholder="test-patient@example.com"
            value={markEmail}
            onChange={(e) => setMarkEmail(e.target.value)}
          />
          <Button onClick={markTest} disabled={markPending || !markEmail} size="sm">
            تحويل إلى اختبار
          </Button>
        </div>
        {markNotice ? <p className="text-sm text-muted-foreground">{markNotice}</p> : null}
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-4 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1.5 text-sm">
            <span className="font-medium text-foreground">مريض الاختبار</span>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              disabled={Boolean(session)}
            >
              {testPatients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.email}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5 text-sm">
            <span className="font-medium text-foreground">طبيب الاختبار</span>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
              disabled={Boolean(session)}
            >
              {testDoctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} — {d.email}
                </option>
              ))}
            </select>
          </label>
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {!session ? (
          <Button onClick={() => void createSession()} disabled={busy} className="gap-2">
            <Video className="size-4" />
            إنشاء جلسة فيديو تجريبية
          </Button>
        ) : (
          <div className="space-y-4">
            <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
              الغرفة: <span className="font-mono">{session.roomName}</span> — تنتهي تلقائيًا{" "}
              {new Date(session.expiresAt).toLocaleTimeString("ar-SA-u-nu-latn", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
            <JoinLinkRow label={`رابط دخول المريض (${session.patient.name})`} link={session.patient.deepLink} />
            <JoinLinkRow label={`رابط دخول الطبيب (${session.doctor.name})`} link={session.doctor.deepLink} />
            <Button
              onClick={() => void endSession()}
              disabled={busy}
              variant="destructive"
              className="gap-2"
            >
              <Square className="size-4" />
              إنهاء وحذف جلسة الاختبار
            </Button>
          </div>
        )}
      </Card>

      <Card className="space-y-3 p-6">
        <p className="text-sm font-medium text-foreground">تحويل حساب آخر إلى حساب اختبار</p>
        <div className="flex max-w-md items-center gap-2">
          <Input
            type="email"
            placeholder="test-doctor@example.com"
            value={markEmail}
            onChange={(e) => setMarkEmail(e.target.value)}
          />
          <Button onClick={markTest} disabled={markPending || !markEmail} size="sm">
            تحويل
          </Button>
        </div>
        {markNotice ? <p className="text-sm text-muted-foreground">{markNotice}</p> : null}
      </Card>
    </div>
  )
}

function JoinLinkRow({ label, link }: { label: string; link: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 truncate rounded-md border border-input bg-muted/30 px-3 py-2 text-xs" dir="ltr">
          {link}
        </code>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            void navigator.clipboard.writeText(link)
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
          }}
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        </Button>
      </div>
    </div>
  )
}
