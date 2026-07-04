import { and, asc, desc, eq, inArray, sql } from "drizzle-orm"
import { db, isDbConfigured } from "@/lib/db"
import {
  beforeAfterCase,
  beforeAfterMedia,
  doctorProfile,
  center,
  procedure as procedureT,
} from "@/lib/db/schema"
import { getPublicUrl } from "@/lib/storage/r2"

export type BeforeAfterPublicItem = {
  id: string
  titleAr: string
  titleEn: string | null
  descriptionAr: string | null
  ageRange: string | null
  gender: string | null
  publishedAt: Date | null
  procedureNameAr: string
  procedureSlug: string
  doctorName: string | null
  doctorSlug: string | null
  centerName: string | null
  centerSlug: string | null
  beforeUrl: string | null
  afterUrl: string | null
}

/**
 * Public listing of moderation-approved Before/After entries. Consent is
 * enforced at the database level (only rows where consentGranted = true AND
 * status = APPROVED reach the public API). The response never includes any
 * patient identifier or link back to a source case.
 */
export async function listPublicBeforeAfter(opts?: {
  procedureSlug?: string
  doctorSlug?: string
  centerSlug?: string
  limit?: number
}): Promise<BeforeAfterPublicItem[]> {
  if (!isDbConfigured) return []
  const conditions = [
    eq(beforeAfterCase.status, "APPROVED" as const),
    eq(beforeAfterCase.consentGranted, true),
  ]
  if (opts?.procedureSlug) {
    conditions.push(eq(procedureT.slug, opts.procedureSlug))
  }
  if (opts?.doctorSlug) {
    conditions.push(eq(doctorProfile.slug, opts.doctorSlug))
  }
  if (opts?.centerSlug) {
    conditions.push(eq(center.slug, opts.centerSlug))
  }

  const rows = await db
    .select({
      id: beforeAfterCase.id,
      titleAr: beforeAfterCase.titleAr,
      titleEn: beforeAfterCase.titleEn,
      descriptionAr: beforeAfterCase.descriptionAr,
      ageRange: beforeAfterCase.ageRange,
      gender: beforeAfterCase.gender,
      publishedAt: beforeAfterCase.publishedAt,
      procedureNameAr: procedureT.nameAr,
      procedureSlug: procedureT.slug,
      doctorName: doctorProfile.name,
      doctorSlug: doctorProfile.slug,
      centerName: center.name,
      centerSlug: center.slug,
    })
    .from(beforeAfterCase)
    .innerJoin(procedureT, eq(beforeAfterCase.procedureId, procedureT.id))
    .leftJoin(doctorProfile, eq(beforeAfterCase.doctorId, doctorProfile.id))
    .leftJoin(center, eq(beforeAfterCase.centerId, center.id))
    .where(and(...conditions))
    .orderBy(desc(beforeAfterCase.publishedAt))
    .limit(opts?.limit ?? 48)

  if (rows.length === 0) return []
  const ids = rows.map((r) => r.id)
  const media = await db
    .select({
      caseId: beforeAfterMedia.caseId,
      kind: beforeAfterMedia.kind,
      objectKey: beforeAfterMedia.objectKey,
      sortOrder: beforeAfterMedia.sortOrder,
    })
    .from(beforeAfterMedia)
    .where(inArray(beforeAfterMedia.caseId, ids))
    .orderBy(asc(beforeAfterMedia.sortOrder))

  const beforeByCase = new Map<string, string>()
  const afterByCase = new Map<string, string>()
  for (const m of media) {
    if (m.kind === "BEFORE" && !beforeByCase.has(m.caseId))
      beforeByCase.set(m.caseId, m.objectKey)
    if (m.kind === "AFTER" && !afterByCase.has(m.caseId))
      afterByCase.set(m.caseId, m.objectKey)
  }

  return rows.map((r) => ({
    ...r,
    beforeUrl: beforeByCase.get(r.id) ? getPublicUrl(beforeByCase.get(r.id)!) : null,
    afterUrl: afterByCase.get(r.id) ? getPublicUrl(afterByCase.get(r.id)!) : null,
  }))
}

export type BeforeAfterQueueItem = {
  id: string
  titleAr: string
  status: string
  consentGranted: boolean
  procedureNameAr: string
  doctorName: string | null
  centerName: string | null
  createdAt: Date
  publishedAt: Date | null
  rejectionReason: string | null
  createdByName: string | null
  beforeUrl: string | null
  afterUrl: string | null
}

/**
 * Full moderation queue for Admin/Compliance. Returns every entry across all
 * statuses so reviewers can also inspect approved / rejected / archived items.
 * A status filter narrows the list; without a filter the queue defaults to
 * items awaiting review.
 */
export async function listBeforeAfterQueue(
  status?: string,
): Promise<BeforeAfterQueueItem[]> {
  if (!isDbConfigured) return []
  const cond = status
    ? [eq(beforeAfterCase.status, status as never)]
    : [eq(beforeAfterCase.status, "SUBMITTED" as const)]

  const rows = await db
    .select({
      id: beforeAfterCase.id,
      titleAr: beforeAfterCase.titleAr,
      status: beforeAfterCase.status,
      consentGranted: beforeAfterCase.consentGranted,
      procedureNameAr: procedureT.nameAr,
      doctorName: doctorProfile.name,
      centerName: center.name,
      createdAt: beforeAfterCase.createdAt,
      publishedAt: beforeAfterCase.publishedAt,
      rejectionReason: beforeAfterCase.rejectionReason,
      createdByName: sql<string | null>`null`,
    })
    .from(beforeAfterCase)
    .innerJoin(procedureT, eq(beforeAfterCase.procedureId, procedureT.id))
    .leftJoin(doctorProfile, eq(beforeAfterCase.doctorId, doctorProfile.id))
    .leftJoin(center, eq(beforeAfterCase.centerId, center.id))
    .where(and(...cond))
    .orderBy(desc(beforeAfterCase.createdAt))
    .limit(200)

  if (rows.length === 0) return []
  const ids = rows.map((r) => r.id)
  const media = await db
    .select({
      caseId: beforeAfterMedia.caseId,
      kind: beforeAfterMedia.kind,
      objectKey: beforeAfterMedia.objectKey,
    })
    .from(beforeAfterMedia)
    .where(inArray(beforeAfterMedia.caseId, ids))

  const bmap = new Map<string, string>()
  const amap = new Map<string, string>()
  for (const m of media) {
    if (m.kind === "BEFORE" && !bmap.has(m.caseId)) bmap.set(m.caseId, m.objectKey)
    if (m.kind === "AFTER" && !amap.has(m.caseId)) amap.set(m.caseId, m.objectKey)
  }

  return rows.map((r) => ({
    ...r,
    beforeUrl: bmap.get(r.id) ? getPublicUrl(bmap.get(r.id)!) : null,
    afterUrl: amap.get(r.id) ? getPublicUrl(amap.get(r.id)!) : null,
  }))
}

/** Provider self-view — every entry owned by the caller across all statuses. */
export async function listBeforeAfterForOwner(opts: {
  doctorIds?: string[]
  centerIds?: string[]
}): Promise<BeforeAfterQueueItem[]> {
  if (!isDbConfigured) return []
  const parts: ReturnType<typeof eq>[] = []
  if (opts.doctorIds?.length) {
    parts.push(inArray(beforeAfterCase.doctorId, opts.doctorIds))
  }
  if (opts.centerIds?.length) {
    parts.push(inArray(beforeAfterCase.centerId, opts.centerIds))
  }
  if (parts.length === 0) return []
  const rows = await db
    .select({
      id: beforeAfterCase.id,
      titleAr: beforeAfterCase.titleAr,
      status: beforeAfterCase.status,
      consentGranted: beforeAfterCase.consentGranted,
      procedureNameAr: procedureT.nameAr,
      doctorName: doctorProfile.name,
      centerName: center.name,
      createdAt: beforeAfterCase.createdAt,
      publishedAt: beforeAfterCase.publishedAt,
      rejectionReason: beforeAfterCase.rejectionReason,
      createdByName: sql<string | null>`null`,
    })
    .from(beforeAfterCase)
    .innerJoin(procedureT, eq(beforeAfterCase.procedureId, procedureT.id))
    .leftJoin(doctorProfile, eq(beforeAfterCase.doctorId, doctorProfile.id))
    .leftJoin(center, eq(beforeAfterCase.centerId, center.id))
    .where(parts.length === 1 ? parts[0] : sql`(${parts[0]}) OR (${parts[1]})`)
    .orderBy(desc(beforeAfterCase.createdAt))
    .limit(100)

  if (rows.length === 0) return []
  const ids = rows.map((r) => r.id)
  const media = await db
    .select({
      caseId: beforeAfterMedia.caseId,
      kind: beforeAfterMedia.kind,
      objectKey: beforeAfterMedia.objectKey,
    })
    .from(beforeAfterMedia)
    .where(inArray(beforeAfterMedia.caseId, ids))

  const bmap = new Map<string, string>()
  const amap = new Map<string, string>()
  for (const m of media) {
    if (m.kind === "BEFORE" && !bmap.has(m.caseId)) bmap.set(m.caseId, m.objectKey)
    if (m.kind === "AFTER" && !amap.has(m.caseId)) amap.set(m.caseId, m.objectKey)
  }

  return rows.map((r) => ({
    ...r,
    beforeUrl: bmap.get(r.id) ? getPublicUrl(bmap.get(r.id)!) : null,
    afterUrl: amap.get(r.id) ? getPublicUrl(amap.get(r.id)!) : null,
  }))
}
