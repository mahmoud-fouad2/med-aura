import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm"
import { db, isDbConfigured } from "@/lib/db"
import { providerApplication, user as userT } from "@/lib/db/schema"

export type ApplicationListFilters = {
  q?: string
  kind?: string
  status?: string
}

export type AdminApplicationRow = {
  id: string
  kind: string
  status: string
  payload: unknown
  submittedAt: Date | null
  createdAt: Date
  notes: string | null
  applicantName: string
  applicantEmail: string
}

const PAGE_SIZE_DEFAULT = 15

export async function listApplicationsForAdmin(
  filters: ApplicationListFilters,
  page = 1,
  pageSize = PAGE_SIZE_DEFAULT,
): Promise<{ rows: AdminApplicationRow[]; totalCount: number; totalPages: number }> {
  if (!isDbConfigured) return { rows: [], totalCount: 0, totalPages: 1 }

  const conditions: SQL[] = []

  if (filters.q?.trim()) {
    const term = `%${filters.q.trim()}%`
    conditions.push(or(ilike(userT.name, term), ilike(userT.email, term))!)
  }
  if (filters.kind) conditions.push(eq(providerApplication.kind, filters.kind as (typeof providerApplication.kind.enumValues)[number]))
  if (filters.status) conditions.push(eq(providerApplication.status, filters.status as (typeof providerApplication.status.enumValues)[number]))

  const where = conditions.length > 0 ? and(...conditions) : undefined

  const baseQuery = db
    .select({
      id: providerApplication.id,
      kind: providerApplication.kind,
      status: providerApplication.status,
      payload: providerApplication.payload,
      submittedAt: providerApplication.submittedAt,
      createdAt: providerApplication.createdAt,
      notes: providerApplication.reviewerNotes,
      applicantName: userT.name,
      applicantEmail: userT.email,
    })
    .from(providerApplication)
    .innerJoin(userT, eq(providerApplication.applicantUserId, userT.id))

  const [rows, countResult] = await Promise.all([
    baseQuery.where(where).orderBy(desc(providerApplication.createdAt)).limit(pageSize).offset((page - 1) * pageSize),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(providerApplication)
      .innerJoin(userT, eq(providerApplication.applicantUserId, userT.id))
      .where(where),
  ])

  const totalCount = countResult[0]?.n ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  return { rows, totalCount, totalPages }
}
