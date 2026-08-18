import type { Metadata, Viewport } from "next"
import localFont from "next/font/local"
import "./globals.css"
import { getLocale, dir } from "@/lib/i18n"
import { appUrl } from "@/lib/env"
import {
  DEFAULT_DESCRIPTION_AR,
  DEFAULT_TITLE,
  SITE_NAME,
  absoluteUrl,
  jsonLdScript,
  organizationJsonLd,
  websiteJsonLd,
} from "@/lib/seo"
import { Toaster } from "@/components/ui/toaster"
import { ServiceWorkerRegistration } from "@/components/pwa/sw-registration"

// Readex Pro — a variable Arabic+Latin family drawn as one design, with a
// continuous 160–700 weight axis. Two things it fixes over the per-weight
// static files it replaces: 600 (font-semibold, which the UI leans on
// everywhere) is a real master instead of a synthesised in-between, and the
// whole range is two ~25 KB files instead of eight.
//
// Still one loader per script: CSS's own per-character font-family fallback —
// not unicode-range, which next/font/local's src array has no option for — is
// what routes Arabic letters to the Arabic-subset file and Latin letters to
// the Latin-subset one.
const readexArabic = localFont({
  src: [
    {
      path: "../public/fonts/readex-pro/readex-pro-arabic-wght-normal.woff2",
      weight: "160 700",
    },
  ],
  variable: "--font-arabic",
  display: "swap",
  preload: true,
  fallback: ["system-ui", "-apple-system", "Segoe UI", "Tahoma", "sans-serif"],
})

const readexLatin = localFont({
  src: [
    {
      path: "../public/fonts/readex-pro/readex-pro-latin-wght-normal.woff2",
      weight: "160 700",
    },
  ],
  variable: "--font-latin",
  display: "swap",
  preload: true,
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
    default: DEFAULT_TITLE,
    template: "%s | Med Aura",
  },
  description: DEFAULT_DESCRIPTION_AR,
  applicationName: SITE_NAME,
  manifest: "/manifest.json",
  alternates: {
    canonical: absoluteUrl("/"),
    // Same URL serves both languages via a cookie, not a path — only
    // x-default is a real signal (see the identical note in lib/seo.ts).
    languages: { "x-default": absoluteUrl("/") },
  },
  openGraph: {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION_AR,
    url: absoluteUrl("/"),
    siteName: SITE_NAME,
    locale: "ar_SA",
    alternateLocale: ["en_US"],
    type: "website",
    images: [
      {
        url: absoluteUrl("/hero-medaura-consultation.png"),
        width: 1600,
        height: 900,
        alt: DEFAULT_TITLE,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION_AR,
    images: [absoluteUrl("/hero-medaura-consultation.png")],
  },
  icons: {
    // All derived from the same brand mark as the mobile app icon (the
    // face-silhouette + stylized M), not the old mismatched navy "M" swoosh
    // medaura-mark.svg used to serve. /favicon.ico (public/favicon.ico) is
    // picked up automatically by browsers that fetch it directly, no entry
    // needed here.
    icon: [
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
  themeColor: "#FFFCF7",
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
      className={`${readexArabic.variable} ${readexLatin.variable} ${inter.variable} bg-background`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.getItem('theme');document.documentElement.classList.toggle('dark',t==='dark')}catch(e){}})()",
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdScript(organizationJsonLd()) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdScript(websiteJsonLd()) }}
        />
      </head>
      <body className="font-sans antialiased">
        {children}
        <Toaster />
        <ServiceWorkerRegistration />
      </body>
    </html>
  )
}
