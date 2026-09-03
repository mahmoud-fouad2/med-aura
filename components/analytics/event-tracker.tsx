"use client"

import { useEffect, useMemo } from "react"
import { usePathname } from "next/navigation"
import type { AnalyticsEventName, AnalyticsProperty } from "@/lib/analytics-events"

type ClientEvent = {
  name: AnalyticsEventName
  locale: "ar" | "en"
  path?: string
  properties?: Record<string, AnalyticsProperty>
}

export function trackClientEvent(event: ClientEvent): void {
  void fetch("/api/analytics/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...event, properties: event.properties ?? {} }),
    keepalive: true,
  }).catch(() => undefined)
}

/** Emits one privacy-minimized funnel event per page instance in a browser session. */
export function EventTracker({
  name,
  locale,
  properties = {},
}: Omit<ClientEvent, "path">) {
  const pathname = usePathname()
  const serializedProperties = useMemo(() => JSON.stringify(properties), [properties])

  useEffect(() => {
    if (!pathname) return
    const signature = `medaura:event:${name}:${pathname}:${serializedProperties}`
    if (sessionStorage.getItem(signature)) return
    sessionStorage.setItem(signature, "1")
    trackClientEvent({
      name,
      locale,
      path: pathname,
      properties: JSON.parse(serializedProperties) as Record<string, AnalyticsProperty>,
    })
  }, [locale, name, pathname, serializedProperties])

  return null
}
