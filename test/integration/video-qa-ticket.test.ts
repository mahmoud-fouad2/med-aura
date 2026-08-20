import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { eq, inArray } from "drizzle-orm"
import { db, pool } from "@/lib/db"
import { auditLog, qaVideoJoinTicket, user } from "@/lib/db/schema"
import { setVideoProviderForTests } from "@/lib/video"
import { MockProvider } from "@/lib/video/providers/mock"
import {
  createQaSession,
  endQaSession,
  exchangeQaJoinTicket,
  qaTicketDigest,
  recordQaEvent,
} from "@/lib/video/qa"

const HAS_DB = Boolean(process.env.DATABASE_URL)

describe.skipIf(!HAS_DB)("QA video one-time join tickets", () => {
  const ids = {
    admin: crypto.randomUUID(),
    patient: crypto.randomUUID(),
    doctor: crypto.randomUUID(),
  }
  const rooms: string[] = []

  beforeAll(async () => {
    setVideoProviderForTests(new MockProvider())
    await db.insert(user).values([
      {
        id: ids.admin,
        name: "QA Admin",
        email: `qa-admin-${ids.admin}@test.local`,
        role: "super_admin",
      },
      {
        id: ids.patient,
        name: "QA Patient",
        email: `qa-patient-${ids.patient}@test.local`,
        role: "patient",
        isTest: true,
      },
      {
        id: ids.doctor,
        name: "QA Doctor",
        email: `qa-doctor-${ids.doctor}@test.local`,
        role: "doctor",
        isTest: true,
      },
    ])
  })

  afterAll(async () => {
    if (rooms.length) {
      await db.delete(qaVideoJoinTicket).where(inArray(qaVideoJoinTicket.roomName, rooms))
      await db.delete(auditLog).where(inArray(auditLog.entityId, rooms))
    }
    await db.delete(user).where(inArray(user.id, Object.values(ids)))
    setVideoProviderForTests(null)
    await pool.end()
  })

  it("stores only ticket digests and binds each ticket to its test user", async () => {
    const session = await createQaSession({
      patientUserId: ids.patient,
      doctorUserId: ids.doctor,
      actorUserId: ids.admin,
    })
    rooms.push(session.roomName)

    expect(session.patient.ticket).not.toContain("mock-token")
    expect(session.doctor.ticket).not.toContain("mock-token")

    const stored = await db
      .select({ ticketHash: qaVideoJoinTicket.ticketHash })
      .from(qaVideoJoinTicket)
      .where(eq(qaVideoJoinTicket.roomName, session.roomName))
    expect(stored.map((row) => row.ticketHash).sort()).toEqual(
      [qaTicketDigest(session.patient.ticket), qaTicketDigest(session.doctor.ticket)].sort(),
    )
    expect(stored.some((row) => row.ticketHash === session.patient.ticket)).toBe(false)

    await expect(
      exchangeQaJoinTicket({ ticket: session.patient.ticket, actorUserId: ids.doctor }),
    ).rejects.toMatchObject({ status: 410 })

    const patientGrant = await exchangeQaJoinTicket({
      ticket: session.patient.ticket,
      actorUserId: ids.patient,
    })
    expect(patientGrant).toMatchObject({ roomName: session.roomName, role: "patient" })
    expect(patientGrant.token).toMatch(/^mock-token-/)
    await recordQaEvent({
      roomName: session.roomName,
      actorUserId: ids.patient,
      event: "patient_joined",
    })
    await expect(
      recordQaEvent({
        roomName: session.roomName,
        actorUserId: ids.patient,
        event: "doctor_joined",
      }),
    ).rejects.toMatchObject({ status: 403 })

    await expect(
      exchangeQaJoinTicket({ ticket: session.patient.ticket, actorUserId: ids.patient }),
    ).rejects.toMatchObject({ status: 410 })

    const doctorGrant = await exchangeQaJoinTicket({
      ticket: session.doctor.ticket,
      actorUserId: ids.doctor,
    })
    expect(doctorGrant).toMatchObject({ roomName: session.roomName, role: "doctor" })
  })

  it("invalidates unused tickets when the admin ends the room", async () => {
    const session = await createQaSession({
      patientUserId: ids.patient,
      doctorUserId: ids.doctor,
      actorUserId: ids.admin,
    })
    rooms.push(session.roomName)
    await endQaSession({ roomName: session.roomName, actorUserId: ids.admin })

    await expect(
      exchangeQaJoinTicket({ ticket: session.doctor.ticket, actorUserId: ids.doctor }),
    ).rejects.toMatchObject({ status: 410 })
  })
})
