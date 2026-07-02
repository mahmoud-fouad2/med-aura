"use client"

import { Toaster as SonnerToaster } from "sonner"

/**
 * Global toast renderer. Mounted once at the root layout. All server actions
 * and client interactions should surface user-visible feedback through this
 * (RTL-safe, dismissable, respects prefers-reduced-motion).
 */
export function Toaster() {
  return (
    <SonnerToaster
      position="top-center"
      richColors
      closeButton
      dir="rtl"
      toastOptions={{
        classNames: {
          toast:
            "font-sans border border-border bg-background text-foreground shadow-lg",
          description: "text-muted-foreground",
          actionButton: "bg-primary text-primary-foreground",
          cancelButton: "bg-muted text-muted-foreground",
        },
      }}
    />
  )
}
