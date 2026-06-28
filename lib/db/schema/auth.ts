import {
  pgTable,
  text,
  timestamp,
  boolean,
  uniqueIndex,
  index,
  primaryKey,
} from "drizzle-orm/pg-core"
import { lifecycle, userStatusEnum } from "./_shared"

/* ──────────────────────────────────────────────────────────────────────────
 * Better Auth core tables.
 * Column names are camelCase to match Better Auth's expectations exactly.
 * Do NOT rename these columns — Better Auth reads/writes them via the pg pool.
 * ────────────────────────────────────────────────────────────────────────── */

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),

  // Med Aura extensions (defaults let Better Auth insert without these).
  // `role` is the denormalised PRIMARY role for fast routing only. The
  // authoritative permission source is the RBAC tables (userRole/rolePermission).
  // Public signup can only ever produce "patient" (enforced in lib/auth.ts).
  role: text("role").notNull().default("patient"),
  status: userStatusEnum("status").notNull().default("active"),
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

/* ──────────────────────────────────────────────────────────────────────────
 * RBAC — real roles & permissions (section 13).
 * Authorization decisions use these tables, never the raw user.role string.
 * ────────────────────────────────────────────────────────────────────────── */

export const role = pgTable("role", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  // canonical key, e.g. "patient", "doctor", "super_admin"
  key: text("key").notNull().unique(),
  nameAr: text("nameAr").notNull(),
  nameEn: text("nameEn").notNull(),
  description: text("description"),
  isSystem: boolean("isSystem").notNull().default(true),
  ...lifecycle(),
})

export const permission = pgTable("permission", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  // e.g. "case:read", "appointment:confirm", "provider:approve"
  key: text("key").notNull().unique(),
  description: text("description"),
  ...lifecycle(),
})

export const rolePermission = pgTable(
  "role_permission",
  {
    roleId: text("roleId")
      .notNull()
      .references(() => role.id, { onDelete: "cascade" }),
    permissionId: text("permissionId")
      .notNull()
      .references(() => permission.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.roleId, t.permissionId] })],
)

export const userRole = pgTable(
  "user_role",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    roleId: text("roleId")
      .notNull()
      .references(() => role.id, { onDelete: "cascade" }),
    // Optional center scope: a role granted only within one center.
    centerId: text("centerId"),
    grantedBy: text("grantedBy"),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("user_role_unique").on(t.userId, t.roleId, t.centerId),
    index("user_role_user_idx").on(t.userId),
  ],
)
