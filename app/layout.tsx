import type { Metadata, Viewport } from "next"
import localFont from "next/font/local"
import "./globals.css"
import { getLocale, dir } from "@/lib/i18n"
import { appUrl } from "@/lib/env"

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
  icons: {
    icon: "/medaura-mark.svg",
    apple: "/medaura-mark.svg",
  },
}

export const viewport: Viewport = {
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
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
