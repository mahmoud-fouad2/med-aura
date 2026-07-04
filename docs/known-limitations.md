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

## Quality-pass update

Added after the first build-out, in response to review feedback:

- **Design system**: `motion` (Framer Motion) primitives (Reveal/Stagger/FadeIn,
  reduced-motion aware), elegant shadows/mesh/gradient utilities, Tajawal heading
  font, vector icons everywhere (no emoji), `SectionHeading`/`EmptyState`/
  `Skeleton`/`Checkbox` primitives.
- **Premium homepage** with DB-backed sections; **two-panel auth** with
  **Remember me**, forgot/reset password, verify-email.
- **Full legal pages** (Terms, Privacy, Refund, Review, Medical disclaimer) —
  multi-section, with table of contents (no 2-line stubs).
- **Info + catalog pages**: about, contact (working form → `contact_message`),
  faq (DB), trust-and-safety, online-consultation, for-doctors, for-centers,
  procedures(+detail), centers(+detail). sitemap + robots + JSON-LD.

### Still deferred (honest)

_Sections landed in 2026-07 phases 1-4 supersede the earlier "deferred" list;
this is the current honest gap set:_

- **Video consultation adapter** — env vars `VIDEO_PROVIDER_API_KEY/SECRET`
  are read by `isVideoConfigured()` and surfaced honestly as "غير مهيأة" in
  the admin surface. A functional Twilio/Daily/Whereby adapter is not yet
  wired; the `VIDEO_CONSULTATION` appointment type still books but a "join
  video" link is not generated. Documented so nobody trips over it in a
  live consultation.
- **SMS / WhatsApp adapters** — env-var slots and the notification-
  preferences UI are in place; a real Twilio SMS + WhatsApp Business
  adapter still needs to be wired into `lib/notifications/`. The
  preferences UI already refuses to enable a channel the platform can't
  deliver, so nothing is fake here.
- **Invoice PDF generation** — the `invoice` table + endpoints exist but
  a PDF renderer (pdfkit/pdf-lib) is not yet integrated. The invoice
  detail page renders in HTML.
- **Watermark on Before/After media** — client-side context-menu block
  and `draggable=false` are in place; a server-side watermarking step
  (sharp) on upload is not.
- **Center branches, structured hours, map coordinates** — schema
  supports it via extension but the UI to author them per branch is
  pending.
- **Reviews UI writing/response** — reviews table exists and rating
  averages are consumed by search + JSON-LD; the patient review-writing
  form and provider response flow are pending.

Landed in 2026-07 (was previously listed as deferred):

- **Destinations** — `/destinations` + `/destinations/[slug]` with real DB
  aggregation of approved doctors/centers per country.
- **Before/After module** — schema + moderation + consent gate + public
  gallery with slider compare card.
- **Travel & Concierge Requests** — schema + queue + assign + offer +
  accept, wired to case detail.
- **Favorites & Comparison** — single flat favorite table; side-by-side
  compare at `/compare/doctors` and `/compare/centers`.
- **Center public application form** — `/for-centers/apply` writes a
  CENTER-kind provider_application with encrypted license fields.
- **Notification preferences UI** — 4-channel toggles with server-side
  refusal to enable unconfigured channels.
- **Command Palette + real 30-day activity chart** in the admin overview.
- **Local fonts** (Alexandria + Inter, next/font/local) — zero Google
  Fonts requests, verified.

### Windows build note

Production builds use Next 16 + Turbopack with many parallel workers. On Windows
this occasionally crashes with code `0xC0000409` when the `.next` cache is stale
or memory is tight. Reliable build command:

```bash
rm -rf .next && NODE_OPTIONS="--max-old-space-size=6144" pnpm build
```
