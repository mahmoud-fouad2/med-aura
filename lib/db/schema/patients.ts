import { pgTable, text, date, boolean, uniqueIndex } from "drizzle-orm/pg-core"
import { lifecycle } from "./_shared"
import { user } from "./auth"

/**
 * Patient profile — demographics & preferences only. Medical details are NOT
 * collected here; they live on the specific case, gathered only when needed
 * (section 15: data minimisation).
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
    emergencyContactName: text("emergencyContactName"),
    emergencyContactPhone: text("emergencyContactPhone"),
    onboardingCompleted: boolean("onboardingCompleted").notNull().default(false),
    ...lifecycle(),
  },
  (t) => [uniqueIndex("patient_user_idx").on(t.userId)],
)
