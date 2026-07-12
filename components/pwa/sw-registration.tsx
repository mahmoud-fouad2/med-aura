"use client"

import { useEffect } from "react"

/** Registers the service worker (production only — dev would fight HMR). */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return
    if (!("serviceWorker" in navigator)) return
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Registration failing (private mode, unsupported) must never break the app.
    })
  }, [])
  return null
}
