import type { Metadata } from "next"
import { appUrl } from "@/lib/env"

export const SITE_NAME = "Med Aura"
export const SITE_NAME_AR = "مد أورا"
export const DEFAULT_TITLE = "Med Aura | رحلتك التجميلية تبدأ بقرار موثوق"
export const DEFAULT_DESCRIPTION_AR =
  "منصة تساعدك على اختيار طبيب أو مركز تجميل بثقة، ومتابعة رحلتك من أول استشارة حتى الاطمئنان بعد الإجراء."
export const DEFAULT_DESCRIPTION_EN =
  "Aesthetic care platform for comparing trusted doctors and centers, booking consultations, and following your journey with clarity."

export type GeoPoint = {
  nameAr: string
  nameEn: string
  latitude: number
  longitude: number
}

const CATEGORY_IMAGES: Record<string, string> = {
  "face-neck": "/demo-services/service-face-neck.png",
  breast: "/demo-services/service-body-contouring.png",
  body: "/demo-services/service-body-contouring.png",
  skin: "/demo-services/service-skin-nonsurgical.png",
  hair: "/demo-services/service-hair-restoration.png",
  dental: "/demo-services/service-dental-smile.png",
}

const COUNTRY_GEO: Record<string, GeoPoint> = {
  AE: { nameAr: "الإمارات", nameEn: "United Arab Emirates", latitude: 23.4241, longitude: 53.8478 },
  BH: { nameAr: "البحرين", nameEn: "Bahrain", latitude: 26.0667, longitude: 50.5577 },
  EG: { nameAr: "مصر", nameEn: "Egypt", latitude: 26.8206, longitude: 30.8025 },
  JO: { nameAr: "الأردن", nameEn: "Jordan", latitude: 30.5852, longitude: 36.2384 },
  KW: { nameAr: "الكويت", nameEn: "Kuwait", latitude: 29.3117, longitude: 47.4818 },
  OM: { nameAr: "عمان", nameEn: "Oman", latitude: 21.4735, longitude: 55.9754 },
  QA: { nameAr: "قطر", nameEn: "Qatar", latitude: 25.3548, longitude: 51.1839 },
  SA: { nameAr: "السعودية", nameEn: "Saudi Arabia", latitude: 23.8859, longitude: 45.0792 },
  TR: { nameAr: "تركيا", nameEn: "Türkiye", latitude: 38.9637, longitude: 35.2433 },
  US: { nameAr: "الولايات المتحدة", nameEn: "United States", latitude: 37.0902, longitude: -95.7129 },
}

export function absoluteUrl(path = "/"): string {
  return new URL(path, appUrl()).toString()
}

export function serviceImageForCategory(slug: string | null | undefined): string {
  if (!slug) return "/demo-services/aesthetic-treatment-room.png"
  return CATEGORY_IMAGES[slug] ?? "/demo-services/aesthetic-treatment-room.png"
}

export function serviceImageForProcedure(categorySlug: string | null | undefined): string {
  return serviceImageForCategory(categorySlug)
}

export function geoForCountry(code: string | null | undefined): GeoPoint | undefined {
  if (!code) return undefined
  return COUNTRY_GEO[code.toUpperCase()]
}

export function geoCoordinatesJsonLd(code: string | null | undefined) {
  const geo = geoForCountry(code)
  if (!geo) return undefined
  return {
    "@type": "GeoCoordinates",
    latitude: geo.latitude,
    longitude: geo.longitude,
  }
}

export function buildPageMetadata({
  title,
  description,
  path,
  image = "/hero-medaura-consultation.png",
  locale = "ar",
  type = "website",
}: {
  title: string
  description: string
  path: string
  image?: string
  locale?: "ar" | "en"
  type?: "website" | "article"
}): Metadata {
  const url = absoluteUrl(path)
  const imageUrl = absoluteUrl(image)
  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: {
        ar: url,
        en: url,
        "x-default": url,
      },
    },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      locale: locale === "ar" ? "ar_SA" : "en_US",
      alternateLocale: locale === "ar" ? ["en_US"] : ["ar_SA"],
      type,
      images: [
        {
          url: imageUrl,
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
      images: [imageUrl],
    },
  }
}

export function breadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }
}

export function itemListJsonLd({
  name,
  items,
}: {
  name: string
  items: { name: string; url: string; image?: string }[]
}) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Thing",
        name: item.name,
        url: item.url,
        ...(item.image ? { image: item.image } : {}),
      },
    })),
  }
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": absoluteUrl("/#organization"),
    name: SITE_NAME,
    alternateName: SITE_NAME_AR,
    url: absoluteUrl("/"),
    logo: absoluteUrl("/brand/med-aura-logo.png"),
    description: DEFAULT_DESCRIPTION_AR,
    areaServed: [
      { "@type": "Country", name: "Saudi Arabia" },
      { "@type": "Country", name: "United Arab Emirates" },
      { "@type": "Country", name: "Türkiye" },
    ],
    knowsLanguage: ["ar", "en"],
  }
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": absoluteUrl("/#website"),
    name: SITE_NAME,
    alternateName: SITE_NAME_AR,
    url: absoluteUrl("/"),
    inLanguage: ["ar", "en"],
    publisher: { "@id": absoluteUrl("/#organization") },
    potentialAction: {
      "@type": "SearchAction",
      target: `${absoluteUrl("/search")}?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  }
}
