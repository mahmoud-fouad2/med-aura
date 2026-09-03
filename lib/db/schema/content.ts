import {
  pgTable,
  text,
  integer,
  boolean,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core"
import { lifecycle, authorship } from "./_shared"

export const article = pgTable(
  "article",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    slug: text("slug").notNull().unique(),
    titleAr: text("titleAr").notNull(),
    titleEn: text("titleEn").notNull(),
    excerptAr: text("excerptAr").notNull(),
    excerptEn: text("excerptEn").notNull(),
    contentAr: text("contentAr").notNull(),
    contentEn: text("contentEn").notNull(),
    coverImage: text("coverImage").notNull(),
    category: text("category").notNull().default("seo_geo"),
    countryCode: text("countryCode"), // ISO country code e.g. "SA", "TR", "AE", "EG", "JO", etc.
    tags: text("tags").array().notNull().default([]),
    authorNameAr: text("authorNameAr").notNull().default("فريق Med Aura الطبي"),
    authorNameEn: text("authorNameEn").notNull().default("Med Aura Medical Editorial"),
    readTimeMinutes: integer("readTimeMinutes").notNull().default(5),
    seoTitleAr: text("seoTitleAr"),
    seoTitleEn: text("seoTitleEn"),
    seoDescriptionAr: text("seoDescriptionAr"),
    seoDescriptionEn: text("seoDescriptionEn"),
    published: boolean("published").notNull().default(true),
    featured: boolean("featured").notNull().default(false),
    sortOrder: integer("sortOrder").notNull().default(0),
    ...lifecycle(),
    ...authorship(),
  },
  (t) => [
    index("article_published_idx").on(t.published),
    index("article_featured_idx").on(t.featured),
    index("article_country_idx").on(t.countryCode),
    uniqueIndex("article_slug_idx").on(t.slug),
  ],
)

export type Article = typeof article.$inferSelect
export type NewArticle = typeof article.$inferInsert
