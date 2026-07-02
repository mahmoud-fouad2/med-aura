import { and, asc, desc, eq, ilike, inArray, or, gte, lte, sql, type SQL } from "drizzle-orm"
import { db, isDbConfigured } from "@/lib/db"
import {
  aestheticCase,
  procedure as procedureT,
  doctorProfile,
  center as centerT,
  user as userT,
  invoice,
  safetyAlert,
} from "@/lib/db/schema"

const OPEN_SAFETY_STATUSES = ["OPEN", "ACKNOWLEDGED", "CONTACTED", "PROVIDER_REVIEWED", "REFERRED_TO_EMERGENCY"] as const
const SEVERITY_RANK: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }

export type CaseListFilters = {
  q?: string
  status?: string
  doctorId?: string
  centerId?: string
  procedureId?: string
  country?: string
  paymentStatus?: string
  severity?: string
  from?: string
  to?: string
  sort?: "newest" | "oldest" | "updated"
}

export type AdminCaseRow = {
  id: string
  reference: string
  status: string
  procedureName: string
  patientName: string
  doctorName: string | null
  centerName: string | null
  country: string | null
  createdAt: Date
  updatedAt: Date
  paymentStatus: string | null
  severity: string | null
}

const PAGE_SIZE_DEFAULT = 20

export async function listCasesForAdmin(
  filters: CaseListFilters,
  page = 1,
  pageSize = PAGE_SIZE_DEFAULT,
): Promise<{ rows: AdminCaseRow[]; totalCount: number; totalPages: number }> {
  if (!isDbConfigured) return { rows: [], totalCount: 0, totalPages: 1 }

  const conditions: SQL[] = []

  if (filters.q?.trim()) {
    const term = `%${filters.q.trim()}%`
    conditions.push(
      or(
        ilike(aestheticCase.reference, term),
        ilike(userT.name, term),
        ilike(doctorProfile.name, term),
      )!,
    )
  }
  if (filters.status) conditions.push(eq(aestheticCase.status, filters.status as (typeof aestheticCase.status.enumValues)[number]))
  if (filters.doctorId) conditions.push(eq(aestheticCase.doctorId, filters.doctorId))
  if (filters.centerId) conditions.push(eq(aestheticCase.centerId, filters.centerId))
  if (filters.procedureId) conditions.push(eq(aestheticCase.procedureId, filters.procedureId))
  if (filters.country) conditions.push(eq(aestheticCase.preferredCountry, filters.country))
  if (filters.from) conditions.push(gte(aestheticCase.createdAt, new Date(filters.from)))
  if (filters.to) conditions.push(lte(aestheticCase.createdAt, new Date(filters.to)))

  // Payment/severity live on related tables — resolve the qualifying case-id
  // set first, then fold it in as one more WHERE condition so LIMIT/OFFSET
  // still paginate correctly (no row fan-out from the join).
  if (filters.paymentStatus) {
    const rows = await db
      .selectDistinct({ caseId: invoice.caseId })
      .from(invoice)
      .where(eq(invoice.status, filters.paymentStatus as (typeof invoice.status.enumValues)[number]))
    const ids = rows.map((r) => r.caseId).filter((id): id is string => id != null)
    conditions.push(inArray(aestheticCase.id, ids.length > 0 ? ids : ["__none__"]))
  }
  if (filters.severity) {
    const rows = await db
      .selectDistinct({ caseId: safetyAlert.caseId })
      .from(safetyAlert)
      .where(and(eq(safetyAlert.severity, filters.severity as (typeof safetyAlert.severity.enumValues)[number]), inArray(safetyAlert.status, OPEN_SAFETY_STATUSES)))
    const ids = rows.map((r) => r.caseId)
    conditions.push(inArray(aestheticCase.id, ids.length > 0 ? ids : ["__none__"]))
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined
  const orderBy =
    filters.sort === "oldest"
      ? asc(aestheticCase.createdAt)
      : filters.sort === "updated"
        ? desc(aestheticCase.updatedAt)
        : desc(aestheticCase.createdAt)

  const baseQuery = db
    .select({
      id: aestheticCase.id,
      reference: aestheticCase.reference,
      status: aestheticCase.status,
      procedureName: procedureT.nameAr,
      patientName: userT.name,
      doctorName: doctorProfile.name,
      centerName: centerT.name,
      country: aestheticCase.preferredCountry,
      createdAt: aestheticCase.createdAt,
      updatedAt: aestheticCase.updatedAt,
    })
    .from(aestheticCase)
    .innerJoin(procedureT, eq(aestheticCase.procedureId, procedureT.id))
    .innerJoin(userT, eq(aestheticCase.patientUserId, userT.id))
    .leftJoin(doctorProfile, eq(aestheticCase.doctorId, doctorProfile.id))
    .leftJoin(centerT, eq(aestheticCase.centerId, centerT.id))

  const [rows, countResult] = await Promise.all([
    baseQuery.where(where).orderBy(orderBy).limit(pageSize).offset((page - 1) * pageSize),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(aestheticCase)
      .innerJoin(procedureT, eq(aestheticCase.procedureId, procedureT.id))
      .innerJoin(userT, eq(aestheticCase.patientUserId, userT.id))
      .leftJoin(doctorProfile, eq(aestheticCase.doctorId, doctorProfile.id))
      .leftJoin(centerT, eq(aestheticCase.centerId, centerT.id))
      .where(where),
  ])

  const totalCount = countResult[0]?.n ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  if (rows.length === 0) return { rows: [], totalCount, totalPages }

  const ids = rows.map((r) => r.id)
  const [invoiceRows, safetyRows] = await Promise.all([
    db.select({ caseId: invoice.caseId, status: invoice.status, createdAt: invoice.createdAt }).from(invoice).where(inArray(invoice.caseId, ids)),
    db
      .select({ caseId: safetyAlert.caseId, severity: safetyAlert.severity })
      .from(safetyAlert)
      .where(and(inArray(safetyAlert.caseId, ids), inArray(safetyAlert.status, OPEN_SAFETY_STATUSES))),
  ])

  const paymentByCaseId = new Map<string, string>()
  for (const inv of invoiceRows) {
    if (!inv.caseId) continue
    const existingAt = paymentByCaseId.has(inv.caseId)
    if (!existingAt) paymentByCaseId.set(inv.caseId, inv.status)
  }
  const severityByCaseId = new Map<string, string>()
  for (const s of safetyRows) {
    const current = severityByCaseId.get(s.caseId)
    if (!current || SEVERITY_RANK[s.severity] > SEVERITY_RANK[current]) {
      severityByCaseId.set(s.caseId, s.severity)
    }
  }

  return {
    rows: rows.map((r) => ({
      ...r,
      paymentStatus: paymentByCaseId.get(r.id) ?? null,
      severity: severityByCaseId.get(r.id) ?? null,
    })),
    totalCount,
    totalPages,
  }
}

export type FilterOption = { id: string; label: string }

export async function listCaseFilterOptions(): Promise<{
  doctors: FilterOption[]
  centers: FilterOption[]
  procedures: FilterOption[]
  countries: FilterOption[]
}> {
  if (!isDbConfigured) return { doctors: [], centers: [], procedures: [], countries: [] }

  const [doctors, centers, procedures, countryRows] = await Promise.all([
    db.select({ id: doctorProfile.id, label: doctorProfile.name }).from(doctorProfile).where(eq(doctorProfile.status, "approved")).orderBy(asc(doctorProfile.name)),
    db.select({ id: centerT.id, label: centerT.name }).from(centerT).where(eq(centerT.status, "approved")).orderBy(asc(centerT.name)),
    db.select({ id: procedureT.id, label: procedureT.nameAr }).from(procedureT).orderBy(asc(procedureT.nameAr)),
    db.selectDistinct({ country: aestheticCase.preferredCountry }).from(aestheticCase),
  ])

  const countries = countryRows
    .map((r) => r.country)
    .filter((c): c is string => Boolean(c))
    .sort()
    .map((c) => ({ id: c, label: c }))

  return { doctors, centers, procedures, countries }
}
