import type { Metadata, Viewport } from "next"
import localFont from "next/font/local"
import "./globals.css"
import { getLocale, dir } from "@/lib/i18n"
import { appUrl } from "@/lib/env"
import { Toaster } from "@/components/ui/toaster"

const alexandria = localFont({
  src: "../public/fonts/Alexandria-Variable.woff2",
  variable: "--font-body",
  weight: "400 700",
  display: "swap",
  preload: true,
  fallback: ["system-ui", "-apple-system", "Segoe UI", "Tahoma", "sans-serif"],
})

const alexandriaHeading = localFont({
  src: "../public/fonts/Alexandria-Variable.woff2",
  variable: "--font-heading",
  weight: "500 700",
  display: "swap",
  preload: false,
  fallback: ["system-ui", "-apple-system", "Segoe UI", "Tahoma", "sans-serif"],
})

const inter = localFont({
  src: "../public/fonts/Inter-Variable.woff2",
  variable: "--font-numbers",
  weight: "400 700",
  display: "swap",
  preload: false,
  fallback: ["system-ui", "-apple-system", "Segoe UI", "Tahoma", "sans-serif"],
})

export const metadata: Metadata = {
  metadataBase: new URL(appUrl()),
  title: {
    default: "Med Aura | منصة التجميل الطبي الموثوقة",
    template: "%s | Med Aura",
  },
  description:
    "Med Aura منصة متخصصة في التجميل الطبي تربطك بأطباء ومراكز معتمدة، تدير رحلتك من الاستشارة حتى المتابعة بعد الإجراء بأمان وموثوقية.",
  applicationName: "Med Aura",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/medaura-mark.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Med Aura",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Lets the app draw edge-to-edge on notched/rounded-corner phones once
  // wrapped in a native shell — content itself still respects safe areas via
  // env(safe-area-inset-*) wherever the shell (header/bottom nav) needs it.
  viewportFit: "cover",
  colorScheme: "light",
  themeColor: "#1A1740",
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const locale = await getLocale()

  return (
    <html
      lang={locale}
      dir={dir(locale)}
      className={`${alexandria.variable} ${alexandriaHeading.variable} ${inter.variable} bg-background`}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  )
}
