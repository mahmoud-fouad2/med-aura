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
  organizationJsonLd,
  websiteJsonLd,
} from "@/lib/seo"
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
    default: DEFAULT_TITLE,
    template: "%s | Med Aura",
  },
  description: DEFAULT_DESCRIPTION_AR,
  applicationName: SITE_NAME,
  manifest: "/manifest.json",
  alternates: {
    canonical: absoluteUrl("/"),
    languages: {
      ar: absoluteUrl("/"),
      en: absoluteUrl("/"),
      "x-default": absoluteUrl("/"),
    },
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
      className={`${alexandria.variable} ${alexandriaHeading.variable} ${inter.variable} bg-background`}
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
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd()) }}
        />
      </head>
      <body className="font-sans antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  )
}
