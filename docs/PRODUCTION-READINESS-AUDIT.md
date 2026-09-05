# Med Aura — Production Readiness Master Audit

_Last Updated: 2026-09-05 · Baseline Branch: `main` · Test Suite: 54 suites / 237 passed_

This document is the persistent source of truth across all sessions. It tracks every identified finding, its severity, current behavior, root cause, impact, proposed fix, test verification, and status.

---

## Severity Definitions
- **P0**: Launch blocker / severe security vulnerability / data corruption / data loss / payment corruption / critical outage / irreversible destruction.
- **P1**: Major broken workflow / serious reliability issue / important user-facing defect preventing normal product usage.
- **P2**: Important quality, usability, maintainability, performance, or operational issue.
- **P3**: Cosmetic, low-risk cleanup, minor consistency issue.

---

## Master Findings Register

### [P1] Finding 1: Deposit Payment Deadlock on Accepted Quotes
- **Area**: Care Journey & Payments
- **Feature/Workflow**: Quote Acceptance → Deposit Payment → Procedure Booking
- **Severity**: P1
- **Current Behavior**: In `lib/actions/quote.ts`, `acceptQuote` transitions the quote to `ACCEPTED` and the case to `QUOTE_ACCEPTED`, then initiates a Stripe checkout session. If the patient closed the browser, had their card fail, cancelled checkout, or if Stripe was not configured at the exact moment of acceptance:
  - Quote status was `ACCEPTED`. Calling `acceptQuote` again threw conflict (*"سبق أن قبلت هذا العرض"*).
  - The case remained stuck in `QUOTE_ACCEPTED`.
  - The UI (`components/care/patient-care-panel.tsx`) rendered: *"تم قبول العرض. تابع خطوات الدفع والاعتماد."* with **no button or action to pay or retry paying the deposit**.
  - There was no server action or API anywhere to pay the deposit for an accepted quote.
- **Expected Behavior**: When a case has an accepted quote and is in `QUOTE_ACCEPTED`, the patient sees the deposit required and a functioning **"دفع العربون الآن" (Pay Deposit Now)** button. A dedicated `createDepositPayment(caseId)` action handles initiating or retrying deposit payment, creating a fresh checkout session, canceling stale previous attempts, and generating mobile/web return URLs.
- **Root Cause**: Quote acceptance combined quote state transition and checkout redirect into a single non-repeatable operation with no standalone payment retry endpoint or UI button.
- **User Impact**: Patient cannot proceed with their procedure booking; care journey is deadlocked.
- **Business Impact**: Significant revenue loss on procedure bookings; ad spend wasted on abandoned checkouts that cannot resume.
- **Security Impact**: None.
- **Data Integrity Impact**: Cases stuck in `QUOTE_ACCEPTED` indefinitely.
- **Performance Impact**: None.
- **Resolution**:
  - Implemented `createDepositPayment(caseId: string, options?: { platform?: "web" | "mobile" })` in `lib/actions/payment.ts` which automatically cancels stale/unfulfilled attempts and creates a fresh checkout session.
  - In `components/care/patient-care-panel.tsx` and `app/dashboard/cases/[id]/page.tsx`, passed `caseId` and `caseStatus`. Added a dedicated deposit payment callout card with deposit amount and "دفع العربون الآن" button wired to `createDepositPayment`.
  - Created integration test `test/deposit-payment.test.ts`.
- **Files Involved**: `lib/actions/payment.ts`, `components/care/patient-care-panel.tsx`, `app/dashboard/cases/[id]/page.tsx`, `test/deposit-payment.test.ts`.
- **Status**: `RESOLVED` (Verified: `test/deposit-payment.test.ts` passed against live Neon Postgres)

---

### [P1] Finding 2: Stale or Cancelled Final Payments Permanently Lock Balance Payment
- **Area**: Billing & Invoicing
- **Feature/Workflow**: Final Balance Payment
- **Severity**: P1
- **Current Behavior**: In `createFinalPayment` (`lib/actions/payment.ts:L78-L83`), if the latest payment was `FINAL_PAYMENT` and its status was `CREATED` or `PENDING`, it unconditionally threw `conflict("توجد محاولة دفع سابقة قيد المعالجة. انتظر قليلًا أو أعد المحاولة لاحقًا.")` with no expiration or timeout check on `createdAt`. If a patient started checkout and abandoned it, cancelled, or if Stripe was unconfigured, the `CREATED`/`PENDING` row remained forever, permanently locking the user out of paying their invoice balance.
- **Expected Behavior**: If an existing `FINAL_PAYMENT` is older than 15 minutes, or if Stripe is not configured, or if the user returns from Stripe cancel URL, the stale attempt is marked `CANCELLED` and a new checkout attempt is permitted.
- **Root Cause**: Lack of expiration or timeout check on pending payment records.
- **User Impact**: Patients cannot pay their balance if an initial attempt is interrupted.
- **Business Impact**: Revenue collection failure on outstanding invoices.
- **Security Impact**: None.
- **Data Integrity Impact**: Invoices stay unpaid indefinitely.
- **Performance Impact**: None.
- **Resolution**: Added age check (>15 minutes) and unconfigured-provider check in `createFinalPayment`; automatically marks stale attempt `CANCELLED` with audit trail and permits a fresh checkout session.
- **Files Involved**: `lib/actions/payment.ts`, `test/deposit-payment.test.ts`.
- **Status**: `RESOLVED` (Verified: `test/deposit-payment.test.ts` passed)

---

### [P1] Finding 3: Rescheduled Appointments Broken End-to-End (Video Access & Completion Blocked)
- **Area**: Telehealth & Care Workflow
- **Feature/Workflow**: Rescheduled Appointment Lifecycle
- **Severity**: P1
- **Current Behavior**: When an appointment was rescheduled after a no-show via `rescheduleMissedAppointment` (`lib/actions/appointments.ts`), its status was updated to `"RESCHEDULED"`.
  - In `lib/video/service.ts`: `JOINABLE_STATUSES = new Set(["CONFIRMED", "CHECKED_IN", "IN_PROGRESS"])` — `"RESCHEDULED"` was missing.
  - In `test/video-access.test.ts:L88`: The test explicitly asserted: `for (const status of [..., "RESCHEDULED"]) expect(d.allowed).toBe(false) ... reason: "not_confirmed"`.
  - In `components/appointments/appointment-list.tsx`: `videoEntry()` ignored `RESCHEDULED`, so the "Enter consultation" button never appeared.
  - In `lib/actions/care.ts`: `completeConsultation` threw conflict: `if (appt.status !== "CONFIRMED") throw conflict("لا يمكن إكمال استشارة غير مؤكدة.")`. The doctor could never complete a rescheduled consultation.
- **Expected Behavior**: A rescheduled appointment is an active scheduled appointment for a new date/time. Both patient and doctor must be able to enter the video room during the window, and the doctor must be able to mark the consultation complete.
- **Root Cause**: `RESCHEDULED` was treated as an unconfirmed status rather than an active scheduled state.
- **User Impact**: Patients and doctors could not attend or complete rescheduled appointments.
- **Business Impact**: Broken core appointment promise; negative customer retention.
- **Security Impact**: None.
- **Data Integrity Impact**: Appointments stuck in `RESCHEDULED`.
- **Performance Impact**: None.
- **Resolution**:
  - Added `"RESCHEDULED"` to `JOINABLE_STATUSES` in `lib/video/service.ts`.
  - In `lib/actions/care.ts`, updated `completeConsultation` to accept `["CONFIRMED", "RESCHEDULED", "CHECKED_IN", "IN_PROGRESS"]`.
  - In `components/appointments/appointment-list.tsx`, included `RESCHEDULED` in `JOINABLE`, active status tones, and calendar dropdowns.
  - Updated `test/video-access.test.ts` to assert that `RESCHEDULED` appointments are permitted.
- **Files Involved**: `lib/video/service.ts`, `lib/actions/care.ts`, `components/appointments/appointment-list.tsx`, `test/video-access.test.ts`.
- **Status**: `RESOLVED` (Verified: `test/video-access.test.ts` and `test/care-journey-continuity.test.ts` passed)

---

### [P2] Finding 4: In-App Notifications Route to Non-Existent `/appointment/[id]` (404 Error)
- **Area**: Notifications & UX
- **Feature/Workflow**: Web Notification Navigation
- **Severity**: P2
- **Current Behavior**: In `lib/actions/appointments.ts`, `markAppointmentNoShow` (L87) and `rescheduleMissedAppointment` (L167) sent notifications with `href: "/appointment/" + row.id`. On the web app, `/appointment/[id]` does not exist (it only exists in mobile Expo). Web users received a hard 404 error when clicking notifications.
- **Expected Behavior**: Web notifications must route to `/dashboard/appointments`.
- **Root Cause**: Mobile path convention was hardcoded into shared server action notifications.
- **User Impact**: 404 page displayed when clicking notifications in the web inbox.
- **Business Impact**: Degraded UX, perceived platform brokenness.
- **Security Impact**: None.
- **Data Integrity Impact**: None.
- **Performance Impact**: None.
- **Resolution**: Updated `href` in `lib/actions/appointments.ts` to `/dashboard/appointments`.
- **Files Involved**: `lib/actions/appointments.ts`.
- **Status**: `RESOLVED` (Verified: Next.js build clean, typecheck clean)

---

### [P2] Finding 5: Missing Appointment Cancellation Action for Patients and Providers
- **Area**: Scheduling & Care Journey
- **Feature/Workflow**: Pre-Appointment Cancellation
- **Severity**: P2
- **Current Behavior**: Enums (`CANCELLED_BY_PATIENT`, `CANCELLED_BY_PROVIDER`), DB indexes, and status labels existed, but there was no server action or UI button for a patient or doctor to cancel an upcoming confirmed or rescheduled appointment ahead of time.
- **Expected Behavior**: A patient or doctor can cancel an upcoming appointment ahead of time with a reason, updating status to `CANCELLED_BY_PATIENT` or `CANCELLED_BY_PROVIDER`, freeing the slot, canceling unfulfilled pending payments, recording history and audit logs, and notifying the other party.
- **Root Cause**: Feature was partially implemented (schema, types, labels) but missing the action and UI trigger.
- **User Impact**: Inability to cancel appointments if plans change; doctor's schedule blocked unnecessarily.
- **Business Impact**: Wasted clinic time slots, poor patient experience.
- **Security Impact**: None.
- **Data Integrity Impact**: Appointments remained booked until no-show after the fact.
- **Performance Impact**: None.
- **Resolution**:
  - Added `canCancelAppointment` to `lib/domain/appointment-state.ts`.
  - Implemented `cancelAppointment({ appointmentId, reason })` in `lib/actions/appointments.ts` with permission checks, state verification, transaction, payment cleanup, audit trail, and notifications.
  - Created client component `components/appointments/cancel-appointment-button.tsx` using themed `ConfirmDialog`.
  - Integrated `CancelAppointmentButton` in `components/appointments/appointment-list.tsx`.
  - Created integration test `test/appointment-cancellation.test.ts`.
- **Files Involved**: `lib/domain/appointment-state.ts`, `lib/actions/appointments.ts`, `components/appointments/cancel-appointment-button.tsx`, `components/appointments/appointment-list.tsx`, `test/appointment-cancellation.test.ts`.
- **Status**: `RESOLVED` (Verified: `test/appointment-cancellation.test.ts` passed)

---

### [P2] Finding 6: Public Contact Form Spam Risk (Missing IP Rate Limiting)
- **Area**: Security & Operations
- **Feature/Workflow**: Public Contact Form Submission
- **Severity**: P2
- **Current Behavior**: In `lib/actions/contact.ts`, `submitContactMessage` had no rate limiting. When reCAPTCHA was not configured or bypassed, automated scripts could flood the `contact_message` table.
- **Expected Behavior**: Apply `consumeRateLimit("contact:" + meta.ip, { limit: 5, windowMs: 60_000 })`.
- **Root Cause**: Missing rate limit call in `lib/actions/contact.ts`.
- **User Impact**: None for legitimate users; protects platform against spam and resource exhaustion.
- **Business Impact**: Protects support team from spam storms; prevents DB bloating.
- **Security Impact**: DoS and spam resistance.
- **Data Integrity Impact**: Prevents pollution of support inbox.
- **Performance Impact**: None.
- **Resolution**: Added `consumeRateLimit("contact:" + meta.ip, { limit: 5, windowMs: 60_000 })` in `submitContactMessage` with informative Arabic retry-after feedback. Created integration test `test/contact-rate-limit.test.ts`.
- **Files Involved**: `lib/actions/contact.ts`, `test/contact-rate-limit.test.ts`.
- **Status**: `RESOLVED` (Verified: `test/contact-rate-limit.test.ts` passed)

---

### [P2] Finding 7: Stripe Webhook Ignored `checkout.session.expired`
- **Area**: Payments & Accounting
- **Feature/Workflow**: Stripe Webhook Lifecycle
- **Severity**: P2
- **Current Behavior**: In `lib/payments/stripe.ts` and `app/api/webhooks/stripe/route.ts`, `checkout.session.expired` was ignored. Expired checkout sessions left payments in `PENDING` indefinitely.
- **Expected Behavior**: Handle `checkout.session.expired` to transition the payment status from `PENDING` / `CREATED` to `CANCELLED` with audit logging.
- **Root Cause**: Event type not in `constructWebhookEvent` switch.
- **User Impact**: Cleaner payment state.
- **Business Impact**: Avoids accounting confusion regarding pending vs abandoned checkout sessions.
- **Security Impact**: None.
- **Data Integrity Impact**: Prevents stale `PENDING` payments.
- **Performance Impact**: None.
- **Resolution**:
  - Added `session_expired` kind to `ParsedWebhook` and handled `checkout.session.expired` in `lib/payments/stripe.ts`.
  - Added `applySessionExpired(paymentId)` in `app/api/webhooks/stripe/route.ts` which marks the payment `CANCELLED` and writes an audit log.
  - Created integration test `test/stripe-webhook.test.ts`.
- **Files Involved**: `lib/payments/stripe.ts`, `app/api/webhooks/stripe/route.ts`, `test/stripe-webhook.test.ts`.
- **Status**: `RESOLVED` (Verified: `test/stripe-webhook.test.ts` passed)

---

### [P1] Finding 8: Disconnected `payment.caseId` on Direct Consultation Bookings
- **Area**: Billing & Care Journey
- **Feature/Workflow**: Direct Doctor Consultation Booking & Case Linking
- **Severity**: P1
- **Current Behavior**: In `lib/actions/booking.ts:L216`, `bookConsultation` automatically created or resolved an `aestheticCase` (`resolvedCaseId`), but inserted the `payment` row with `caseId: input.caseId ?? null`, leaving `payment.caseId` permanently null for direct bookings. Furthermore, Stripe webhook consultation confirmation did not backfill `payment.caseId`.
- **Expected Behavior**: The payment row must immediately link to `resolvedCaseId`. Additionally, Stripe webhook confirmation must backfill `payment.caseId = confirmedCaseId` if missing, ensuring financial reporting and case ledgers remain completely unified.
- **Root Cause**: Input argument fallback took precedence over the internally resolved/created case ID.
- **User Impact**: Case history in dashboard/mobile could not correlate consultation fee payments to the generated case.
- **Business Impact**: Fragmented revenue ledger; impossible to accurately compute procedure/case lifetime value.
- **Security Impact**: None.
- **Data Integrity Impact**: Disconnected payment records and broken financial audit trail per case.
- **Performance Impact**: None.
- **Resolution**: Fixed `caseId: resolvedCaseId` in `lib/actions/booking.ts:L216`; added fallback backfill in `app/api/webhooks/stripe/route.ts:L414`; created test `test/booking-case-link.test.ts`.
- **Files Involved**: `lib/actions/booking.ts`, `app/api/webhooks/stripe/route.ts`, `test/booking-case-link.test.ts`.
- **Status**: `RESOLVED` (Verified: `test/booking-case-link.test.ts` passed)

---

### [P2] Finding 9: Mobile API Missing Pre-Appointment Cancellation Endpoint
- **Area**: Mobile API & Scheduling
- **Feature/Workflow**: Mobile App Appointment Management
- **Severity**: P2
- **Current Behavior**: Mobile endpoint `app/api/mobile/v1/appointments/[id]/route.ts` only supported `{ action: "mark_no_show" }` and `{ action: "reschedule_after_no_show" }`. Patients on mobile had no ability to cancel upcoming appointments ahead of time.
- **Expected Behavior**: Mobile API supports `{ action: "cancel", reason?: string }` via `cancelAppointment()`.
- **Root Cause**: Missing route handler union branch and schema case in mobile API.
- **User Impact**: Mobile patients could not cancel appointments if schedules changed.
- **Business Impact**: Doctor slot lockup and unnecessary no-shows from mobile patients.
- **Security Impact**: Enforces ownership check (bystanders receive 403 Forbidden).
- **Data Integrity Impact**: Appointments remained booked until missed after the fact.
- **Performance Impact**: None.
- **Resolution**: Added `{ action: "cancel", reason?: string }` to `BodySchema` in `app/api/mobile/v1/appointments/[id]/route.ts` wired to `cancelAppointment({ appointmentId: id, reason })`. Created test `test/mobile-appointment-cancel.test.ts`.
- **Files Involved**: `app/api/mobile/v1/appointments/[id]/route.ts`, `test/mobile-appointment-cancel.test.ts`.
- **Status**: `RESOLVED` (Verified: `test/mobile-appointment-cancel.test.ts` passed)

---

### [P1] Finding 10: Missing Admin Doctor License Management & Verification Action
- **Area**: Compliance, Provider Onboarding & Public Search
- **Feature/Workflow**: Admin Doctor Verification & License Management
- **Severity**: P1
- **Current Behavior**: The `doctorLicense` table and public doctor query `publicDoctorConditions()` strictly required doctors to have a valid, unexpired license (`status == "VALID"` and `expiryDate >= today`) and `verified == true` to appear in public search and be bookable. However, there was no server action or UI interface for admins to create, edit, or verify a doctor's license. As a result, onboarded doctors could never be verified or published from the admin panel.
- **Expected Behavior**: Admins with `PROVIDER_REVIEW` permission can view, create, and update doctor licenses with AES-256 encrypted license numbers, last-4 digit storage, expiry validation, and status toggles. Valid licenses auto-verify the doctor profile, and admins can toggle verification status directly.
- **Root Cause**: Missing server actions (`upsertDoctorLicenseAction`, `setDoctorVerifiedAction`) and admin UI dialog.
- **User Impact**: Patients could not discover or book newly onboarded doctors.
- **Business Impact**: Partner clinics and doctors could not go live after onboarding, stalling commercial launch.
- **Security Impact**: License numbers must remain encrypted with AES-256-GCM at rest; audit logs must capture all license modifications.
- **Data Integrity Impact**: Doctor profiles remained unverified and unpublishable.
- **Performance Impact**: None.
- **Resolution**:
  - Implemented `upsertDoctorLicenseAction` and `setDoctorVerifiedAction` in `lib/actions/doctor.ts` with AES-256 encryption (`encryptString`), RBAC permission checks (`PROVIDER_REVIEW`), audit logging (`doctor.license.update`, `doctor.verified.update`), and cache revalidation.
  - Added `DoctorLicenseDialog` and verification status toggle in `components/admin/doctor-table.tsx`.
  - Created test `test/provider-verification.test.ts`.
- **Files Involved**: `lib/actions/doctor.ts`, `components/admin/doctor-table.tsx`, `test/provider-verification.test.ts`.
- **Status**: `RESOLVED` (Verified: `test/provider-verification.test.ts` passed)

---

### [P1] Finding 11: Center Verification Deadlock Blocking Clinic Publishing
- **Area**: Provider Operations & Directory
- **Feature/Workflow**: Admin Center Verification
- **Severity**: P1
- **Current Behavior**: Centers required `status == "approved"`, `verified == true`, and `published == true` to be visible to the public (`publicCenterConditions()`). Furthermore, doctors affiliated with a center required that center to be public. However, the admin center management interface (`components/admin/center-table.tsx`) only offered status approval ("approved" / "suspended"), with no action or toggle to set `center.verified = true`. This created a deadlock where clinics remained unverified and all their affiliated doctors remained hidden from public search.
- **Expected Behavior**: Admins can toggle `verified` on medical centers. Un-verifying a center automatically unpublishes it to prevent exposing unverified clinics.
- **Root Cause**: Missing `setCenterVerifiedAction` and missing verification controls in `center-table.tsx`.
- **User Impact**: Patients cannot view accredited partner centers or book their doctors.
- **Business Impact**: Complete blockage of clinic network launches (e.g. Rejuvera clinic with 8 doctors).
- **Security Impact**: Un-verifying cascades to unpublishing to protect patients from unauthorized centers.
- **Data Integrity Impact**: Clinics were deadlocked in an unverified state.
- **Performance Impact**: None.
- **Resolution**:
  - Implemented `setCenterVerifiedAction({ centerId, verified })` in `lib/actions/center.ts` with audit logging (`center.verified.update`).
  - Added verification badge and toggle in `components/admin/center-table.tsx`.
  - Created test `test/provider-verification.test.ts`.
- **Files Involved**: `lib/actions/center.ts`, `components/admin/center-table.tsx`, `test/provider-verification.test.ts`.
- **Status**: `RESOLVED` (Verified: `test/provider-verification.test.ts` passed)

---

## Verification Summary
- **Typecheck**: `corepack pnpm typecheck` (`tsc --noEmit`) → 0 errors.
- **Automated Tests**: `corepack pnpm test` → 54 test suites, 237/237 tests passed against connected live database.
- **Production Build**: `corepack pnpm build` (Next.js 16.2.11 Turbopack) → 0 errors, all static & dynamic routes compiled, standalone bundle prepared.

