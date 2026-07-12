"use client"

import { useEffect } from "react"
import { Capacitor } from "@capacitor/core"

// Matches globals.css --background in each theme so the Android status bar
// blends with the page instead of sitting on it as a black strip.
const LIGHT_BG = "#FFFCF7"
const DARK_BG = "#1A1740"

/**
 * Wires native-shell behavior when the site runs inside the Capacitor app
 * (med-aura Android/iOS). A no-op in every regular browser.
 */
export function NativeBridge() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    let removeBack: (() => void) | undefined
    let observer: MutationObserver | undefined

    async function setup() {
      const [{ App }, { StatusBar, Style }, { SplashScreen }] = await Promise.all([
        import("@capacitor/app"),
        import("@capacitor/status-bar"),
        import("@capacitor/splash-screen"),
      ])

      // Hardware back button: navigate history, exit only from the root.
      const sub = await App.addListener("backButton", ({ canGoBack }) => {
        if (canGoBack) window.history.back()
        else void App.exitApp()
      })
      removeBack = () => void sub.remove()

      // Status bar follows the app theme (light by default, per product rule).
      const applyTheme = () => {
        const dark = document.documentElement.classList.contains("dark")
        void StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light })
        if (Capacitor.getPlatform() === "android") {
          void StatusBar.setBackgroundColor({ color: dark ? DARK_BG : LIGHT_BG })
        }
      }
      applyTheme()
      observer = new MutationObserver(applyTheme)
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class"],
      })

      void SplashScreen.hide()
    }

    void setup()
    return () => {
      removeBack?.()
      observer?.disconnect()
    }
  }, [])

  return null
}
