"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ShieldCheck, ShieldOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { grantCaseConsent, revokeCaseConsent } from "@/lib/actions/cases"

export function ConsentManager({
  caseId,
  doctorName,
  active,
}: {
  caseId: string
  doctorName: string | null
  active: boolean
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function grant() {
    setBusy(true)
    setError(null)
    const res = await grantCaseConsent(caseId)
    setBusy(false)
    if (!res.ok) return setError(res.error)
    router.refresh()
  }

  async function revoke() {
    setBusy(true)
    setError(null)
    const res = await revokeCaseConsent(caseId)
    setBusy(false)
    if (!res.ok) return setError(res.error)
    router.refresh()
  }

  return (
    <div className="space-y-3">
      {active ? (
        <div className="flex items-start gap-2 rounded-lg bg-success/10 p-3 text-sm">
          <ShieldCheck className="mt-0.5 size-4 text-success" />
          <p className="text-foreground">
            منحت <strong>{doctorName}</strong> صلاحية الاطلاع على هذه الحالة
            وملفاتها. يمكنك سحب الإذن في أي وقت.
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          لم يطّلع الطبيب على ملفاتك بعد. امنح الإذن ليتمكن من مراجعة حالتك قبل
          الاستشارة.
        </p>
      )}

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {active ? (
        <Button variant="outline" size="sm" disabled={busy} onClick={revoke}>
          <ShieldOff className="size-4" /> سحب الإذن
        </Button>
      ) : (
        <Button size="sm" disabled={busy} onClick={grant}>
          <ShieldCheck className="size-4" /> منح الطبيب صلاحية الاطلاع
        </Button>
      )}
    </div>
  )
}
