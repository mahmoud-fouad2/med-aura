import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm"
import { db, isDbConfigured } from "@/lib/db"
import { contactMessage } from "@/lib/db/schema"

export type AdminContactMessageRow = {
  id: string
  name: string
  email: string
  phone: string | null
  subject: string
  message: string
  status: string
  handledBy: string | null
  repliedAt: Date | null
  createdAt: Date
}

export type ContactMessageListFilters = { q?: string; status?: string }

const MESSAGE_PAGE_SIZE = 20

export async function listContactMessagesForAdmin(
  filters?: ContactMessageListFilters,
  page = 1,
  pageSize = MESSAGE_PAGE_SIZE,
): Promise<{ rows: AdminContactMessageRow[]; totalCount: number; totalPages: number; newCount: number }> {
  if (!isDbConfigured) return { rows: [], totalCount: 0, totalPages: 1, newCount: 0 }

  const conditions: SQL[] = []
  if (filters?.q?.trim()) {
    const term = `%${filters.q.trim()}%`
    conditions.push(
      or(
        ilike(contactMessage.name, term),
        ilike(contactMessage.email, term),
        ilike(contactMessage.subject, term),
      )!,
    )
  }
  if (filters?.status) conditions.push(eq(contactMessage.status, filters.status))
  const where = conditions.length > 0 ? and(...conditions) : undefined

  const [rows, countResult, newResult] = await Promise.all([
    db
      .select()
      .from(contactMessage)
      .where(where)
      .orderBy(desc(contactMessage.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ n: sql<number>`count(*)::int` }).from(contactMessage).where(where),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(contactMessage)
      .where(eq(contactMessage.status, "new")),
  ])

  const totalCount = countResult[0]?.n ?? 0
  return {
    rows,
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
    newCount: newResult[0]?.n ?? 0,
  }
}
