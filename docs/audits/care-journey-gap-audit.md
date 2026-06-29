# Care-Journey Gap Audit

_Before implementing the care journey. Verified by reading the code._

## Exists already (reuse)

- **Schema**: `aesthetic_case` (+`case_status_history`), `appointment`
  (+`appointment_status_history`), `payment` + `payment_webhook_event`,
  `consent`/`document_access_grant`, `medical_document`, `doctor_profile`,
  `center`, `procedure`, `audit_log`, RBAC tables. Enums `case_status` (full
  lifecycle already defined), `appointment_status`, `payment_status`,
  `payment_purpose`.
- **Booking + payment**: `bookConsultation` action, Stripe checkout adapter
  (`lib/payments/stripe.ts`), webhook `/api/webhooks/stripe` (signature +
  idempotent via unique `(provider,eventId)`) → flips payment PAID + appointment
  CONFIRMED + case `CONSULTATION_BOOKED`.
- **RBAC**: `lib/rbac.ts` (roles, permissions, `canAccessCase`,
  `canViewDocument`). `lib/audit.ts` audit writer. `lib/data/cases.ts`,
  `lib/data/appointments.ts` read layers.
- **Dashboards**: patient (`/dashboard`, `/dashboard/cases`,
  `/dashboard/appointments`) and doctor (`/dashboard/doctor`) — basic, real data.
- **Migrations**: `0000_init`, `0001_contact_and_faq`.

## Missing (to build)

- **No state machine** governing case transitions (changes are ad-hoc per
  action). → add `lib/domain/case-state-machine.ts`.
- No way to **complete a consultation** (appointment stays CONFIRMED) or record
  a **consultation outcome**.
- No **treatment plan**, **quote/quote items**, **deposit** (only consultation
  fee), **medical approval**, **procedure booking/record**, **pre-procedure
  checklist**, **invoice/credit note**, **follow-up**, **safety alerts**,
  **verified reviews**, **conversations/messages**, **notifications**.
- No center / concierge / finance dashboards.

## New permissions needed

`consultation:complete`, `consultation:outcome`, `plan:write`, `quote:write`,
`quote:accept`, `medical:approve`, `procedure:confirm`, `procedure:complete`,
`invoice:write`, `invoice:read`, `followup:write`, `review:write`,
`review:moderate`, plus center/finance/concierge access perms.

## New tables (migration 0002+)

consultation_outcomes · treatment_plans · treatment_plan_versions · quotes ·
quote_items · quote_status_history · medical_approvals · procedure_bookings ·
procedure_booking_history · pre_procedure_checklists · pre_procedure_items ·
procedure_records · invoices · invoice_items · credit_notes · follow_up_plans ·
follow_up_tasks · follow_up_entries · symptom_reports · safety_alerts · reviews ·
review_reports · conversations · conversation_participants · messages ·
notifications · notification_deliveries · internal_tasks.

Reuse `payment`/`payment_purpose` (DEPOSIT/FINAL_PAYMENT already in enum) and
`payment_webhook_event` for the deposit + final payments. Extend the Stripe
webhook to handle deposit/final purposes (advance case via the state machine).

## Conflicts / notes

- `case_status` enum already contains every needed state — no enum change for the
  case lifecycle.
- Do NOT edit applied migrations; add new ones.
- Keep all transitions server-side through the state machine; never trust client.

## Execution order

1. State machine (+tests).
2. Care schema + migration.
3. Consultation complete + outcome.
4. Treatment plan → quote → accept → deposit (+webhook).
5. Medical approval → center confirm → procedure booking → completion.
6. Invoice + remaining payment → follow-up → safety → verified review.
7. Dashboards (patient/doctor/center/concierge/finance) + E2E tests.
