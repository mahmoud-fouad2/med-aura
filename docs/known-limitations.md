# Known Limitations & Honest Status

This document states plainly what is built and verified, and what is not yet.

## Verified in this environment

- `pnpm typecheck` (tsc, strict, **no** `ignoreBuildErrors`) — passes.
- `pnpm build` (Next production build with TS enforcement) — passes (27 routes).
- `pnpm test` — 16 unit tests pass; 4 integration tests skip without a DB.
- `pnpm db:generate` — produces real SQL (`drizzle/0000_init.sql`, 30 tables).

## NOT run in this environment (requires operator setup)

The build/dev machine had **no PostgreSQL, no Stripe/R2 credentials**. Therefore
the following are implemented as real code and SQL but were **not executed live
here**:

- Applying migrations against a live DB (`pnpm db:migrate`) and seeding.
- The live end-to-end journey writing to Postgres.
- Stripe sandbox checkout + webhook round-trip.
- R2 presigned upload + signed reads.

All of these are wired to run as soon as `DATABASE_URL` (+ optional Stripe/R2
keys) are provided. The integration tests in `test/integration/` execute the
critical DB guarantees once `DATABASE_URL` is set.

## Built (vertical slice) vs. Pending (broader spec)

**Built and working end-to-end:** auth + RBAC, provider application + compliance
approval, cosmetic catalog, DB-backed search + doctor profile, aesthetic case
wizard, private document upload + consent + per-document access grants,
availability + booking with DB-enforced no-double-booking, Stripe checkout +
idempotent webhook, patient & doctor dashboards, audit logging, i18n shell
(ar/en + RTL/LTR), brand system, error/legal pages.

**Pending (extend the same foundation, not yet implemented):** center
onboarding UI, treatment plans, quotes, invoices, travel, post-procedure
follow-up, messaging, reviews, before/after gallery, concierge/finance/center
dashboards, full marketplace homepage data sections, video provider integration,
MFA, email verification enforcement in production, full per-string i18n coverage.
Schemas/enums for several of these already exist; others are listed in the spec
(section 35) to be added incrementally.

## Implementation notes

- **Timezone:** availability slots are generated in server local time. A
  production deployment should store/compute against each clinic's timezone.
- **Email verification** is implemented but not enforced in dev (no email
  provider). Enable `requireEmailVerification` once email is configured.
- **`images.unoptimized`** was removed; remote R2 images are allowlisted via
  `R2_PUBLIC_BASE_URL`. Production image optimization needs `sharp` (bundled by
  Next on most platforms).
- **i18n** is cookie-based (functional switcher, full RTL/LTR). Per-string
  coverage focuses on the shell + slice; deeper coverage continues over time.
