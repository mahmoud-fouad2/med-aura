"use server"

import { z } from "zod"
import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { conversation, conversationParticipant, message } from "@/lib/db/schema"
import { requireUser } from "@/lib/session"
import { requirePermission, hasPermission, PERMISSIONS } from "@/lib/rbac"
import { writeAudit } from "@/lib/audit"
import { notify } from "@/lib/notifications"
import { AppError, toSafeError, validation, forbidden } from "@/lib/errors"
import { listSupportStaff, TICKET_CATEGORIES, TICKET_STATUSES } from "@/lib/data/support-tickets"
import type { ActionResult } from "@/lib/actions/provider"

/** Best-effort read-receipt — silently no-ops if the caller isn't a participant. */
export async function markTicketRead(ticketId: string): Promise<void> {
  try {
    const user = await requireUser()
    await db
      .update(conversationParticipant)
      .set({ lastReadAt: new Date() })
      .where(and(eq(conversationParticipant.conversationId, ticketId), eq(conversationParticipant.userId, user.id)))
  } catch {
    // Anonymous or otherwise unauthenticated — nothing to mark.
  }
}

const createSchema = z.object({
  subject: z.string().min(3, "أدخل عنوانًا للتذكرة").max(200),
  category: z.enum(TICKET_CATEGORIES).optional(),
  body: z.string().min(5, "اكتب وصفًا لمشكلتك قبل الإرسال").max(5000),
})

/** Opens a new standalone support ticket (a caseId-null conversation) for the current user. */
export async function createSupportTicket(input: unknown): Promise<ActionResult<{ ticketId: string }>> {
  try {
    const user = await requireUser()
    const parsed = createSchema.safeParse(input)
    if (!parsed.success) throw validation(parsed.error.issues[0]?.message ?? "بيانات غير صحيحة")
    const { subject, category, body } = parsed.data

    let ticketId = ""
    await db.transaction(async (tx) => {
      const rows = await tx
        .insert(conversation)
        .values({ subject, category: category ?? null, status: "OPEN" })
        .returning({ id: conversation.id })
      ticketId = rows[0].id
      await tx.insert(conversationParticipant).values({ conversationId: ticketId, userId: user.id, role: "requester" })
      await tx.insert(message).values({ conversationId: ticketId, senderUserId: user.id, body })
      await writeAudit(
        { action: "support_ticket.create", actorUserId: user.id, entityType: "conversation", entityId: ticketId, metadata: { subject, category } },
        tx,
      )
    })

    const staff = await listSupportStaff()
    for (const s of staff) {
      await notify({
        userId: s.id,
        type: "support_ticket.created",
        title: `تذكرة دعم جديدة: ${subject}`,
        body,
        href: `/admin/tickets?open=${ticketId}`,
      })
    }

    revalidatePath("/dashboard/support")
    revalidatePath("/admin/tickets")
    return { ok: true, data: { ticketId } }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}

const replySchema = z.object({
  ticketId: z.string().min(1),
  body: z.string().min(1, "اكتب ردًّا قبل الإرسال").max(5000),
})

/** Reply from either side — the requester or any staff member holding support:manage. */
export async function replyToTicket(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser()
    const parsed = replySchema.safeParse(input)
    if (!parsed.success) throw validation(parsed.error.issues[0]?.message ?? "بيانات غير صحيحة")
    const { ticketId, body } = parsed.data

    const conv = (
      await db
        .select({ id: conversation.id, status: conversation.status, subject: conversation.subject })
        .from(conversation)
        .where(eq(conversation.id, ticketId))
        .limit(1)
    )[0]
    if (!conv) throw new AppError("NOT_FOUND")

    const isParticipant = (
      await db
        .select({ id: conversationParticipant.id })
        .from(conversationParticipant)
        .where(and(eq(conversationParticipant.conversationId, ticketId), eq(conversationParticipant.userId, user.id)))
        .limit(1)
    ).length > 0
    const canManage = await hasPermission(user.id, PERMISSIONS.SUPPORT_MANAGE)
    if (!isParticipant && !canManage) throw forbidden("لا يمكنك الرد على هذه التذكرة.")

    await db.transaction(async (tx) => {
      if (!isParticipant) {
        // Staff replying for the first time — join as a participant so they
        // keep receiving/seeing this thread like the requester does.
        await tx.insert(conversationParticipant).values({ conversationId: ticketId, userId: user.id, role: "staff" }).onConflictDoNothing()
      }
      await tx.insert(message).values({ conversationId: ticketId, senderUserId: user.id, body })
      const nextStatus = canManage && conv.status === "OPEN" ? "IN_PROGRESS" : conv.status
      await tx.update(conversation).set({ status: nextStatus, updatedAt: new Date() }).where(eq(conversation.id, ticketId))
      await writeAudit({ action: "support_ticket.reply", actorUserId: user.id, entityType: "conversation", entityId: ticketId }, tx)
    })

    const others = await db
      .select({ userId: conversationParticipant.userId })
      .from(conversationParticipant)
      .where(and(eq(conversationParticipant.conversationId, ticketId)))
    for (const p of others) {
      if (p.userId === user.id) continue
      await notify({
        userId: p.userId,
        type: "support_ticket.replied",
        title: `رد جديد على تذكرتك: ${conv.subject ?? ""}`,
        body,
        href: canManage ? `/admin/tickets?open=${ticketId}` : `/dashboard/support/${ticketId}`,
      })
    }

    revalidatePath("/dashboard/support")
    revalidatePath(`/dashboard/support/${ticketId}`)
    revalidatePath("/admin/tickets")
    return { ok: true }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}

const statusSchema = z.object({
  ticketId: z.string().min(1),
  status: z.enum(TICKET_STATUSES),
})

export async function updateTicketStatus(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser()
    await requirePermission(user.id, PERMISSIONS.SUPPORT_MANAGE)
    const parsed = statusSchema.safeParse(input)
    if (!parsed.success) throw validation("بيانات غير صحيحة")
    const { ticketId, status } = parsed.data

    const conv = (
      await db.select({ id: conversation.id, subject: conversation.subject }).from(conversation).where(eq(conversation.id, ticketId)).limit(1)
    )[0]
    if (!conv) throw new AppError("NOT_FOUND")

    await db.transaction(async (tx) => {
      await tx.update(conversation).set({ status, updatedAt: new Date() }).where(eq(conversation.id, ticketId))
      await writeAudit({ action: "support_ticket.status_change", actorUserId: user.id, entityType: "conversation", entityId: ticketId, metadata: { status } }, tx)
    })

    if (status === "RESOLVED" || status === "CLOSED") {
      const requesters = await db
        .select({ userId: conversationParticipant.userId, role: conversationParticipant.role })
        .from(conversationParticipant)
        .where(eq(conversationParticipant.conversationId, ticketId))
      const label = status === "RESOLVED" ? "تم حل تذكرتك" : "تم إغلاق تذكرتك"
      for (const r of requesters) {
        if (r.role === "staff") continue
        await notify({
          userId: r.userId,
          type: "support_ticket.status_change",
          title: `${label}: ${conv.subject ?? ""}`,
          href: `/dashboard/support/${ticketId}`,
        })
      }
    }

    revalidatePath("/dashboard/support")
    revalidatePath("/admin/tickets")
    return { ok: true }
  } catch (err) {
    const safe = toSafeError(err)
    return { ok: false, error: safe.userMessage, code: safe.code }
  }
}
