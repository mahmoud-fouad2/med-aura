"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { MapPin, MapPinOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog"
import { updateCenterCoordinates } from "@/lib/actions/provider"

/**
 * Minimal, honest coordinate editor for a center — powers "nearest to me"
 * ranking in search. Not required: leaving both fields empty is valid and
 * simply keeps the center out of distance-based ranking.
 */
export function CenterCoordinatesForm({
  centerId,
  latitude,
  longitude,
}: {
  centerId: string
  latitude: string | null
  longitude: string | null
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [lat, setLat] = useState(latitude ?? "")
  const [lng, setLng] = useState(longitude ?? "")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hasCoords = latitude != null && longitude != null

  async function onSave() {
    setBusy(true)
    setError(null)
    const res = await updateCenterCoordinates({ centerId, latitude: lat, longitude: lng })
    setBusy(false)
    if (!res.ok) return setError(res.error)
    setOpen(false)
    router.refresh()
  }

  function onOpenChange(next: boolean) {
    if (busy) return
    setOpen(next)
    if (!next) {
      setError(null)
      setLat(latitude ?? "")
      setLng(longitude ?? "")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        {hasCoords ? <MapPin className="size-3.5" /> : <MapPinOff className="size-3.5" />}
        {hasCoords ? "الموقع محدد" : "لم تتم إضافة الموقع"}
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>الموقع الجغرافي للمركز</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-2.5">
          <p className="text-xs text-muted-foreground">
            تُستخدم هذه الإحداثيات لترتيب النتائج حسب الأقرب للمستخدم.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground" htmlFor={`lat-${centerId}`}>
                خط العرض (Latitude)
              </label>
              <Input
                id={`lat-${centerId}`}
                inputMode="decimal"
                placeholder="مثال: 24.7136"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                className="h-8 text-xs"
                dir="ltr"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground" htmlFor={`lng-${centerId}`}>
                خط الطول (Longitude)
              </label>
              <Input
                id={`lng-${centerId}`}
                inputMode="decimal"
                placeholder="مثال: 46.6753"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                className="h-8 text-xs"
                dir="ltr"
              />
            </div>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          {hasCoords ? (
            <a
              href={`https://www.google.com/maps?q=${latitude},${longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-xs font-medium text-primary hover:underline"
            >
              فتح على الخريطة
            </a>
          ) : null}
        </DialogBody>
        <DialogFooter>
          <DialogClose render={<Button size="sm" variant="ghost" disabled={busy} />}>إلغاء</DialogClose>
          <Button size="sm" loading={busy} loadingText="جارٍ الحفظ…" onClick={onSave}>
            حفظ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
