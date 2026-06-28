import { cookies } from "next/headers"
import { LOCALE_COOKIE, defaultLocale, isLocale, type Locale } from "./config"
import { getDictionary } from "./dictionaries"

export * from "./config"
export { getDictionary } from "./dictionaries"
export type { Dictionary } from "./dictionaries"

/** Resolve the active locale from the cookie (server components/actions). */
export async function getLocale(): Promise<Locale> {
  const store = await cookies()
  const value = store.get(LOCALE_COOKIE)?.value
  return isLocale(value) ? value : defaultLocale
}

/** Convenience: resolve locale + its dictionary together. */
export async function getI18n() {
  const locale = await getLocale()
  return { locale, t: getDictionary(locale) }
}
