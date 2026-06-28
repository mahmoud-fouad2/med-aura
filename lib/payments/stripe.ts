import Stripe from "stripe"
import { env, isStripeConfigured, isStripeWebhookConfigured } from "@/lib/env"
import { notConfigured } from "@/lib/errors"

export { isStripeConfigured, isStripeWebhookConfigured }

let stripe: Stripe | null = null

function client(): Stripe {
  if (!isStripeConfigured()) {
    throw notConfigured("بوابة الدفع غير مفعّلة حاليًا.")
  }
  if (!stripe) {
    // apiVersion omitted → uses the account default (avoids version-literal churn)
    stripe = new Stripe(env.STRIPE_SECRET_KEY as string)
  }
  return stripe
}

/** Zero-decimal currencies would need special handling; our currencies use 2. */
function toMinorUnits(amount: number): number {
  return Math.round(amount * 100)
}

export type CheckoutInput = {
  paymentId: string
  appointmentId: string
  amount: number
  currency: string
  description: string
  customerEmail?: string
  successUrl: string
  cancelUrl: string
}

/** Create a Stripe Checkout Session for a consultation fee (test or live). */
export async function createCheckoutSession(
  input: CheckoutInput,
): Promise<{ id: string; url: string }> {
  const session = await client().checkout.sessions.create({
    mode: "payment",
    client_reference_id: input.paymentId,
    customer_email: input.customerEmail,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: input.currency.toLowerCase(),
          unit_amount: toMinorUnits(input.amount),
          product_data: { name: input.description },
        },
      },
    ],
    payment_intent_data: {
      metadata: { paymentId: input.paymentId, appointmentId: input.appointmentId },
    },
    metadata: { paymentId: input.paymentId, appointmentId: input.appointmentId },
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
  })
  if (!session.url) throw new Error("Stripe did not return a checkout URL")
  return { id: session.id, url: session.url }
}

export type ParsedWebhook =
  | {
      kind: "payment_succeeded"
      eventId: string
      type: string
      paymentId: string | null
      providerIntentId: string | null
      providerSessionId: string | null
      raw: unknown
    }
  | {
      kind: "payment_failed"
      eventId: string
      type: string
      paymentId: string | null
      reason: string | null
      raw: unknown
    }
  | { kind: "ignored"; eventId: string; type: string; raw: unknown }

/** Verify the signature and normalise the event. Throws if signature invalid. */
export function constructWebhookEvent(
  rawBody: string,
  signature: string,
): ParsedWebhook {
  if (!isStripeWebhookConfigured()) {
    throw notConfigured("التحقق من إشعارات الدفع غير مهيأ.")
  }
  const event = client().webhooks.constructEvent(
    rawBody,
    signature,
    env.STRIPE_WEBHOOK_SECRET as string,
  )

  if (event.type === "checkout.session.completed") {
    const s = event.data.object as Stripe.Checkout.Session
    if (s.payment_status === "paid") {
      return {
        kind: "payment_succeeded",
        eventId: event.id,
        type: event.type,
        paymentId: s.client_reference_id ?? (s.metadata?.paymentId ?? null),
        providerIntentId:
          typeof s.payment_intent === "string" ? s.payment_intent : null,
        providerSessionId: s.id,
        raw: event,
      }
    }
    return { kind: "ignored", eventId: event.id, type: event.type, raw: event }
  }

  if (event.type === "payment_intent.payment_failed") {
    const pi = event.data.object as Stripe.PaymentIntent
    return {
      kind: "payment_failed",
      eventId: event.id,
      type: event.type,
      paymentId: pi.metadata?.paymentId ?? null,
      reason: pi.last_payment_error?.message ?? null,
      raw: event,
    }
  }

  return { kind: "ignored", eventId: event.id, type: event.type, raw: event }
}
