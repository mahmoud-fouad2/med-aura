import type { Metadata, Viewport } from "next"
import NextTopLoader from "nextjs-toploader"
import localFont from "next/font/local"
import "./globals.css"
import { getLocale, dir } from "@/lib/i18n"
import { appUrl } from "@/lib/env"
import {
  SITE_NAME,
  SITE_NAME_AR_VARIANTS,
  SITE_NAME_EN_VARIANTS,
  absoluteUrl,
  localizedUrl,
} from "@/lib/seo"
import { Toaster } from "@/components/ui/toaster"
import { ServiceWorkerRegistration } from "@/components/pwa/sw-registration"
import { PageViewTracker } from "@/components/analytics/page-view-tracker"

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

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  const isAr = locale === "ar"
  const title = isAr
    ? "Med Aura | قارن أطباء ومراكز التجميل واختر بثقة"
    : "Med Aura | Compare aesthetic doctors and clinics with clarity"
  const description = isAr
    ? "قارن أطباء التجميل والمراكز والإجراءات والوجهات، واحجز استشارة تساعدك على اختيار الأنسب لاحتياجك بتوقعات أوضح."
    : "Compare aesthetic doctors, clinics, procedures, and destinations, then book a consultation to choose the right option with clearer expectations."
  return {
    metadataBase: new URL(appUrl()),
    title: {
      default: title,
      template: "%s | Med Aura",
    },
    description,
  applicationName: SITE_NAME,
  manifest: "/manifest.json",
  keywords: isAr
    ? [
        ...SITE_NAME_AR_VARIANTS,
        "أطباء تجميل",
        "مراكز تجميل",
        "إجراءات تجميل",
        "استشارة تجميل أونلاين",
        "عناية بالبشرة",
      ]
    : [
        ...SITE_NAME_EN_VARIANTS,
        "aesthetic doctors",
        "cosmetic clinics",
        "aesthetic procedures",
        "online aesthetic consultation",
        "skin care",
      ],
  alternates: {
    canonical: localizedUrl("/", locale),
    languages: {
      ar: absoluteUrl("/ar"),
      en: absoluteUrl("/en"),
      "x-default": absoluteUrl("/"),
    },
  },
  openGraph: {
    title,
    description,
    url: localizedUrl("/", locale),
    siteName: SITE_NAME,
    locale: isAr ? "ar_SA" : "en_US",
    alternateLocale: [isAr ? "en_US" : "ar_SA"],
    type: "website",
    images: [
      {
        url: absoluteUrl("/hero-medaura-consultation.webp"),
        width: 1600,
        height: 900,
        alt: title,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [absoluteUrl("/hero-medaura-consultation.webp")],
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
      </head>
      <body className="font-sans antialiased">
        <NextTopLoader
          color="var(--primary)"
          initialPosition={0.08}
          crawlSpeed={200}
          height={3}
          crawl={true}
          showSpinner={true}
          easing="ease"
          speed={200}
          shadow="0 0 10px var(--primary),0 0 5px var(--primary)"
        />
        {children}
        <PageViewTracker locale={locale} />
        <Toaster />
        <ServiceWorkerRegistration />
      </body>
    </html>
  )
}
