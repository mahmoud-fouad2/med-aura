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
            "font-sans rounded-xl border border-border/70 bg-card text-foreground shadow-elegant-lg",
          title: "font-medium",
          description: "text-muted-foreground",
          actionButton: "bg-primary text-primary-foreground rounded-lg",
          cancelButton: "bg-muted text-muted-foreground rounded-lg",
          closeButton: "border-border/70 bg-card text-muted-foreground hover:text-foreground",
        },
      }}
    />
  )
}
