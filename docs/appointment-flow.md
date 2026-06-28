# Appointment Flow

## Availability

Doctors have weekly `availability_rule`s (day, start/end, slot minutes, type).
`lib/data/availability.ts#generateSlots` (pure, unit-tested) expands rules into
upcoming slots, excluding already-booked slots and those inside the 1-hour lead
window.

## Booking

`bookConsultation` (server action):

1. Validates permission (`appointment:book`) and that the doctor is publicly
   bookable with a set consultation fee.
2. Re-validates the requested slot against generated availability.
3. In a transaction inserts `appointment` (`PENDING_PAYMENT`) + status history +
   `payment` (`CREATED`).
4. The **partial unique index** `appointment_no_double_booking` makes a
   concurrent duplicate booking fail with Postgres `23505`, surfaced as a clear
   "slot no longer available" message.
5. Creates the Stripe Checkout session (or returns `paymentConfigured:false`).

## Statuses

`PENDING_PAYMENT · PENDING_PROVIDER_CONFIRMATION · CONFIRMED · CHECKED_IN ·
IN_PROGRESS · COMPLETED · RESCHEDULED · CANCELLED_BY_PATIENT ·
CANCELLED_BY_PROVIDER · NO_SHOW` (enum `appointment_status`). Transitions are
recorded in `appointment_status_history`.

## Confirmation

Only the verified Stripe webhook moves `PENDING_PAYMENT → CONFIRMED`. The
appointment then shows for both patient and doctor.

Reschedule/cancel with policy handling are the next phase.
