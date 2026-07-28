"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { LocateFixed, X } from "lucide-react"
import { Button } from "@/components/ui/button"

/**
 * Browser geolocation → sort=nearest&lat&lng on /search, preserving every
 * other filter already in the URL. Denial/unavailable/timeout each get their
 * own honest message — never a native alert(), and never silently no-ops.
 *
 * Takes the current query string as a prop (from the server component's own
 * searchParams) rather than next/navigation's useSearchParams(), which would
 * need a Suspense boundary this page doesn't otherwise use.
 */
export function UseMyLocationButton({ active, currentQuery }: { active: boolean; currentQuery: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function navigateWith(overrides: Record<string, string | undefined>) {
    const q = new URLSearchParams(currentQuery)
    q.delete("page")
    for (const [k, v] of Object.entries(overrides)) {
      if (v === undefined) q.delete(k)
      else q.set(k, v)
    }
    router.push(`/search?${q.toString()}`)
  }

  function onPress() {
    if (!navigator.geolocation) {
      setError("متصفحك لا يدعم تحديد الموقع.")
      return
    }
    setError(null)
    setBusy(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBusy(false)
        navigateWith({
          sort: "nearest",
          lat: String(pos.coords.latitude),
          lng: String(pos.coords.longitude),
        })
      },
      (err) => {
        setBusy(false)
        if (err.code === err.PERMISSION_DENIED) {
          setError("لم يُسمح بالوصول إلى موقعك — يمكنك البحث بالمدينة بدلًا من ذلك.")
        } else if (err.code === err.TIMEOUT) {
          setError("انتهت مهلة تحديد الموقع، حاول مجددًا.")
        } else {
          setError("تعذّر تحديد موقعك حاليًا.")
        }
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    )
  }

  if (active) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => navigateWith({ sort: undefined, lat: undefined, lng: undefined })}
      >
        <X className="size-3.5" /> إلغاء الترتيب حسب الأقرب
      </Button>
    )
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <Button variant="outline" size="sm" onClick={onPress} loading={busy}>
        <LocateFixed className="size-3.5" /> الأقرب إلى موقعي
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
