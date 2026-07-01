"use server"

import { z } from "zod"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { aestheticCase, conversation, conversationParticipant, message, medicalDocument } from "@/lib/db/schema"
import { requireUser } from "@/lib/session"
import { canAccessCase, canViewDocument } from "@/lib/rbac"
import { writeAudit } from "@/lib/audit"
import { notify } from "@/lib/notifications"
import { getNotifiableParticipants } from "@/lib/data/conversations"
import { AppError, toSafeError, validation, forbidden } from "@/lib/errors"
import type { ActionResult } from "@/lib/actions/provider"

const sendSchema = z.object({
  caseId: z.string().min(1),
  body: z.string().min(1, "اكتب رسالة").max(4000),
  isInternalNote: z.boolean().optional().default(false),
  documentIds: z.array(z.string().min(1)).max(10).optional().default([]),
})

export async function sendCaseMessage(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser()
    const parsed = sendSchema.safeParse(input)
    if (!parsed.success)
      throw validation(parsed.error.issues[0]?.message ?? "بيانات غير صحيحة")
    const data = parsed.data

    const c = (
      await db.select({ id: aestheticCase.id, patientUserId: aestheticCase.patientUserId }).from(aestheticCase).where(eq(aestheticCase.id, data.caseId)).limit(1)
    )[0]
    if (!c) throw new AppError("NOT_FOUND")
    if (!(await canAccessCase(user.id, data.caseId))) throw forbidden()

    // internal notes are staff-only — the patient can never mark their own message as one
    const isInternalNote = data.isInternalNote && user.id !== c.patientUserId

    // every referenced document must be one the sender can already view
    for (const docId of data.documentIds) {
      if (!(await canViewDocument(user.id, docId))) throw forbidden()
    }
    if (data.documentIds.length > 0) {
      const found = await db.select({ id: medicalDocument.id }).from(medicalDocument).where(eq(medicalDocument.caseId, data.caseId))
      const validIds = new Set(found.map((d) => d.id))
      if (!data.documentIds.every((id) => validIds.has(id))) throw forbidden()
    }

    const conversationId = await db.transaction(async (tx) => {
      let conv = (
        await tx.select({ id: conversation.id }).from(conversation).where(eq(conversation.caseId, data.caseId)).limit(1)
      )[0]
      if (!conv) {
        const created = await tx.insert(conversation).values({ caseId: data.caseId }).returning({ id: conversation.id })
        conv = created[0]
      }
      await tx
        .insert(conversationParticipant)
        .values({ conversationId: conv.id, userId: user.id, lastReadAt: new Date() })
        .onConflictDoUpdate({
          target: [conversationParticipant.conversationId, conversationParticipant.userId],
          set: { lastReadAt: new Date() },
        })
      await tx.insert(message).values({
        conversationId: conv.id,
        senderUserId: user.id,
        body: data.body,
        isInternalNote,
        documentIds: data.documentIds,
      })
      await writeAudit(
        {
          action: isInternalNote ? "conversation.internal_note" : "conversation.message",
          actorUserId: user.id,
          entityType: "conversation",
          entityId: conv.id,
          metadata: { caseId: data.caseId, hasDocuments: data.documentIds.length > 0 },
        },
        tx,
      )
      return conv.id
    })

    const recipients = await getNotifiableParticipants(conversationId, user.id, isInternalNote, c.patientUserId)
    for (const userId of recipients) {
      await notify({
        userId,
        type: "conversation.message",
        title: isInternalNote ? "ملاحظة داخلية جديدة" : "رسالة جديدة",
        body: data.body.slice(0, 140),
        caseId: data.caseId,
        href: `/dashboard/cases/${data.caseId}`,
      })
    }

    revalidatePath(`/dashboard/cases/${data.caseId}`)
    return { ok: true }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}

export async function markConversationRead(caseId: string): Promise<ActionResult> {
  try {
    const user = await requireUser()
    if (!(await canAccessCase(user.id, caseId))) throw forbidden()
    const conv = (
      await db.select({ id: conversation.id }).from(conversation).where(eq(conversation.caseId, caseId)).limit(1)
    )[0]
    if (!conv) return { ok: true }
    await db
      .insert(conversationParticipant)
      .values({ conversationId: conv.id, userId: user.id, lastReadAt: new Date() })
      .onConflictDoUpdate({
        target: [conversationParticipant.conversationId, conversationParticipant.userId],
        set: { lastReadAt: new Date() },
      })
    return { ok: true }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}
