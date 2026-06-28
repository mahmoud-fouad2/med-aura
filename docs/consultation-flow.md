# Consultation Flow

## Current (slice)

- Consultations are booked as `VIDEO_CONSULTATION` appointments and confirmed via
  payment webhook.
- The doctor sees confirmed appointments and consented cases in
  `/dashboard/doctor`, and can open shared case detail + view private documents
  (audited) only when consent is active.

## Video provider

A video provider is **not** wired yet. `lib/env.ts` exposes `isVideoConfigured()`
so the UI can show video as available only when configured — and never fabricate
a meeting link. In-person/phone consultations work without it.

## Next phase

Post-consultation outcomes: doctor notes, request more photos/labs, preliminary
eligibility, medical rejection with reason, issue a **treatment plan**, and a
follow-up recommendation. The `consultation*` tables from the spec (section 35)
will be added when this phase is built.
