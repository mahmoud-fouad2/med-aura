import { and, desc, eq, gte, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { analyticsEvent } from "@/lib/db/schema"

export async function getAnalyticsOverview(days = 30) {
  const since = new Date(Date.now() - days * 86_400_000)
  const [counts, visitors, topPages] = await Promise.all([
    db
      .select({ name: analyticsEvent.name, count: sql<number>`count(*)::int` })
      .from(analyticsEvent)
      .where(gte(analyticsEvent.createdAt, since))
      .groupBy(analyticsEvent.name),
    db
      .select({ count: sql<number>`count(distinct ${analyticsEvent.anonymousId})::int` })
      .from(analyticsEvent)
      .where(gte(analyticsEvent.createdAt, since)),
    db
      .select({ path: analyticsEvent.path, count: sql<number>`count(*)::int` })
      .from(analyticsEvent)
      .where(
        and(
          gte(analyticsEvent.createdAt, since),
          eq(analyticsEvent.name, "page_view"),
        ),
      )
      .groupBy(analyticsEvent.path)
      .orderBy(desc(sql`count(*)`))
      .limit(12),
  ])
  return {
    days,
    visitors: visitors[0]?.count ?? 0,
    counts: new Map(counts.map((row) => [row.name, row.count])),
    topPages: topPages.filter((row): row is { path: string; count: number } => Boolean(row.path)),
  }
}
