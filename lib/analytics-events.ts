import { z } from "zod"

export const ANALYTICS_EVENT_NAMES = [
  "page_view",
  "search_submitted",
  "doctor_viewed",
  "booking_started",
  "booking_created",
  "checkout_opened",
  "signup_completed",
  "provider_application_submitted",
  "review_submitted",
] as const

export type AnalyticsEventName = (typeof ANALYTICS_EVENT_NAMES)[number]
export type AnalyticsProperty = string | number | boolean

const PROPERTY_KEYS: Record<AnalyticsEventName, readonly string[]> = {
  page_view: [],
  search_submitted: ["category", "country", "hasQuery", "resultCount"],
  doctor_viewed: ["doctorId"],
  booking_started: ["doctorId", "type"],
  booking_created: ["doctorId", "type"],
  checkout_opened: ["purpose"],
  signup_completed: ["accountType", "country"],
  provider_application_submitted: ["kind"],
  review_submitted: ["hasComment", "rating"],
}

const PrimitiveSchema = z.union([
  z.string().max(120),
  z.number().finite(),
  z.boolean(),
])

export const AnalyticsEventSchema = z.object({
  name: z.enum(ANALYTICS_EVENT_NAMES),
  locale: z.enum(["ar", "en"]).default("ar"),
  path: z
    .string()
    .max(240)
    .regex(/^\/(?!\/)/, "path must be relative")
    .optional(),
  properties: z.record(z.string(), PrimitiveSchema).default({}),
})

export type AnalyticsEventInput = z.infer<typeof AnalyticsEventSchema>

export function sanitizeAnalyticsEvent(input: unknown): AnalyticsEventInput | null {
  const parsed = AnalyticsEventSchema.safeParse(input)
  if (!parsed.success) return null
  const allowed = new Set(PROPERTY_KEYS[parsed.data.name])
  const properties = Object.fromEntries(
    Object.entries(parsed.data.properties).filter(([key]) => allowed.has(key)),
  )
  return { ...parsed.data, properties }
}
