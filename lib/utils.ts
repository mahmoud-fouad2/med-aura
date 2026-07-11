import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** First value of a Next.js searchParams entry, trimmed, or undefined if empty/missing. */
export function firstParam(v: string | string[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v
  return s?.trim() ? s : undefined
}
