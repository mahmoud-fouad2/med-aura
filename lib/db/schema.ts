import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  numeric,
} from "drizzle-orm/pg-core"

/* ------------------------------------------------------------------ */
/* Better Auth tables (camelCase columns — do not rename)             */
/* ------------------------------------------------------------------ */

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  // MED AURA extensions
  role: text("role").notNull().default("patient"), // patient | provider | admin
  phone: text("phone"),
  country: text("country"),
  locale: text("locale").notNull().default("ar"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expiresAt").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
})

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

/* ------------------------------------------------------------------ */
/* MED AURA domain tables                                             */
/* ------------------------------------------------------------------ */

export const center = pgTable("center", {
  id: text("id").primaryKey(),
  ownerId: text("ownerId"),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  specialties: text("specialties").array().notNull().default([]),
  country: text("country").notNull(),
  city: text("city"),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  logoKey: text("logoKey"),
  coverKey: text("coverKey"),
  galleryKeys: text("galleryKeys").array().notNull().default([]),
  accreditations: text("accreditations").array().notNull().default([]),
  rating: numeric("rating", { precision: 2, scale: 1 }).notNull().default("0"),
  reviewCount: integer("reviewCount").notNull().default(0),
  verified: boolean("verified").notNull().default(false),
  status: text("status").notNull().default("pending"), // pending | approved | rejected
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const doctor = pgTable("doctor", {
  id: text("id").primaryKey(),
  userId: text("userId"),
  centerId: text("centerId"),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  title: text("title"),
  bio: text("bio"),
  specialties: text("specialties").array().notNull().default([]),
  languages: text("languages").array().notNull().default([]),
  country: text("country").notNull(),
  city: text("city"),
  photoKey: text("photoKey"),
  yearsExperience: integer("yearsExperience").notNull().default(0),
  rating: numeric("rating", { precision: 2, scale: 1 }).notNull().default("0"),
  reviewCount: integer("reviewCount").notNull().default(0),
  verified: boolean("verified").notNull().default(false),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const treatment = pgTable("treatment", {
  id: text("id").primaryKey(),
  centerId: text("centerId"),
  doctorId: text("doctorId"),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  category: text("category").notNull(),
  description: text("description"),
  priceFrom: numeric("priceFrom", { precision: 12, scale: 2 }),
  priceTo: numeric("priceTo", { precision: 12, scale: 2 }),
  currency: text("currency").notNull().default("USD"),
  durationDays: integer("durationDays"),
  imageKey: text("imageKey"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const inquiry = pgTable("inquiry", {
  id: text("id").primaryKey(),
  patientId: text("patientId"),
  centerId: text("centerId"),
  doctorId: text("doctorId"),
  treatmentId: text("treatmentId"),
  fullName: text("fullName").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  country: text("country"),
  message: text("message").notNull(),
  attachmentKeys: text("attachmentKeys").array().notNull().default([]),
  status: text("status").notNull().default("new"), // new | contacted | closed
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const review = pgTable("review", {
  id: text("id").primaryKey(),
  authorId: text("authorId").notNull(),
  centerId: text("centerId"),
  doctorId: text("doctorId"),
  rating: integer("rating").notNull(),
  title: text("title"),
  body: text("body").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})
