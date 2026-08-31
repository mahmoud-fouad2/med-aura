import { pgTable, pgEnum, text, numeric, integer, boolean, timestamp, index, uniqueIndex, check } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import { lifecycle, authorship } from "./_shared"
import { user } from "./auth"
import { appointment } from "./scheduling"

/**
 * Discount codes an admin creates and edits from the dashboard — every
 * monetary value here is a row an admin sets, never a source-code constant.
 * Scoped to the consultation-booking checkout for now (the one Stripe flow
 * both web and mobile share); extending to case payments/quotes is a
 * separate follow-up once this proves out.
 */
export const promoDiscountTypeEnum = pgEnum("promo_discount_type", ["PERCENTAGE", "FIXED"])

export const promoCode = pgTable(
  "promo_code",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    // Always stored/matched uppercase — case-insensitive entry at checkout.
    code: text("code").notNull().unique(),
    description: text("description"),
    discountType: promoDiscountTypeEnum("discountType").notNull(),
    // A percentage (0–100) when discountType = PERCENTAGE, or a currency
    // amount (in `currency`) when discountType = FIXED.
    discountValue: numeric("discountValue", { precision: 12, scale: 2 }).notNull(),
    // Only meaningful for FIXED — a percentage applies in whatever currency
    // the booking itself is priced in.
    currency: text("currency"),
    maxRedemptions: integer("maxRedemptions"), // null = unlimited
    redemptionCount: integer("redemptionCount").notNull().default(0),
    maxRedemptionsPerUser: integer("maxRedemptionsPerUser").notNull().default(1),
    minAmount: numeric("minAmount", { precision: 12, scale: 2 }),
    validFrom: timestamp("validFrom", { withTimezone: true }),
    validUntil: timestamp("validUntil", { withTimezone: true }),
    active: boolean("active").notNull().default(true),
    ...lifecycle(),
    ...authorship(),
  },
  (t) => [
    uniqueIndex("promo_code_idx").on(t.code),
    index("promo_code_active_idx").on(t.active),
    check("promo_discount_value_positive", sql`${t.discountValue} > 0`),
    check(
      "promo_percentage_range",
      sql`${t.discountType} <> 'PERCENTAGE' OR ${t.discountValue} <= 100`,
    ),
    check("promo_max_redemptions_positive", sql`${t.maxRedemptions} is null or ${t.maxRedemptions} > 0`),
  ],
)

/** One row per successful use — enforces maxRedemptionsPerUser and gives
 *  an admin a real redemption history, not just a running counter. */
export const promoCodeRedemption = pgTable(
  "promo_code_redemption",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    promoCodeId: text("promoCodeId")
      .notNull()
      .references(() => promoCode.id, { onDelete: "cascade" }),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    appointmentId: text("appointmentId").references(() => appointment.id, { onDelete: "set null" }),
    discountAmount: numeric("discountAmount", { precision: 12, scale: 2 }).notNull(),
    currency: text("currency").notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("promo_redemption_code_idx").on(t.promoCodeId),
    index("promo_redemption_user_idx").on(t.userId),
  ],
)
