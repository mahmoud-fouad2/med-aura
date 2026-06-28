import { Analytics } from "@vercel/analytics/next"
import type { Metadata, Viewport } from "next"
import { Cairo, IBM_Plex_Sans_Arabic } from "next/font/google"
import "./globals.css"

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
  title: "MED AURA | منصة السياحة العلاجية الموثوقة",
  description:
    "MED AURA تربط المرضى بأفضل الأطباء والمراكز الطبية المعتمدة حول العالم. ابحث، قارن، واحجز رحلتك العلاجية بثقة.",
  generator: "v0.app",
}

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#0e7c7b",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${cairo.variable} ${plexArabic.variable} bg-background`}
    >
      <body className="font-sans antialiased">
        {children}
        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  )
}
