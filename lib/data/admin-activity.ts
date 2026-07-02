import { and, desc, eq, gte, inArray, lte, ilike } from "drizzle-orm"
import { db, isDbConfigured } from "@/lib/db"
import { auditLog, user as userT } from "@/lib/db/schema"

export type ActivityRow = {
  id: string
  action: string
  entityType: string | null
  entityId: string | null
  actorName: string | null
  createdAt: Date
  metadata: Record<string, unknown>
}

function mapRow(r: {
  id: string
  action: string
  entityType: string | null
  entityId: string | null
  actorName: string | null
  createdAt: Date
  metadata: unknown
}): ActivityRow {
  return { ...r, metadata: (r.metadata ?? {}) as Record<string, unknown> }
}

export async function listRecentActivity(limit = 10): Promise<ActivityRow[]> {
  if (!isDbConfigured) return []
  const rows = await db
    .select({
      id: auditLog.id,
      action: auditLog.action,
      entityType: auditLog.entityType,
      entityId: auditLog.entityId,
      actorName: userT.name,
      createdAt: auditLog.createdAt,
      metadata: auditLog.metadata,
    })
    .from(auditLog)
    .leftJoin(userT, eq(auditLog.actorUserId, userT.id))
    .orderBy(desc(auditLog.createdAt))
    .limit(limit)
  return rows.map(mapRow)
}

/** Every audit entry touching this case or any of its related sub-records (quote, payment, safety alert, ...). */
export async function listActivityForEntityIds(entityIds: string[], limit = 100): Promise<ActivityRow[]> {
  if (!isDbConfigured || entityIds.length === 0) return []
  const rows = await db
    .select({
      id: auditLog.id,
      action: auditLog.action,
      entityType: auditLog.entityType,
      entityId: auditLog.entityId,
      actorName: userT.name,
      createdAt: auditLog.createdAt,
      metadata: auditLog.metadata,
    })
    .from(auditLog)
    .leftJoin(userT, eq(auditLog.actorUserId, userT.id))
    .where(inArray(auditLog.entityId, entityIds))
    .orderBy(desc(auditLog.createdAt))
    .limit(limit)
  return rows.map(mapRow)
}

export type ActivityFilter = {
  action?: string
  actorName?: string
  from?: string
  to?: string
}
export async function searchActivity(filter: ActivityFilter, limit = 100): Promise<ActivityRow[]> {
  if (!isDbConfigured) return []
  const conditions = []
  if (filter.action) conditions.push(ilike(auditLog.action, `%${filter.action}%`))
  if (filter.actorName) conditions.push(ilike(userT.name, `%${filter.actorName}%`))
  if (filter.from) conditions.push(gte(auditLog.createdAt, new Date(filter.from)))
  if (filter.to) conditions.push(lte(auditLog.createdAt, new Date(filter.to)))

  const rows = await db
    .select({
      id: auditLog.id,
      action: auditLog.action,
      entityType: auditLog.entityType,
      entityId: auditLog.entityId,
      actorName: userT.name,
      createdAt: auditLog.createdAt,
      metadata: auditLog.metadata,
    })
    .from(auditLog)
    .leftJoin(userT, eq(auditLog.actorUserId, userT.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(auditLog.createdAt))
    .limit(limit)
  return rows.map(mapRow)
}
