import { and, asc, desc, eq, inArray, ne, sql } from "drizzle-orm"
import { db, isDbConfigured } from "@/lib/db"
import { article, type Article } from "@/lib/db/schema"

export type { Article }

export async function listPublishedArticles(options?: {
  category?: string
  countryCode?: string
  limit?: number
  offset?: number
}): Promise<{ articles: Article[]; total: number }> {
  if (!isDbConfigured) return { articles: [], total: 0 }

  const conditions = [eq(article.published, true)]
  if (options?.category && options.category !== "ALL") {
    conditions.push(eq(article.category, options.category))
  }
  if (options?.countryCode && options.countryCode !== "ALL") {
    conditions.push(eq(article.countryCode, options.countryCode.toUpperCase()))
  }

  const whereClause = and(...conditions)

  const [rows, countRow] = await Promise.all([
    db
      .select()
      .from(article)
      .where(whereClause)
      .orderBy(asc(article.sortOrder), desc(article.createdAt))
      .limit(options?.limit ?? 20)
      .offset(options?.offset ?? 0),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(article)
      .where(whereClause),
  ])

  return {
    articles: rows,
    total: countRow[0]?.count ?? 0,
  }
}

export async function getFeaturedArticles(limit = 3): Promise<Article[]> {
  if (!isDbConfigured) return []

  return db
    .select()
    .from(article)
    .where(and(eq(article.published, true), eq(article.featured, true)))
    .orderBy(asc(article.sortOrder), desc(article.createdAt))
    .limit(limit)
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  if (!isDbConfigured) return null

  const rows = await db
    .select()
    .from(article)
    .where(eq(article.slug, slug))
    .limit(1)

  return rows[0] ?? null
}

export async function getRelatedArticles(
  currentSlug: string,
  category: string,
  countryCode?: string | null,
  limit = 3,
): Promise<Article[]> {
  if (!isDbConfigured) return []

  const conditions = [
    eq(article.published, true),
    ne(article.slug, currentSlug),
  ]

  if (countryCode) {
    conditions.push(eq(article.countryCode, countryCode))
  }

  const rows = await db
    .select()
    .from(article)
    .where(and(...conditions))
    .orderBy(desc(article.createdAt))
    .limit(limit)

  if (rows.length < limit) {
    const fallbackRows = await db
      .select()
      .from(article)
      .where(and(eq(article.published, true), ne(article.slug, currentSlug)))
      .orderBy(desc(article.createdAt))
      .limit(limit)
    return fallbackRows
  }

  return rows
}

export async function listArticlesForAdmin(): Promise<Article[]> {
  if (!isDbConfigured) return []

  return db
    .select()
    .from(article)
    .orderBy(asc(article.sortOrder), desc(article.createdAt))
}
