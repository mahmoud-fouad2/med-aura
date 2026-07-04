"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { UserCheck, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
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
  const [pending, start] = useTransition()
  const router = useRouter()
  return (
    <Button
      variant="ghost"
      size="sm"
      loading={pending}
      onClick={() => {
        if (!confirm("سيتم إلغاء طلب السفر. تأكيد؟")) return
        start(async () => {
          const res = await cancelTravelRequest(requestId)
          if (res.ok) {
            toast.success("تم الإلغاء.")
            router.refresh()
          } else toast.error(res.error)
        })
      }}
    >
      <X className="size-4" />
      إلغاء
    </Button>
  )
}
