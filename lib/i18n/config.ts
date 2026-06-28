export const locales = ["ar", "en"] as const
export type Locale = (typeof locales)[number]
export const defaultLocale: Locale = "ar"
export const LOCALE_COOKIE = "medaura_locale"

export function dir(locale: Locale): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr"
}

export function isLocale(value: string | undefined | null): value is Locale {
  return value === "ar" || value === "en"
}
