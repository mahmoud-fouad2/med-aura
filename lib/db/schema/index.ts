/**
 * Med Aura database schema (Drizzle).
 *
 * Organised by domain. Everything is re-exported here so `drizzle(pool, { schema })`
 * and `import { ... } from "@/lib/db/schema"` both see the full set.
 *
 * NOTE: this is the foundation + first vertical slice. Further domain tables
 * from the full spec (quotes, invoices, travel, follow-up, messaging, reviews,
 * before/after, etc.) extend these modules without restructuring.
 */
export * from "./_shared"
export * from "./auth"
export * from "./catalog"
export * from "./patients"
export * from "./providers"
export * from "./cases"
export * from "./scheduling"
export * from "./finance"
export * from "./audit"
export * from "./support"
