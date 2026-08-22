"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

export function PageViewTracker({ locale }: { locale: "ar" | "en" }) {
  const pathname = usePathname()

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin") || pathname.startsWith("/dashboard")) return
    void fetch("/api/analytics/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "page_view", locale, path: pathname, properties: {} }),
      keepalive: true,
    }).catch(() => undefined)
  }, [locale, pathname])

  return null
}
