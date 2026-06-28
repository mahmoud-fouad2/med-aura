import {
  pgTable,
  text,
  integer,
  boolean,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core"
import { lifecycle, authorship } from "./_shared"

export const country = pgTable("country", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  code: text("code").notNull().unique(), // ISO-3166 alpha-2, e.g. "SA"
  nameAr: text("nameAr").notNull(),
  nameEn: text("nameEn").notNull(),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sortOrder").notNull().default(0),
  ...lifecycle(),
})

export const city = pgTable(
  "city",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    countryId: text("countryId")
      .notNull()
      .references(() => country.id, { onDelete: "cascade" }),
    nameAr: text("nameAr").notNull(),
    nameEn: text("nameEn").notNull(),
    active: boolean("active").notNull().default(true),
    ...lifecycle(),
  },
  (t) => [index("city_country_idx").on(t.countryId)],
)

/**
 * Cosmetic-only categories (section 5). Managed by Super Admin — never
 * hard-coded in components. General medical specialties are intentionally absent.
 */
export const procedureCategory = pgTable(
  "procedure_category",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    slug: text("slug").notNull().unique(),
    nameAr: text("nameAr").notNull(),
    nameEn: text("nameEn").notNull(),
    descriptionAr: text("descriptionAr"),
    descriptionEn: text("descriptionEn"),
    icon: text("icon"), // lucide icon name or asset key
    sortOrder: integer("sortOrder").notNull().default(0),
    // hidden categories (e.g. intimate cosmetic, dental) until enabled by admin
    visible: boolean("visible").notNull().default(true),
    ...lifecycle(),
    ...authorship(),
  },
  (t) => [index("category_visible_idx").on(t.visible)],
)

export const procedure = pgTable(
  "procedure",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    categoryId: text("categoryId")
      .notNull()
      .references(() => procedureCategory.id, { onDelete: "restrict" }),
    slug: text("slug").notNull().unique(),
    nameAr: text("nameAr").notNull(),
    nameEn: text("nameEn").notNull(),
    descriptionAr: text("descriptionAr"),
    descriptionEn: text("descriptionEn"),
    isSurgical: boolean("isSurgical").notNull().default(false),
    // estimated recovery in days (nullable when not applicable)
    recoveryDays: integer("recoveryDays"),
    // default consultation type required before this procedure
    requiredConsultation: text("requiredConsultation"),
    // SEO
    seoTitleAr: text("seoTitleAr"),
    seoTitleEn: text("seoTitleEn"),
    seoDescriptionAr: text("seoDescriptionAr"),
    seoDescriptionEn: text("seoDescriptionEn"),
    visible: boolean("visible").notNull().default(true),
    sortOrder: integer("sortOrder").notNull().default(0),
    ...lifecycle(),
    ...authorship(),
  },
  (t) => [
    index("procedure_category_idx").on(t.categoryId),
    index("procedure_visible_idx").on(t.visible),
    uniqueIndex("procedure_slug_idx").on(t.slug),
  ],
)
