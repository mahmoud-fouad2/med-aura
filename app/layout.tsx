import { Analytics } from "@vercel/analytics/next"
import type { Metadata, Viewport } from "next"
import { Cairo, IBM_Plex_Sans_Arabic } from "next/font/google"
import "./globals.css"
import { getLocale, dir } from "@/lib/i18n"
import { appUrl } from "@/lib/env"

const cairo = Cairo({
  variable: "--font-heading",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800"],
})

const plexArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-body",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
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
      className={`${cairo.variable} ${plexArabic.variable} bg-background`}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased">
        {children}
        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  )
}
