import {
  pgTable,
  text,
  integer,
  boolean,
  numeric,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core"
import {
  lifecycle,
  authorship,
  caseStatusEnum,
  consentStatusEnum,
  documentKindEnum,
} from "./_shared"
import { user } from "./auth"
import { procedure } from "./catalog"
import { doctorProfile, center } from "./providers"

export const aestheticCase = pgTable(
  "aesthetic_case",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    // human-friendly reference, e.g. "CASE-AB12CD"
    reference: text("reference").notNull().unique(),
    patientUserId: text("patientUserId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    procedureId: text("procedureId")
      .notNull()
      .references(() => procedure.id, { onDelete: "restrict" }),
    // chosen provider (nullable until patient picks)
    doctorId: text("doctorId").references(() => doctorProfile.id, {
      onDelete: "set null",
    }),
    centerId: text("centerId").references(() => center.id, {
      onDelete: "set null",
    }),
    status: caseStatusEnum("status").notNull().default("DRAFT"),
    goal: text("goal"),
    description: text("description"),
    // wizard answers (procedure-specific). Key filters are promoted to columns.
    answers: jsonb("answers").notNull().default({}),
    ageYears: integer("ageYears"),
    preferredCountry: text("preferredCountry"),
    preferredCity: text("preferredCity"),
    budgetAmount: numeric("budgetAmount", { precision: 12, scale: 2 }),
    budgetCurrency: text("budgetCurrency").default("SAR"),
    needsTravel: boolean("needsTravel").notNull().default(false),
    consentToShare: boolean("consentToShare").notNull().default(false),
    ...lifecycle(),
    ...authorship(),
  },
  (t) => [
    index("case_patient_idx").on(t.patientUserId),
    index("case_doctor_idx").on(t.doctorId),
    index("case_status_idx").on(t.status),
  ],
)

export const caseStatusHistory = pgTable(
  "case_status_history",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    caseId: text("caseId")
      .notNull()
      .references(() => aestheticCase.id, { onDelete: "cascade" }),
    fromStatus: caseStatusEnum("fromStatus"),
    toStatus: caseStatusEnum("toStatus").notNull(),
    changedBy: text("changedBy"),
    note: text("note"),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("case_history_case_idx").on(t.caseId)],
)

/**
 * Private medical document. ALWAYS stored privately in R2 and served via
 * short-lived signed URLs — never a public URL (section 17). Every read is
 * audited. Access is governed by consent + documentAccessGrant.
 */
export const medicalDocument = pgTable(
  "medical_document",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    caseId: text("caseId").references(() => aestheticCase.id, {
      onDelete: "cascade",
    }),
    ownerUserId: text("ownerUserId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    kind: documentKindEnum("kind").notNull().default("CASE_PHOTO"),
    objectKey: text("objectKey").notNull(), // private R2 key
    fileName: text("fileName").notNull(),
    contentType: text("contentType").notNull(),
    sizeBytes: integer("sizeBytes").notNull().default(0),
    // upload lifecycle: presigned row created first, finalized after PUT
    finalized: boolean("finalized").notNull().default(false),
    ...lifecycle(),
  },
  (t) => [
    index("document_case_idx").on(t.caseId),
    index("document_owner_idx").on(t.ownerUserId),
  ],
)

/**
 * Case-level consent: the patient permits a specific doctor (grantee) to view
 * the case for a purpose, optionally time-bounded and revocable (section 18).
 */
export const consent = pgTable(
  "consent",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    caseId: text("caseId")
      .notNull()
      .references(() => aestheticCase.id, { onDelete: "cascade" }),
    patientUserId: text("patientUserId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    granteeUserId: text("granteeUserId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    purpose: text("purpose").notNull().default("consultation_review"),
    status: consentStatusEnum("status").notNull().default("GRANTED"),
    grantedAt: timestamp("grantedAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expiresAt", { withTimezone: true }),
    revokedAt: timestamp("revokedAt", { withTimezone: true }),
    ...lifecycle(),
  },
  (t) => [
    index("consent_case_idx").on(t.caseId),
    index("consent_grantee_idx").on(t.granteeUserId),
  ],
)

/** Per-document access grant, tied to a consent. Revoking blocks future reads. */
export const documentAccessGrant = pgTable(
  "document_access_grant",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    documentId: text("documentId")
      .notNull()
      .references(() => medicalDocument.id, { onDelete: "cascade" }),
    consentId: text("consentId")
      .notNull()
      .references(() => consent.id, { onDelete: "cascade" }),
    granteeUserId: text("granteeUserId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    grantedBy: text("grantedBy").notNull(),
    revokedAt: timestamp("revokedAt", { withTimezone: true }),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("grant_document_idx").on(t.documentId),
    index("grant_grantee_idx").on(t.granteeUserId),
  ],
)
