"use client"

import { useState } from "react"
import { Download, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

export function ExportInvoicesButton({ centerId }: { centerId: string }) {
  const [busy, setBusy] = useState(false)

  const handleExport = async () => {
    setBusy(true)
    try {
      const res = await fetch(`/api/center/export-invoices?centerId=${centerId}`)
      if (!res.ok) throw new Error("تعذر تصدير البيانات")
      
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `medaura-invoices-${new Date().toISOString().split("T")[0]}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      
      toast.success("تم تصدير الفواتير بنجاح")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "حدث خطأ غير متوقع")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button size="sm" variant="outline" className="h-8 gap-1.5 px-3 text-xs" onClick={handleExport} disabled={busy}>
      {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
      تصدير فواتير (CSV)
    </Button>
  )
}
