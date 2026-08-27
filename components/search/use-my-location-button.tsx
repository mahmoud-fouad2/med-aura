"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { LocateFixed, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { localizedPath, type Locale } from "@/lib/i18n/config"

/**
 * Browser geolocation → sort=nearest&lat&lng on /search, preserving every
 * other filter already in the URL. Denial/unavailable/timeout each get their
 * own honest message — never a native alert(), and never silently no-ops.
 *
 * Takes the current query string as a prop (from the server component's own
 * searchParams) rather than next/navigation's useSearchParams(), which would
 * need a Suspense boundary this page doesn't otherwise use.
 */
export function UseMyLocationButton({ active, currentQuery, locale }: { active: boolean; currentQuery: string; locale: Locale }) {
  const router = useRouter()
  const isAr = locale === "ar"
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function navigateWith(overrides: Record<string, string | undefined>) {
    const q = new URLSearchParams(currentQuery)
    q.delete("page")
    for (const [k, v] of Object.entries(overrides)) {
      if (v === undefined) q.delete(k)
      else q.set(k, v)
    }
    router.push(`${localizedPath("/search", locale)}?${q.toString()}`)
  }

  function onPress() {
    if (!navigator.geolocation) {
      setError(isAr ? "متصفحك لا يدعم تحديد الموقع." : "Your browser does not support location access.")
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
          setError(isAr ? "لم يُسمح بالوصول إلى موقعك. يمكنك البحث بالمدينة بدلًا من ذلك." : "Location access was not allowed. You can search by city instead.")
        } else if (err.code === err.TIMEOUT) {
          setError(isAr ? "انتهت مهلة تحديد الموقع، حاول مجددًا." : "Location lookup timed out. Please try again.")
        } else {
          setError(isAr ? "تعذّر تحديد موقعك حاليًا." : "We could not determine your location right now.")
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
        <X className="size-3.5" /> {isAr ? "إلغاء الترتيب حسب الأقرب" : "Clear nearest sorting"}
      </Button>
    )
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <Button variant="outline" size="sm" onClick={onPress} loading={busy}>
        <LocateFixed className="size-3.5" /> {isAr ? "الأقرب إلى موقعي" : "Nearest to me"}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
