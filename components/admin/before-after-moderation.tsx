"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, XCircle, Archive } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  moderateApprove,
  moderateReject,
  archiveBeforeAfterCase,
} from "@/lib/actions/before-after"

export function ModerationActions({
  caseId,
  status,
  consentGranted,
}: {
  caseId: string
  status: string
  consentGranted: boolean
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [showReject, setShowReject] = useState(false)
  const [reason, setReason] = useState("")

  function onApprove() {
    if (!consentGranted) {
      toast.error("لا يمكن الاعتماد قبل تأكيد وجود موافقة موثقة.")
      return
    }
    start(async () => {
      const res = await moderateApprove(caseId)
      if (res.ok) {
        toast.success("تم الاعتماد.")
        router.refresh()
      } else {
        toast.error(res.error)
      }
    })
  }

  function onReject() {
    if (reason.trim().length < 3) {
      toast.error("يرجى إدخال سبب الرفض.")
      return
    }
    start(async () => {
      const res = await moderateReject(caseId, reason.trim())
      if (res.ok) {
        toast.success("تم الرفض مع تسجيل السبب.")
        setShowReject(false)
        setReason("")
        router.refresh()
      } else {
        toast.error(res.error)
      }
    })
  }

  function onArchive() {
    if (!confirm("سيتم إخفاء الحالة عن الواجهة العامة. تأكيد؟")) return
    start(async () => {
      const res = await archiveBeforeAfterCase(caseId)
      if (res.ok) {
        toast.success("تم الأرشفة.")
        router.refresh()
      } else {
        toast.error(res.error)
      }
    })
  }

  if (status === "SUBMITTED") {
    if (showReject) {
      return (
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="سبب الرفض…"
            className="h-8 min-w-[220px] flex-1 rounded-md border border-input bg-background px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
          />
          <Button
            variant="destructive"
            size="sm"
            onClick={onReject}
            loading={pending}
          >
            تأكيد الرفض
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowReject(false)}
            disabled={pending}
          >
            إلغاء
          </Button>
        </div>
      )
    }
    return (
      <div className="flex flex-wrap gap-2">
        <Button
          variant="success"
          size="sm"
          onClick={onApprove}
          loading={pending}
          disabled={!consentGranted}
          title={!consentGranted ? "مطلوب تأكيد وجود موافقة موثقة" : undefined}
        >
          <CheckCircle2 className="size-4" />
          اعتماد ونشر
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setShowReject(true)}
          disabled={pending}
        >
          <XCircle className="size-4" />
          رفض
        </Button>
      </div>
    )
  }

  if (status === "APPROVED") {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={onArchive}
        loading={pending}
      >
        <Archive className="size-4" />
        أرشفة
      </Button>
    )
  }

  return null
}
