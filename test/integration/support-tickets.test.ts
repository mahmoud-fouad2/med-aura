import { describe, it, expect, afterAll } from "vitest"
import { eq } from "drizzle-orm"
import { db, pool } from "@/lib/db"
import { user, conversation, conversationParticipant, message, userRole, role } from "@/lib/db/schema"
import { ROLES } from "@/lib/rbac"
import {
  listMyTickets,
  getTicketDetail,
  listTicketsForAdmin,
  listSupportStaff,
} from "@/lib/data/support-tickets"

const HAS_DB = Boolean(process.env.DATABASE_URL)
const rid = () => crypto.randomUUID()

/**
 * createSupportTicket/replyToTicket/updateTicketStatus (lib/actions/support-tickets.ts)
 * can't be called directly here — requireUser() needs a real request/cookie
 * context nothing in this suite mocks (same limitation noted in the safety
 * alert and case-detail tests this session). Instead this builds the exact
 * DB state those actions produce and exercises the read layer against it,
 * which is what the patient/admin UI actually renders from.
 */
describe.skipIf(!HAS_DB)("support ticket data layer", () => {
  const patientId = rid()
  const staffId = rid()
  const outsiderId = rid()
  const ticketId = rid()
  let staffUserRoleId = ""

  afterAll(async () => {
    await db.delete(message).where(eq(message.conversationId, ticketId))
    await db.delete(conversationParticipant).where(eq(conversationParticipant.conversationId, ticketId))
    await db.delete(conversation).where(eq(conversation.id, ticketId))
    if (staffUserRoleId) await db.delete(userRole).where(eq(userRole.id, staffUserRoleId))
    await db.delete(user).where(eq(user.id, patientId))
    await db.delete(user).where(eq(user.id, staffId))
    await db.delete(user).where(eq(user.id, outsiderId))
    await pool.end()
  })

  // More sequential DB round trips than the other integration tests in this
  // suite (build + read through every ticket query) — needs headroom beyond
  // vitest's 5s default against a real (cold-start-prone) connection.
  it("builds a real ticket + reply, then reads it back through every query", async () => {
    await db.insert(user).values([
      { id: patientId, name: "Patient", email: `p-${patientId}@t.local` },
      { id: staffId, name: "Support Agent", email: `s-${staffId}@t.local` },
      { id: outsiderId, name: "Outsider", email: `o-${outsiderId}@t.local` },
    ])

    // Mirrors createSupportTicket's transaction exactly.
    await db.insert(conversation).values({ id: ticketId, subject: "مشكلة في الدفع", category: "BILLING", status: "OPEN" })
    await db.insert(conversationParticipant).values({ conversationId: ticketId, userId: patientId, role: "requester" })
    await db.insert(message).values({ conversationId: ticketId, senderUserId: patientId, body: "لم تنجح عملية الدفع." })

    // listMyTickets: shows for the patient, unread is false since nothing
    // has been read yet but there's also no *other* party's message yet —
    // the patient's own message doesn't count as unread-for-them.
    const mine = await listMyTickets(patientId)
    expect(mine.some((t) => t.id === ticketId)).toBe(true)
    expect(mine.find((t) => t.id === ticketId)?.status).toBe("OPEN")

    // getTicketDetail: participant can view, outsider cannot, staff-with-manage can.
    const asPatient = await getTicketDetail(ticketId, patientId)
    expect(asPatient?.messages).toHaveLength(1)
    const asOutsider = await getTicketDetail(ticketId, outsiderId)
    expect(asOutsider).toBeNull()
    const asStaffBeforeJoining = await getTicketDetail(ticketId, staffId, true)
    expect(asStaffBeforeJoining?.id).toBe(ticketId)

    // Mirrors replyToTicket's staff-joins-and-replies + status bump to IN_PROGRESS.
    await db.insert(conversationParticipant).values({ conversationId: ticketId, userId: staffId, role: "staff" })
    await db.insert(message).values({ conversationId: ticketId, senderUserId: staffId, body: "تم استرجاع المبلغ خلال 3 أيام عمل." })
    await db.update(conversation).set({ status: "IN_PROGRESS" }).where(eq(conversation.id, ticketId))

    const afterReply = await getTicketDetail(ticketId, patientId)
    expect(afterReply?.messages).toHaveLength(2)
    expect(afterReply?.status).toBe("IN_PROGRESS")

    // The patient hasn't read the staff reply yet -> unread for them.
    const mineAfterReply = await listMyTickets(patientId)
    expect(mineAfterReply.find((t) => t.id === ticketId)?.unreadForMe).toBe(true)

    // Admin search finds it by subject and by patient name.
    const bySubject = await listTicketsForAdmin({ q: "الدفع" })
    expect(bySubject.some((t) => t.id === ticketId)).toBe(true)
    const byPatientName = await listTicketsForAdmin({ q: "Patient" })
    expect(byPatientName.some((t) => t.id === ticketId)).toBe(true)
    const byStatus = await listTicketsForAdmin({ status: "IN_PROGRESS" })
    expect(byStatus.some((t) => t.id === ticketId)).toBe(true)
    const wrongStatus = await listTicketsForAdmin({ status: "CLOSED" })
    expect(wrongStatus.some((t) => t.id === ticketId)).toBe(false)

    // listSupportStaff picks up anyone holding SUPPORT_AGENT.
    const supportRole = (await db.select({ id: role.id }).from(role).where(eq(role.key, ROLES.SUPPORT_AGENT)).limit(1))[0]
    if (supportRole) {
      const inserted = await db
        .insert(userRole)
        .values({ userId: staffId, roleId: supportRole.id })
        .returning({ id: userRole.id })
      staffUserRoleId = inserted[0].id
      const staff = await listSupportStaff()
      expect(staff.some((s) => s.id === staffId)).toBe(true)
    }
  }, 20000)
})
