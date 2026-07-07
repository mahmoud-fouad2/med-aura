"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { UserCheck, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import {
  assignTravelRequest,
  cancelTravelRequest,
} from "@/lib/actions/travel"

export function TravelAssignButton({
  requestId,
  assigned,
}: {
  requestId: string
  assigned: boolean
}) {
  const [pending, start] = useTransition()
  const router = useRouter()
  if (assigned) return null
  return (
    <Button
      variant="soft"
      size="sm"
      loading={pending}
      onClick={() =>
        start(async () => {
          const res = await assignTravelRequest(requestId)
          if (res.ok) {
            toast.success("تم تعيينك على الطلب.")
            router.refresh()
          } else toast.error(res.error)
        })
      }
    >
      <UserCheck className="size-4" />
      خذ الطلب
    </Button>
  )
}

export function TravelCancelButton({ requestId }: { requestId: string }) {
  const router = useRouter()
  return (
    <ConfirmDialog
      trigger={
        <Button variant="ghost" size="sm">
          <X className="size-4" />
          إلغاء
        </Button>
      }
      title="إلغاء طلب السفر؟"
      description="سيُلغى طلب السفر وسيُبلَّغ المريض بذلك. يمكن إنشاء طلب جديد لاحقًا عند الحاجة."
      confirmLabel="إلغاء الطلب"
      tone="destructive"
      onConfirm={async () => {
        const res = await cancelTravelRequest(requestId)
        if (res.ok) {
          toast.success("تم الإلغاء.")
          router.refresh()
          return true
        }
        toast.error(res.error)
        return false
      }}
    />
  )
}
