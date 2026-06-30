# C7 Final Audit — honest status

_Status legend: **PASSED** (built + verified here) · **PARTIAL** (partly built) ·
**NOT_DONE** (not implemented) · **NOT_TESTED** (built but not executed in this
environment — no live Postgres/Stripe/browsers here; runs in CI)._

Verification available in THIS environment: `pnpm typecheck` = 0 errors ·
`pnpm test` = **28 unit + 4 DB-gated integration (skipped without DB)** ·
`pnpm build` = exit 0. No live PostgreSQL/Stripe/Playwright here, so anything
requiring those is marked NOT_TESTED and wired to run in CI.

| # | Requirement | Status | Evidence | Route / File | Test | Remaining | Severity |
|---|-------------|--------|----------|--------------|------|-----------|----------|
| 1 | DB error classification (ok/empty/unavailable/error, no misleading empty) | **PASSED** | tsc 0; 6 query tests | `lib/db/query.ts`, `components/ui/data-state.tsx`, wired in search/procedures/centers/home/faq | `test/db-query.test.ts` | dashboards still use direct reads (auth-gated) | — |
| 1b | Error boundary / retry / requestId / monitoring / no SQL leak | **PASSED** | code | `app/error.tsx`, `components/ui/retry-button.tsx`, `lib/monitoring.ts` | — | wire monitoring to a real sink (Sentry) | low |
| 2 | Migration readiness + `db:status` + startup check + system-health | **PASSED** (code) / **NOT_TESTED** (live) | tsc 0; build 0 | `lib/db/migration-status.ts`, `scripts/check-database.ts`, `instrumentation.ts`, `/admin/system-health` | runs in CI `verify` job | execute against live DB | med |
| 3 | Seed protection + role separation | **PASSED** | 28 tests incl. role separation | `scripts/seed.ts` (prod refusal + `ENABLE_DEMO_DATA`), `lib/rbac.ts` | `test/rbac.test.ts` | center membership model (doctor↔center) is demo-grant only | med |
| 4 | Follow-up interaction (patient submit photos/answers/pain; doctor review/escalate) | **PARTIAL** | C6 creates plan+tasks on completion | `lib/actions/procedure.ts` (plan/tasks), `lib/db/schema/care.ts` | — | submission UI + action, doctor review, escalation, schema fields (instructionsEn, requiredPhotoAngles, questionnaireSchema, assignedRole) | **high** |
| 5 | Safety alerts workflow | **NOT_DONE** | schema only | `safety_alert`, `symptom_report` tables | — | triggers, notifications, SLA, statuses, UI | **high** |
| 6 | Remaining payment → FULLY_PAID per policy | **NOT_DONE** | enums/`invoice` exist; deposit works | `payment_purpose` enum, `invoice` | — | final-balance intent + webhook branch + invoice paid + receipts + policy | **high** |
| 7 | Refund workflow | **NOT_DONE** | `credit_note` table exists | — | — | request/review/approve states, idempotent refund, credit note | med |
| 8 | Center dashboard | **NOT_DONE** | — | — | — | full operational dashboard | **high** |
| 9 | Concierge dashboard | **NOT_DONE** | — | — | — | kanban/table/calendar + actions | **high** |
| 10 | Finance dashboard | **NOT_DONE** | — | — | — | payments/invoices/refunds + CSV, scoped (no medical) | med |
| 11 | Notifications inbox + conversations UI | **PARTIAL** | notifications + delivery rows created in actions | `lib/notifications.ts`, `notification`/`conversation` tables | — | inbox UI, unread/mark-read, conversation threads UI, read receipts | med |
| 12 | Case closure policy + record | **NOT_DONE** | state machine has CLOSED transitions | `lib/domain/case-state-machine.ts` | `test/case-state-machine.test.ts` | closure action + record + gates (no open alerts/disputes) | med |
| 13 | Real-DB E2E (full 32-step) | **PARTIAL / NOT_TESTED here** | Playwright spec written; runs in CI `e2e` job | `e2e/care-journey.spec.ts`, `playwright.config.ts` | covers home/procedures/search-visibility/real signup | payment-gated care steps need Stripe sandbox; multi-role orchestration | **high** |
| 14 | Concurrency tests | **PARTIAL** | double-booking constraint test | `test/integration/double-booking.test.ts` | runs in CI with DB | webhook-dup, double-accept, double-complete, concurrent refund | med |
| 15 | Linux CI (Postgres) | **PASSED** (config) / **NOT_TESTED** (not run here) | workflow file | `.github/workflows/ci.yml` | will run on push/PR | confirm first green run on GitHub | med |

## Care-journey transition coverage (server-side, state-machine guarded)

PASSED (built, tsc/build green; live execution NOT_TESTED — needs DB):
consultation complete → outcome → treatment plan (draft/publish) → quote
(server-side totals) → accept → **deposit (Stripe + idempotent webhook)** →
medical approval → center confirm → patient confirm → procedure complete →
invoice + auto follow-up plan → verified review.

Every transition calls `assertCaseTransition` (`lib/domain/case-state-machine.ts`)
+ `requirePermission` + `writeAudit`. Unit-tested in `test/case-state-machine.test.ts`.

## What is NOT proven end-to-end

The full 32-step journey has **not** been executed on a live database in this
environment (no Postgres/Stripe/browser here). The mechanism to prove it —
Linux CI with a Postgres service applying real migrations + seed + integration
tests + Playwright — is committed (`.github/workflows/ci.yml`) but its first run
happens on GitHub, not here. **Do not treat this as a verified end-to-end pass
until the CI run is green.**

## Integrations needing credentials

- **Stripe** (test keys + `STRIPE_WEBHOOK_SECRET`): consultation fee, deposit,
  and the (pending) final balance. Without it the UI says payment isn't available
  — no fake "paid".
- **R2**: private medical/follow-up file uploads.
- **Email/SMS/WhatsApp**: notification delivery (logged as NOT_CONFIGURED otherwise).

## Honest next steps (priority order)

Follow-up interaction (4) → safety alerts (5) → remaining payment (6) → refund (7)
→ center/concierge/finance dashboards (8–10) → notifications/conversations UI (11)
→ case closure (12) → extend Playwright to the full journey (13) once payments are
testable → confirm green CI (15).
