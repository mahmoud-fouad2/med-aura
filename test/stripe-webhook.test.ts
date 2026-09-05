import { describe, it, expect, afterAll, vi } from "vitest"
import { eq, inArray } from "drizzle-orm"
import { db, pool } from "@/lib/db"
import { user, payment, paymentWebhookEvent } from "@/lib/db/schema"
import { POST } from "@/app/api/webhooks/stripe/route"
import * as stripeModule from "@/lib/payments/stripe"

const HAS_DB = Boolean(process.env.DATABASE_URL)
const rid = () => crypto.randomUUID()

describe.skipIf(!HAS_DB)("Stripe Webhook Session Expired Handling", () => {
  const payerUserId = rid()
  const createdPaymentIds: string[] = []
  const createdEventIds: string[] = []

  afterAll(async () => {
    if (createdPaymentIds.length > 0) {
      await db.delete(payment).where(inArray(payment.id, createdPaymentIds))
    }
    if (createdEventIds.length > 0) {
      await db.delete(paymentWebhookEvent).where(inArray(paymentWebhookEvent.eventId, createdEventIds))
    }
    await db.delete(user).where(eq(user.id, payerUserId))
    await pool.end()
  })

  it("transitions PENDING payment to CANCELLED upon receiving checkout.session.expired", async () => {
    await db.insert(user).values({ id: payerUserId, name: "Webhook User", email: `wh-${payerUserId}@t.local` })

    const pay = await db
      .insert(payment)
      .values({
        reference: `PAY-${rid().slice(0, 8).toUpperCase()}`,
        purpose: "DEPOSIT",
        status: "PENDING",
        amount: "500.00",
        currency: "SAR",
        payerUserId,
        provider: "stripe",
      })
      .returning({ id: payment.id })
    createdPaymentIds.push(pay[0].id)

    const eventId = `evt_expired_${rid().slice(0, 8)}`
    createdEventIds.push(eventId)

    // Mock constructWebhookEvent to return session_expired
    vi.spyOn(stripeModule, "constructWebhookEvent").mockReturnValueOnce({
      kind: "session_expired",
      eventId,
      type: "checkout.session.expired",
      paymentId: pay[0].id,
      raw: {},
    })

    const req = new Request("http://localhost:3000/api/webhooks/stripe", {
      method: "POST",
      headers: { "stripe-signature": "test_sig" },
      body: JSON.stringify({ id: eventId }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)

    // Verify payment is now CANCELLED
    const updatedPay = (
      await db.select().from(payment).where(eq(payment.id, pay[0].id)).limit(1)
    )[0]
    expect(updatedPay.status).toBe("CANCELLED")
    expect(updatedPay.failureReason).toContain("Checkout session expired")
  }, 25_000)

  it("rejects requests with missing or invalid stripe signatures", async () => {
    // Missing signature
    const missingReq = new Request("http://localhost:3000/api/webhooks/stripe", {
      method: "POST",
      body: JSON.stringify({}),
    })
    const missingRes = await POST(missingReq)
    expect(missingRes.status).toBe(400)
    const missingBody = await missingRes.json()
    expect(missingBody.error).toBe("missing signature")

    // Invalid signature
    vi.spyOn(stripeModule, "constructWebhookEvent").mockImplementationOnce(() => {
      throw new Error("Invalid signature")
    })
    const invalidReq = new Request("http://localhost:3000/api/webhooks/stripe", {
      method: "POST",
      headers: { "stripe-signature": "bogus_signature" },
      body: JSON.stringify({}),
    })
    const invalidRes = await POST(invalidReq)
    expect(invalidRes.status).toBe(400)
    const invalidBody = await invalidRes.json()
    expect(invalidBody.error).toBe("invalid signature")
  })

  it("handles duplicate event delivery cleanly and returns duplicate: true", async () => {
    const eventId = `evt_dup_${rid().slice(0, 8)}`
    createdEventIds.push(eventId)

    // Pre-insert an already processed event in paymentWebhookEvent
    await db.insert(paymentWebhookEvent).values({
      provider: "stripe",
      eventId,
      type: "payment_intent.succeeded",
      processedAt: new Date(),
      payload: {},
    })

    vi.spyOn(stripeModule, "constructWebhookEvent").mockReturnValueOnce({
      kind: "payment_succeeded",
      eventId,
      type: "payment_intent.succeeded",
      paymentId: "mock_payment_id",
      providerIntentId: "pi_mock",
      raw: {},
    })

    const req = new Request("http://localhost:3000/api/webhooks/stripe", {
      method: "POST",
      headers: { "stripe-signature": "test_sig" },
      body: JSON.stringify({ id: eventId }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.received).toBe(true)
    expect(body.duplicate).toBe(true)
  })

  it("transitions payment to DISPUTED on dispute_opened and back to PAID on dispute won", async () => {
    const providerIntentId = `pi_disp_${rid().slice(0, 8)}`
    const pay = await db
      .insert(payment)
      .values({
        reference: `PAY-${rid().slice(0, 8).toUpperCase()}`,
        purpose: "FINAL_PAYMENT",
        status: "PAID",
        amount: "1000.00",
        currency: "SAR",
        payerUserId,
        provider: "stripe",
        providerIntentId,
      })
      .returning({ id: payment.id })
    createdPaymentIds.push(pay[0].id)

    // 1. Dispute opened
    const disputeOpenEventId = `evt_disp_open_${rid().slice(0, 8)}`
    createdEventIds.push(disputeOpenEventId)

    vi.spyOn(stripeModule, "constructWebhookEvent").mockReturnValueOnce({
      kind: "dispute_opened",
      eventId: disputeOpenEventId,
      type: "charge.dispute.created",
      providerIntentId,
      reason: "fraudulent",
      amount: 1000,
      currency: "sar",
      raw: {},
    })

    const reqOpen = new Request("http://localhost:3000/api/webhooks/stripe", {
      method: "POST",
      headers: { "stripe-signature": "test_sig" },
      body: JSON.stringify({ id: disputeOpenEventId }),
    })

    const resOpen = await POST(reqOpen)
    expect(resOpen.status).toBe(200)

    const disputedPay = (
      await db.select().from(payment).where(eq(payment.id, pay[0].id)).limit(1)
    )[0]
    expect(disputedPay.status).toBe("DISPUTED")

    // 2. Dispute won (closed with outcome = won)
    const disputeClosedEventId = `evt_disp_closed_${rid().slice(0, 8)}`
    createdEventIds.push(disputeClosedEventId)

    vi.spyOn(stripeModule, "constructWebhookEvent").mockReturnValueOnce({
      kind: "dispute_closed",
      eventId: disputeClosedEventId,
      type: "charge.dispute.closed",
      providerIntentId,
      outcome: "won",
      raw: {},
    })

    const reqClose = new Request("http://localhost:3000/api/webhooks/stripe", {
      method: "POST",
      headers: { "stripe-signature": "test_sig" },
      body: JSON.stringify({ id: disputeClosedEventId }),
    })

    const resClose = await POST(reqClose)
    expect(resClose.status).toBe(200)

    const restoredPay = (
      await db.select().from(payment).where(eq(payment.id, pay[0].id)).limit(1)
    )[0]
    expect(restoredPay.status).toBe("PAID")
  }, 25_000)
})

