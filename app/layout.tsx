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

// IBM Plex Sans Arabic ships as discrete per-weight, per-script files (no
// single variable file covers both scripts the way Alexandria's did), so
// one loader per script and CSS's own per-character font-family fallback —
// not unicode-range, which next/font/local's src array has no option for —
// is what actually routes Arabic letters to the Arabic-subset files and
// Latin letters to the Latin-subset files. Both share one role (body and
// heading no longer need separate files just to preload differently).
const ibmPlexArabic = localFont({
  src: [
    { path: "../public/fonts/ibm-plex-sans-arabic/ibm-plex-sans-arabic-arabic-400-normal.woff2", weight: "400" },
    { path: "../public/fonts/ibm-plex-sans-arabic/ibm-plex-sans-arabic-arabic-500-normal.woff2", weight: "500" },
    { path: "../public/fonts/ibm-plex-sans-arabic/ibm-plex-sans-arabic-arabic-600-normal.woff2", weight: "600" },
    { path: "../public/fonts/ibm-plex-sans-arabic/ibm-plex-sans-arabic-arabic-700-normal.woff2", weight: "700" },
  ],
  variable: "--font-arabic",
  display: "swap",
  preload: true,
  fallback: ["system-ui", "-apple-system", "Segoe UI", "Tahoma", "sans-serif"],
})

const ibmPlexLatin = localFont({
  src: [
    { path: "../public/fonts/ibm-plex-sans-arabic/ibm-plex-sans-arabic-latin-400-normal.woff2", weight: "400" },
    { path: "../public/fonts/ibm-plex-sans-arabic/ibm-plex-sans-arabic-latin-500-normal.woff2", weight: "500" },
    { path: "../public/fonts/ibm-plex-sans-arabic/ibm-plex-sans-arabic-latin-600-normal.woff2", weight: "600" },
    { path: "../public/fonts/ibm-plex-sans-arabic/ibm-plex-sans-arabic-latin-700-normal.woff2", weight: "700" },
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
      className={`${ibmPlexArabic.variable} ${ibmPlexLatin.variable} ${inter.variable} bg-background`}
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
