import { pgTable, text, date, boolean, integer, numeric, timestamp, uniqueIndex, check } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import { lifecycle } from "./_shared"
import { user } from "./auth"

/**
 * Patient profile — demographics, baseline biometrics & preferences only.
 * Clinical/diagnostic details (allergies, medications, conditions, history)
 * are NOT collected here; they live on the specific case, gathered only when
 * needed (section 15: data minimisation). height/weight/biologicalSex are
 * kept as they're general-purpose baseline vitals useful to any consulting
 * doctor, not case-specific clinical data.
 */
export const patientProfile = pgTable(
  "patient_profile",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    dateOfBirth: date("dateOfBirth"),
    nationality: text("nationality"),
    residenceCountry: text("residenceCountry"),
    city: text("city"),
    language: text("language").notNull().default("ar"),
    phone: text("phone"),
    biologicalSex: text("biologicalSex"), // "male" | "female" — nullable, self-reported
    heightCm: integer("heightCm"),
    weightKg: numeric("weightKg", { precision: 5, scale: 1 }),
    emergencyContactName: text("emergencyContactName"),
    emergencyContactPhone: text("emergencyContactPhone"),
    onboardingCompleted: boolean("onboardingCompleted").notNull().default(false),
    // Lazily generated on first use (see lib/referral.ts) — not every patient
    // has one until they open the "invite a friend" screen.
    referralCode: text("referralCode").unique(),
    // Set the first time the patient completes (or explicitly skips) the
    // "tell us about yourself" wizard step — separate from
    // onboardingCompleted (phone/country) so the wizard shows exactly once,
    // for both brand-new signups and patients who existed before it shipped.
    profileWizardSeenAt: timestamp("profileWizardSeenAt", { withTimezone: true }),
    ...lifecycle(),
  },
  (t) => [
    uniqueIndex("patient_user_idx").on(t.userId),
    check("patient_biological_sex_check", sql`${t.biologicalSex} in ('male', 'female')`),
    check("patient_height_check", sql`${t.heightCm} between 30 and 280`),
    check("patient_weight_check", sql`${t.weightKg} between 1 and 500`),
  ],
)
