"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { assignSafetyAlert } from "@/lib/actions/safety"

export function SafetyAssignSelect({
  alertId,
  currentAssigneeId,
  options,
}: {
  alertId: string
  currentAssigneeId: string | null
  options: { id: string; name: string }[]
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [value, setValue] = useState(currentAssigneeId ?? "")

  async function onChange(next: string) {
    if (!next) return
    setValue(next)
    setBusy(true)
    const res = await assignSafetyAlert({ alertId, assignedTo: next })
    setBusy(false)
    if (res.ok) router.refresh()
  }

  return (
    <select
      value={value}
      disabled={busy}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 rounded-lg border border-input bg-background px-2 text-xs text-foreground disabled:opacity-50"
      aria-label="تعيين مسؤول"
    >
      <option value="">لم يُعيَّن أحد</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>{o.name}</option>
      ))}
    </select>
  )
}
