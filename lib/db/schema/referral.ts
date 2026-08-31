import { pgTable, pgEnum, text, numeric, integer, boolean, timestamp, index, uniqueIndex, check } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import { lifecycle, authorship } from "./_shared"
import { user } from "./auth"
import { promoCode } from "./promotions"

export const referralRewardTypeEnum = pgEnum("referral_reward_type", ["PERCENTAGE", "FIXED"])
export const referralStatusEnum = pgEnum("referral_status", ["PENDING", "QUALIFIED", "REWARDED", "EXPIRED"])

/**
 * Single settings row an admin edits from the dashboard — the referrer and
 * referee reward type/value are never a source-code constant, matching the
 * promo-code system. Reads always take the most recently updated row.
 */
export const referralSettings = pgTable(
  "referral_settings",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    active: boolean("active").notNull().default(false),
    referrerRewardType: referralRewardTypeEnum("referrerRewardType").notNull().default("FIXED"),
    referrerRewardValue: numeric("referrerRewardValue", { precision: 12, scale: 2 }).notNull().default("50.00"),
    refereeRewardType: referralRewardTypeEnum("refereeRewardType").notNull().default("FIXED"),
    refereeRewardValue: numeric("refereeRewardValue", { precision: 12, scale: 2 }).notNull().default("50.00"),
    currency: text("currency").notNull().default("SAR"),
    // How long the generated reward promo codes stay redeemable after issuance.
    rewardValidDays: integer("rewardValidDays").notNull().default(90),
    ...lifecycle(),
    ...authorship(),
  },
  (t) => [
    check("referral_referrer_value_positive", sql`${t.referrerRewardValue} > 0`),
    check("referral_referee_value_positive", sql`${t.refereeRewardValue} > 0`),
    check(
      "referral_referrer_percentage_range",
      sql`${t.referrerRewardType} <> 'PERCENTAGE' OR ${t.referrerRewardValue} <= 100`,
    ),
    check(
      "referral_referee_percentage_range",
      sql`${t.refereeRewardType} <> 'PERCENTAGE' OR ${t.refereeRewardValue} <= 100`,
    ),
    check("referral_valid_days_positive", sql`${t.rewardValidDays} > 0`),
  ],
)

/**
 * One row per referred signup. A referee can be referred at most once ever
 * (unique index) — the first valid code linked at signup wins. Qualifies
 * (and issues both reward promo codes) the moment the referee's first
 * consultation payment succeeds; see lib/referral.ts.
 */
export const referral = pgTable(
  "referral",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    referrerUserId: text("referrerUserId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    refereeUserId: text("refereeUserId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    status: referralStatusEnum("status").notNull().default("PENDING"),
    qualifyingAppointmentId: text("qualifyingAppointmentId"),
    referrerRewardPromoCodeId: text("referrerRewardPromoCodeId").references(() => promoCode.id, {
      onDelete: "set null",
    }),
    refereeRewardPromoCodeId: text("refereeRewardPromoCodeId").references(() => promoCode.id, {
      onDelete: "set null",
    }),
    qualifiedAt: timestamp("qualifiedAt", { withTimezone: true }),
    createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("referral_referee_unique").on(t.refereeUserId),
    index("referral_referrer_idx").on(t.referrerUserId),
    index("referral_status_idx").on(t.status),
  ],
)
