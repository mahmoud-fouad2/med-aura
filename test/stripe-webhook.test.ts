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
})
