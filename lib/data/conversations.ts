import { and, asc, eq, ne } from "drizzle-orm"
import { db, isDbConfigured } from "@/lib/db"
import { conversation, conversationParticipant, message, user as userT, aestheticCase } from "@/lib/db/schema"

export type ConversationMessageView = {
  id: string
  senderUserId: string
  senderName: string
  body: string
  isInternalNote: boolean
  documentIds: string[]
  createdAt: Date
}
export type ConversationParticipantView = {
  userId: string
  name: string
  lastReadAt: Date | null
}
export type CaseConversationView = {
  conversationId: string | null
  participants: ConversationParticipantView[]
  messages: ConversationMessageView[]
}

/**
 * The case conversation, viewer-scoped: internal notes are hard-filtered out
 * server-side for the patient — never sent to the client at all, not just hidden by CSS.
 */
export async function getCaseConversationView(
  caseId: string,
  viewerUserId: string,
): Promise<CaseConversationView> {
  const empty: CaseConversationView = { conversationId: null, participants: [], messages: [] }
  if (!isDbConfigured) return empty

  const conv = (
    await db.select({ id: conversation.id }).from(conversation).where(eq(conversation.caseId, caseId)).limit(1)
  )[0]
  if (!conv) return empty

  const c = (
    await db.select({ patientUserId: aestheticCase.patientUserId }).from(aestheticCase).where(eq(aestheticCase.id, caseId)).limit(1)
  )[0]
  const viewerIsPatient = c?.patientUserId === viewerUserId

  const participants = await db
    .select({ userId: conversationParticipant.userId, lastReadAt: conversationParticipant.lastReadAt, name: userT.name })
    .from(conversationParticipant)
    .innerJoin(userT, eq(conversationParticipant.userId, userT.id))
    .where(eq(conversationParticipant.conversationId, conv.id))

  const rows = await db
    .select({
      id: message.id,
      senderUserId: message.senderUserId,
      senderName: userT.name,
      body: message.body,
      isInternalNote: message.isInternalNote,
      documentIds: message.documentIds,
      createdAt: message.createdAt,
    })
    .from(message)
    .innerJoin(userT, eq(message.senderUserId, userT.id))
    .where(eq(message.conversationId, conv.id))
    .orderBy(asc(message.createdAt))

  const messages = (viewerIsPatient ? rows.filter((r) => !r.isInternalNote) : rows).map((r) => ({
    id: r.id,
    senderUserId: r.senderUserId,
    senderName: r.senderName,
    body: r.body,
    isInternalNote: r.isInternalNote,
    documentIds: (r.documentIds ?? []) as string[],
    createdAt: r.createdAt,
  }))

  return { conversationId: conv.id, participants, messages }
}

/** Other participants to notify when a message is sent (excludes the sender; excludes the patient for internal notes). */
export async function getNotifiableParticipants(
  conversationId: string,
  senderUserId: string,
  isInternalNote: boolean,
  patientUserId: string,
): Promise<string[]> {
  const rows = await db
    .select({ userId: conversationParticipant.userId })
    .from(conversationParticipant)
    .where(and(eq(conversationParticipant.conversationId, conversationId), ne(conversationParticipant.userId, senderUserId)))
  return rows
    .map((r) => r.userId)
    .filter((id) => !(isInternalNote && id === patientUserId))
}
