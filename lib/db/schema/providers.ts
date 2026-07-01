import {
  pgTable,
  text,
  integer,
  boolean,
  numeric,
  date,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
  primaryKey,
} from "drizzle-orm/pg-core"
import {
  lifecycle,
  authorship,
  providerStatusEnum,
  applicationStatusEnum,
  applicationKindEnum,
  licenseStatusEnum,
} from "./_shared"
import { user } from "./auth"
import { procedure } from "./catalog"

export const center = pgTable(
  "center",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    ownerId: text("ownerId").references(() => user.id, { onDelete: "set null" }),
    legalName: text("legalName").notNull(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description"),
    country: text("country").notNull(),
    city: text("city"),
    address: text("address"),
    phone: text("phone"),
    email: text("email"),
    website: text("website"),
    logoKey: text("logoKey"),
    coverKey: text("coverKey"),
    languages: text("languages").array().notNull().default([]),
    // rating/reviewCount are computed from verified reviews; shown only when > 0
    rating: numeric("rating", { precision: 2, scale: 1 }),
    reviewCount: integer("reviewCount").notNull().default(0),
    verified: boolean("verified").notNull().default(false),
    published: boolean("published").notNull().default(false),
    status: providerStatusEnum("status").notNull().default("pending"),
    ...lifecycle(),
    ...authorship(),
  },
  (t) => [
    index("center_status_idx").on(t.status),
    index("center_country_idx").on(t.country),
  ],
)

/**
 * Membership of a center_admin/center_staff (and, redundantly, the owner) in a
 * specific center. `center.ownerId` remains the source of truth for ownership;
 * this table lets the center dashboard resolve which center(s) a staff user
 * belongs to, since CENTER_ADMIN/CENTER_STAFF are otherwise center-agnostic roles.
 */
export const centerStaff = pgTable(
  "center_staff",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    centerId: text("centerId").notNull().references(() => center.id, { onDelete: "cascade" }),
    userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("staff"),
    createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("center_staff_unique").on(t.centerId, t.userId),
    index("center_staff_user_idx").on(t.userId),
  ],
)

export const doctorProfile = pgTable(
  "doctor_profile",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    centerId: text("centerId").references(() => center.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    title: text("title"),
    bio: text("bio"),
    languages: text("languages").array().notNull().default([]),
    country: text("country").notNull(),
    city: text("city"),
    photoKey: text("photoKey"),
    yearsExperience: integer("yearsExperience").notNull().default(0),
    consultationFee: numeric("consultationFee", { precision: 12, scale: 2 }),
    currency: text("currency").notNull().default("SAR"),
    offersVideo: boolean("offersVideo").notNull().default(false),
    offersInPerson: boolean("offersInPerson").notNull().default(true),
    // rating/reviewCount computed from verified reviews; null/0 until earned
    rating: numeric("rating", { precision: 2, scale: 1 }),
    reviewCount: integer("reviewCount").notNull().default(0),
    verified: boolean("verified").notNull().default(false),
    published: boolean("published").notNull().default(false),
    status: providerStatusEnum("status").notNull().default("pending"),
    ...lifecycle(),
    ...authorship(),
  },
  (t) => [
    uniqueIndex("doctor_user_idx").on(t.userId),
    index("doctor_status_idx").on(t.status),
    index("doctor_published_idx").on(t.published),
    index("doctor_country_idx").on(t.country),
    index("doctor_center_idx").on(t.centerId),
  ],
)

/** Doctor ↔ procedure relation (real join — never a text array). */
export const doctorProcedure = pgTable(
  "doctor_procedure",
  {
    doctorId: text("doctorId")
      .notNull()
      .references(() => doctorProfile.id, { onDelete: "cascade" }),
    procedureId: text("procedureId")
      .notNull()
      .references(() => procedure.id, { onDelete: "cascade" }),
    priceFrom: numeric("priceFrom", { precision: 12, scale: 2 }),
    currency: text("currency").notNull().default("SAR"),
  },
  (t) => [
    primaryKey({ columns: [t.doctorId, t.procedureId] }),
    index("doctor_procedure_procedure_idx").on(t.procedureId),
  ],
)

export const doctorLicense = pgTable(
  "doctor_license",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    doctorId: text("doctorId")
      .notNull()
      .references(() => doctorProfile.id, { onDelete: "cascade" }),
    // stored encrypted at rest (see lib/crypto). Never expose in full publicly.
    numberEncrypted: text("numberEncrypted").notNull(),
    // last 4 chars kept clear for admin display
    numberLast4: text("numberLast4"),
    issuingAuthority: text("issuingAuthority").notNull(),
    issueDate: date("issueDate"),
    expiryDate: date("expiryDate").notNull(),
    documentKey: text("documentKey"), // private R2 object key
    status: licenseStatusEnum("status").notNull().default("PENDING"),
    lastVerifiedAt: timestamp("lastVerifiedAt", { withTimezone: true }),
    ...lifecycle(),
  },
  (t) => [
    index("license_doctor_idx").on(t.doctorId),
    index("license_expiry_idx").on(t.expiryDate),
  ],
)

/**
 * Provider onboarding application (section 14). The applicant submits a draft;
 * compliance reviews and, on approval, the DOCTOR/CENTER_OWNER role + published
 * profile are created. Self-service signup never grants provider roles.
 */
export const providerApplication = pgTable(
  "provider_application",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    kind: applicationKindEnum("kind").notNull(),
    applicantUserId: text("applicantUserId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    status: applicationStatusEnum("status").notNull().default("DRAFT"),
    // structured payload (personal data, license info, selected procedures…)
    payload: jsonb("payload").notNull().default({}),
    reviewerNotes: text("reviewerNotes"),
    submittedAt: timestamp("submittedAt", { withTimezone: true }),
    decidedAt: timestamp("decidedAt", { withTimezone: true }),
    // links populated after approval
    resultingDoctorId: text("resultingDoctorId"),
    resultingCenterId: text("resultingCenterId"),
    ...lifecycle(),
    ...authorship(),
  },
  (t) => [
    index("application_status_idx").on(t.status),
    index("application_applicant_idx").on(t.applicantUserId),
  ],
)

export const verificationReview = pgTable(
  "verification_review",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    applicationId: text("applicationId")
      .notNull()
      .references(() => providerApplication.id, { onDelete: "cascade" }),
    reviewerId: text("reviewerId")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    // note | request_changes | approve | reject | suspend | reactivate
    action: text("action").notNull(),
    note: text("note"),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("review_application_idx").on(t.applicationId)],
)
