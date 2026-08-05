/**
 * Shared display formatters. One source of truth so numbers/dates render
 * identically across every dashboard.
 *
 * Numbers use Arabic locale grouping with LATIN digits (0-9), because the
 * Arabic-Indic zero "٠" renders as a lone dot in KPI cards and reads as a
 * broken value ("٠" ≈ "·"). Latin digits are the norm in Saudi digital
 * products and stay legible at any size.
 */
const numberFmt = new Intl.NumberFormat("ar-SA-u-nu-latn")

export function nf(n: number): string {
  return numberFmt.format(n)
}

export function nfCurrency(n: number, currencyLabel: string): string {
  return `${numberFmt.format(n)} ${currencyLabel}`
}

const dateFmt = new Intl.DateTimeFormat("ar-SA-u-nu-latn", {
  day: "numeric",
  month: "short",
  year: "numeric",
})

export function df(d: Date | string): string {
  return dateFmt.format(typeof d === "string" ? new Date(d) : d)
}

const dateTimeFmt = new Intl.DateTimeFormat("ar-SA-u-nu-latn", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
})

export function dtf(d: Date | string): string {
  return dateTimeFmt.format(typeof d === "string" ? new Date(d) : d)
}

// Locale-preset ("medium") variants — visually denser than df/dtf above, used
// by admin tables (record lists, activity logs) where every row needs a
// timestamp and a shorter column reads better. Previously reimplemented
// identically in 6 separate admin table components.
const dateMediumFmt = new Intl.DateTimeFormat("ar-SA-u-nu-latn", { dateStyle: "medium" })

export function dfMedium(d: Date | string): string {
  return dateMediumFmt.format(typeof d === "string" ? new Date(d) : d)
}

const dateTimeMediumFmt = new Intl.DateTimeFormat("ar-SA-u-nu-latn", { dateStyle: "medium", timeStyle: "short" })

export function dtfMedium(d: Date | string): string {
  return dateTimeMediumFmt.format(typeof d === "string" ? new Date(d) : d)
}

/** Strip the Arabic doctor honorific so greetings never render "أهلًا د.". */
export function firstNameOf(fullName: string): string {
  const cleaned = fullName.replace(/^\s*(د|دكتور|دكتوره|دكتورة|Dr)\.?\s*/i, "").trim()
  const first = cleaned.split(/\s+/)[0]
  return first || fullName.trim() || "بك"
}

/** True for a string that's lost to a bad encoding round-trip somewhere
 *  upstream (before it ever reached this app — seen on several accounts,
 *  mostly QA test signups): empty, or nothing but "?" characters. */
export function isGarbled(text: string): boolean {
  const trimmed = text.trim()
  return !trimmed || /^[?？\s]+$/.test(trimmed)
}

/** A stored name that's garbled shouldn't render as raw "????" in a
 *  professional admin surface — show an honest "unknown" label instead.
 *  Display-only: the underlying bad data is untouched. */
export function safeName(name: string, fallback = "مستخدم غير معروف"): string {
  return isGarbled(name) ? fallback : name
}
