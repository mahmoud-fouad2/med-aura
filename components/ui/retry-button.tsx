"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { RotateCw } from "lucide-react"
import { Button } from "@/components/ui/button"

export function RetryButton({ label = "إعادة المحاولة" }: { label?: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  return (
    <Button
      variant="outline"
      disabled={busy}
      onClick={() => {
        setBusy(true)
        router.refresh()
        // allow re-click shortly after if the refresh didn't resolve the issue
        setTimeout(() => setBusy(false), 2500)
      }}
    >
      <RotateCw className={busy ? "size-4 animate-spin" : "size-4"} />
      {label}
    </Button>
  )
}
