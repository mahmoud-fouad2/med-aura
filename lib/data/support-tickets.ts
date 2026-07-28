import { and, asc, desc, eq, inArray, sql } from "drizzle-orm"
import { db, isDbConfigured } from "@/lib/db"
import { conversation, conversationParticipant, message, user as userT, userRole, role as roleT } from "@/lib/db/schema"
import { ROLES } from "@/lib/rbac"

export { TICKET_STATUSES, TICKET_CATEGORIES, type TicketStatus, type TicketCategory } from "@/lib/support-ticket-constants"

export type MyTicketRow = {
  id: string
  subject: string
  status: string
  category: string | null
  lastMessageAt: Date
  unreadForMe: boolean
  createdAt: Date
}

/** A patient/doctor's own ticket list — only conversations they participate in with no case attached. */
export async function listMyTickets(userId: string): Promise<MyTicketRow[]> {
  if (!isDbConfigured) return []

  const rows = await db
    .select({
      id: conversation.id,
      subject: conversation.subject,
      status: conversation.status,
      category: conversation.category,
      createdAt: conversation.createdAt,
      lastReadAt: conversationParticipant.lastReadAt,
    })
    .from(conversation)
    .innerJoin(conversationParticipant, eq(conversationParticipant.conversationId, conversation.id))
    .where(and(eq(conversationParticipant.userId, userId), sql`${conversation.caseId} is null`))
    .orderBy(desc(conversation.updatedAt))

  if (rows.length === 0) return []

  const lastMessages = await db
    .select({ conversationId: message.conversationId, lastAt: sql<Date>`max(${message.createdAt})` })
    .from(message)
    .where(inArray(message.conversationId, rows.map((r) => r.id)))
    .groupBy(message.conversationId)
  const lastAtById = new Map(lastMessages.map((m) => [m.conversationId, m.lastAt]))

  return rows.map((r) => {
    const lastMessageAt = lastAtById.get(r.id) ?? r.createdAt
    return {
      id: r.id,
      subject: r.subject ?? "بدون عنوان",
      status: r.status,
      category: r.category,
      lastMessageAt,
      unreadForMe: !r.lastReadAt || r.lastReadAt < lastMessageAt,
      createdAt: r.createdAt,
    }
  })
}

export type TicketMessageView = {
  id: string
  senderUserId: string
  senderName: string
  body: string
  createdAt: Date
}
export type TicketDetailView = {
  id: string
  subject: string
  status: string
  category: string | null
  createdAt: Date
  participants: { userId: string; name: string }[]
  messages: TicketMessageView[]
}

/**
 * null if the ticket doesn't exist, or the viewer isn't a participant and
 * isn't staff. Staff can view (and thereby reply to) any ticket before
 * joining as a participant — replyToTicket adds them at that point.
 */
export async function getTicketDetail(
  ticketId: string,
  viewerUserId: string,
  viewerCanManage = false,
): Promise<TicketDetailView | null> {
  if (!isDbConfigured) return null

  const conv = (
    await db
      .select({ id: conversation.id, subject: conversation.subject, status: conversation.status, category: conversation.category, createdAt: conversation.createdAt })
      .from(conversation)
      .where(and(eq(conversation.id, ticketId), sql`${conversation.caseId} is null`))
      .limit(1)
  )[0]
  if (!conv) return null

  const participants = await db
    .select({ userId: conversationParticipant.userId, name: userT.name })
    .from(conversationParticipant)
    .innerJoin(userT, eq(conversationParticipant.userId, userT.id))
    .where(eq(conversationParticipant.conversationId, ticketId))
  if (!viewerCanManage && !participants.some((p) => p.userId === viewerUserId)) return null

  const rows = await db
    .select({ id: message.id, senderUserId: message.senderUserId, senderName: userT.name, body: message.body, createdAt: message.createdAt })
    .from(message)
    .innerJoin(userT, eq(message.senderUserId, userT.id))
    .where(eq(message.conversationId, ticketId))
    .orderBy(asc(message.createdAt))

  return {
    id: conv.id,
    subject: conv.subject ?? "بدون عنوان",
    status: conv.status,
    category: conv.category,
    createdAt: conv.createdAt,
    participants,
    messages: rows,
  }
}

export type AdminTicketRow = {
  id: string
  subject: string
  status: string
  category: string | null
  patientName: string
  patientUserId: string
  lastMessageAt: Date
  createdAt: Date
}

export type TicketAdminFilters = {
  status?: string
  category?: string
  q?: string
}

/** Staff view — every standalone ticket, newest activity first. Capped like the other triage-style admin lists in this app. */
export async function listTicketsForAdmin(filters: TicketAdminFilters = {}): Promise<AdminTicketRow[]> {
  if (!isDbConfigured) return []

  const conditions = [sql`${conversation.caseId} is null`]
  if (filters.status) conditions.push(eq(conversation.status, filters.status))
  if (filters.category) conditions.push(eq(conversation.category, filters.category))
  if (filters.q) conditions.push(sql`(${conversation.subject} ilike ${`%${filters.q}%`} or ${userT.name} ilike ${`%${filters.q}%`})`)

  // The ticket "owner" is its first (oldest-joined) non-staff-role participant —
  // in practice always the patient who opened it, since staff only join by replying.
  const rows = await db
    .selectDistinctOn([conversation.id], {
      id: conversation.id,
      subject: conversation.subject,
      status: conversation.status,
      category: conversation.category,
      createdAt: conversation.createdAt,
      patientUserId: conversationParticipant.userId,
      patientName: userT.name,
    })
    .from(conversation)
    .innerJoin(conversationParticipant, eq(conversationParticipant.conversationId, conversation.id))
    .innerJoin(userT, eq(conversationParticipant.userId, userT.id))
    .where(and(...conditions))
    .orderBy(conversation.id, asc(conversationParticipant.id))
    .limit(200)

  const lastMessages = rows.length
    ? await db
        .select({ conversationId: message.conversationId, lastAt: sql<Date>`max(${message.createdAt})` })
        .from(message)
        .where(inArray(message.conversationId, rows.map((r) => r.id)))
        .groupBy(message.conversationId)
    : []
  const lastAtById = new Map(lastMessages.map((m) => [m.conversationId, m.lastAt]))

  return rows
    .map((r) => ({
      id: r.id,
      subject: r.subject ?? "بدون عنوان",
      status: r.status,
      category: r.category,
      patientName: r.patientName,
      patientUserId: r.patientUserId,
      lastMessageAt: lastAtById.get(r.id) ?? r.createdAt,
      createdAt: r.createdAt,
    }))
    .sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime())
}

/** Staff who can be notified about / assigned support tickets: anyone holding support:manage. */
export async function listSupportStaff(): Promise<{ id: string; name: string }[]> {
  if (!isDbConfigured) return []
  const rows = await db
    .selectDistinct({ id: userT.id, name: userT.name })
    .from(userRole)
    .innerJoin(roleT, eq(userRole.roleId, roleT.id))
    .innerJoin(userT, eq(userRole.userId, userT.id))
    .where(inArray(roleT.key, [ROLES.SUPPORT_AGENT, ROLES.SUPER_ADMIN]))
    .orderBy(userT.name)
  return rows
}
