# Payment Flow (Stripe, test mode)

## Principles (section 23)

- Never confirm on redirect alone — **only a verified webhook** flips state.
- Never show fake "paid". If keys are missing, the UI says payments are not
  configured and the appointment stays `PENDING_PAYMENT`.
- Store webhook events to guarantee idempotency. Never store card data.

## Steps

1. `bookConsultation` (server action) creates, in one transaction:
   `appointment` (`PENDING_PAYMENT`) + `payment` (`CREATED`). The
   no-double-booking index protects the slot.
2. If Stripe is configured, a Checkout Session is created
   (`client_reference_id = paymentId`, metadata `paymentId/appointmentId`);
   `payment.status → PENDING`, `providerSessionId` saved; the client is sent to
   the secure Stripe page.
3. Stripe calls `POST /api/webhooks/stripe`:
   - Signature verified with `STRIPE_WEBHOOK_SECRET` (raw body).
   - Event inserted into `payment_webhook_event` with unique `(provider,eventId)`.
     A duplicate delivery returns `{duplicate:true}` and does nothing.
   - On `checkout.session.completed` + `payment_status=paid`:
     `payment → PAID`, `appointment → CONFIRMED`, `case → CONSULTATION_BOOKED`
     (transaction), each idempotent (`PAID`/`CONFIRMED` guards). Audit rows added.
   - On `payment_intent.payment_failed`: `payment → FAILED` with reason.
   - Processing error → 500 so Stripe retries (still idempotent).

## Local testing

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# copy the printed whsec_... into STRIPE_WEBHOOK_SECRET
# use card 4242 4242 4242 4242 in checkout
```

## States

`CREATED · PENDING · REQUIRES_ACTION · AUTHORIZED · PAID · FAILED · CANCELLED ·
PARTIALLY_REFUNDED · REFUNDED · DISPUTED` (enum `payment_status`).
