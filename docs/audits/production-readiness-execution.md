# Production Readiness Execution Log

Last updated: 2026-09-01
Baseline branch: `main`
Baseline commit: `f282ac2`

This file is the persistent execution record for bringing Med Aura to a stable,
production-ready state. Read it before resuming work, update it whenever a section
is closed, and keep evidence next to each completed item.

## Working Rules

- Preserve existing work and user data. Never reset, clean, or recreate modified files.
- Work in batches of two or three coherent sections.
- Run targeted checks only after a batch closes, followed by the full release gate at the end.
- Do not change payment behavior in this cycle. Payments and refund workflows are deferred.
- Do not publish unsupported claims, fabricated metrics, or provider availability.
- Keep Arabic and English navigation, metadata, and customer flows equivalent.

## Status Legend

- `TODO`: not started.
- `IN PROGRESS`: active batch.
- `DONE`: implemented and verified.
- `BLOCKED`: requires external access, credentials, or an operator decision.
- `DEFERRED`: intentionally outside the current scope.

## Batch A: Product Truth, Locale Continuity, Mobile Typography

Status: `DONE`

### A1. Persistent Execution Record

- [x] Create this execution log.
- [x] Update statuses and evidence when every batch closes.

### A2. Mobile Typography

- [x] Reduce the overly bold appearance across the mobile app.
- [x] Distinguish semibold emphasis from strong display weight.
- [x] Standardize line heights for hero, title, heading, body, subtext, and captions.
- [x] Review compact controls and buttons for visual hierarchy and text fit.

### A3. Product Truth and Marketing Copy

- [x] Remove unsupported scale claims such as thousands of customers when live supply is empty.
- [x] Replace absolute superiority and security claims with specific, verifiable language.
- [x] Keep acquisition copy persuasive without claiming outcomes or inventory that does not exist.
- [x] Ensure empty doctor, center, and destination states provide a useful next action.

### A4. Locale Continuity

- [x] Preserve `/en` across homepage category, procedure, doctor, center, destination, and CTA links.
- [x] Correct authentication page metadata and locale-aware links.
- [x] Prevent English visitors from silently falling back to Arabic routes.

### Batch A Verification

- [x] Mobile typecheck and lint.
- [x] Web typecheck and focused tests for locale/metadata changes.
- [x] Visual smoke check at mobile and desktop widths.

## Batch B: Security and Runtime Reliability

Status: `IN PROGRESS`

### B1. Authentication Safety

- [x] Require verified email when production email delivery is configured.
- [x] Keep signup/profile creation atomic and present a clear verification state.
- [x] Reject external and protocol-relative authentication return paths.
- [ ] Verify delivered email, signup, sign-in, session, and logout against the deployed provider.

### B2. Browser Security

- [x] Add a production-compatible Content Security Policy.
- [x] Remove unnecessary framework disclosure headers.
- [x] Verify the public/auth shell under CSP with no browser console errors.
- [ ] Verify configured reCAPTCHA, Daily, Pusher, and R2 integrations after deployment.

### B3. Startup and Database Reliability

- [x] Fail production startup when required migrations fail.
- [x] Keep migration logs free of connection details and secrets.
- [ ] Document the exact Render health check and migration behavior.

### Batch B Verification

- [x] Focused auth, environment, navigation, onboarding, and referral tests.
- [x] Web/mobile typecheck and lint, plus a production web build.
- [x] Local production runtime smoke check for CSP, disclosure headers, signup metadata, and verification UI.
- [ ] Deployed runtime smoke checks against health, readiness, signup, sign-in, session, logout, and admin routes.

### B4. Interruption Fixes: Social 2FA and Referrals

- [x] Allow passwordless 2FA management only for accounts without a credential password.
- [x] Keep password confirmation mandatory for credential accounts.
- [x] Apply the same account-aware flow on web and mobile.
- [x] Fix referral linking after trigger-based patient-profile provisioning.
- [x] Preserve localized invite links and copy the link when native sharing is unavailable.
- [x] Rename the misleading invite counter to count friends who actually joined.

### B5. Provider Publication Integrity

- [x] Make admin publish checks match the public doctor and center visibility rules.
- [x] Require a verified profile and a current `VALID` license before publishing a doctor.
- [x] Require center verification before publication.
- [x] Add explicit, read-only Rejuvera readiness reporting and package commands.
- [x] Confirm the connected database contains one Rejuvera center and eight doctors without changing them.
- [ ] Enter and verify real license data for Rejuvera, then publish from the admin workflow.

## Batch C: Customer Journey and Accessibility

Status: `IN PROGRESS`

- [ ] Audit the complete discovery-to-consultation journey in Arabic and English.
- [ ] Give every form control an accessible name and error relationship. Search and booking controls are complete; dashboard sweep remains.
- [ ] Bring interactive touch targets to at least 44 by 44 CSS pixels. Search, filters, and booking slots are complete; dashboard sweep remains.
- [x] Add localized loading, empty, retry, offline, and success states to shared public data surfaces.
- [ ] Remove redirect loops and dead-end calls to action.
- [ ] Verify keyboard navigation, focus visibility, and screen-reader landmarks.

## Batch D: Performance and Code Health

Status: `IN PROGRESS`

- [ ] Remove unnecessary dynamic rendering and `no-store` behavior from cacheable public pages.
- [ ] Optimize oversized source images and confirm responsive delivery.
- [x] Replace process-local rate limiting with atomic shared PostgreSQL counters and a local fail-safe.
- [ ] Remove dead code and consolidate duplicated locale, metadata, and status logic.
- [ ] Reconcile documentation with current commands, versions, and deployment behavior.

## Batch E: SEO, GEO, and Brand Discovery

Status: `DONE`

- [x] Ensure unique localized titles, descriptions, canonicals, and hreflang metadata.
- [x] Keep sitemap entries limited to useful, indexable Arabic and English pages.
- [x] Validate Organization, WebSite, Breadcrumb, Physician, MedicalClinic, Review, and FAQ schema.
- [x] Keep ratings schema tied only to real, eligible review data.
- [x] Maintain accurate `robots.txt`, `llms.txt`, and local/entity discovery content.
- [x] Strengthen category and intent copy without keyword stuffing or unsupported superlatives.

## Batch F: Mobile and AI Assistant

Status: `TODO`

- [x] Record assistant duration, mode, turn count, and result count without logging prompts or secrets.
- [x] Replace false offline errors with timeout, server, connectivity, and catalog-fallback states.
- [x] Add user cancellation and explicit retry; progressive stages and resilient streaming are complete.
- [x] Bound model work to one tool round, minimal thinking, and seven-second model attempts before falling back.
- [x] Keep the assistant useful with real catalog search when Gemini is missing, rate-limited, or unavailable.
- [x] Send the mobile locale to the assistant and localize replies and follow-up suggestions.
- [x] Confirm Android release versioning, signing, permissions, deep links, and update URL; release is `1.0.48` (`versionCode 49`).
- [ ] Run a real-device visual and functional pass after typography changes.

## Batch G: Analytics and Operations

Status: `IN PROGRESS`

- [x] Emit search, doctor-view, booking-start, checkout-open, signup, and booking funnel events.
- [x] Define conversion, zero-result search, signup, consultation, and assistant-health dimensions without collecting medical query text.
- [ ] Configure external error monitoring and uptime alerts.
- [ ] Add a production rollback checklist and incident ownership.

## Deferred: Payments

Status: `DEFERRED`

- Stripe production checkout and webhook round-trip.
- Refund automation and reconciliation.
- Deposit and final-payment workflows.
- Payment-qualified referral rewards.

## External or Operator-Owned Items

- `TODO`: production email provider credentials and sender-domain verification.
- `TODO`: shared rate-limit store credentials.
- `TODO`: external error monitoring and uptime service credentials.
- `TODO`: final commercial approval for public claims and legal copy.

## Evidence Ledger

- Baseline before this plan: web tests `207/207`, mobile tests `30/30`, Expo Doctor
  `21/21`, web typecheck/lint/build successful, and CI green at `f282ac2`.
- Live baseline: `/api/health` and `/api/readiness` returned HTTP 200; public data
  contained no active doctors or centers, so acquisition copy must not imply live scale.
- Mobile baseline: functional overall, but global 700-weight use makes much of the
  interface look overly bold and weakens hierarchy in compact areas.
- Batch A: mapped everyday `bold` emphasis to the loaded Readex Pro 600 face,
  reserved 700 for explicit `heavy` display use, and added per-variant line heights.
- Batch A: removed fabricated `+50`, `+20`, `+10k`, `15`, and "thousands" claims;
  empty destinations no longer render disabled provider-less cards.
- Batch A: Arabic desktop and English 390px visual smoke checks passed with no
  console errors or horizontal overflow. English category links retained `/en`.
- Batch A checks: web typecheck passed; mobile typecheck and lint passed; focused
  i18n and SEO tests passed `7/7`; `git diff --check` reported no whitespace errors.
- Batch B implementation: email verification now activates only when transactional
  email is configured; web and mobile both present a resend/sign-in state instead
  of attempting profile completion without a session.
- Batch B security: production CSP returned on the local production server,
  `X-Powered-By` was absent, and Arabic/English auth pages rendered without console errors.
- Batch B interruption fixes: Better Auth `allowPasswordless` is paired with a
  database-derived `hasCredential` flag, so Google-only accounts never see an
  impossible password prompt while password accounts remain protected.
- Batch B checks: web/mobile typecheck and lint passed; production build passed;
  focused env, auth-channel, onboarding, navigation, and referral tests passed `25/25`.
- Customer journey: search labels are programmatically associated in both mobile
  and desktop filter variants; public data failures and retries now follow the page locale.
- Booking journey: corrected the prior false claim that slots used device time;
  slot labels and booking UI now follow Arabic/English while accurately describing clinic time.
- Assistant: official Google model documentation confirms the configured stable model IDs;
  provider failures now fall back to real catalog results instead of a dead-end unavailable message.
- Rejuvera connected-DB check: center exists with eight doctors; all eight are
  intentionally blocked by unverified profiles and `PENDING` licenses. No records were changed.
- Grouped checks after customer journey and assistant work: web/mobile typecheck passed;
  targeted assistant, streaming, availability, and navigation tests passed `21/21`.
- Performance: expensive-route throttles now use hashed, atomic PostgreSQL counters
  shared by all app instances, with a conservative process-local fallback during DB outages.
- Analytics: previously declared but unused discovery and booking events are now emitted;
  event schemas continue to discard unapproved fields and never store search or medical text.
- SEO/GEO review: localized canonicals/hreflang, entity-only sitemap, Organization,
  WebSite, Breadcrumb, Physician, MedicalClinic, eligible ratings, FAQ, robots, and llms surfaces remain coherent.

## Resume Procedure

1. Run `git status --short` and `git diff --check`.
2. Read this file and continue from the first `IN PROGRESS` section.
3. Inspect existing changes before editing.
4. Close two or three related sections, update this file, then run one grouped check.
5. Record commands and outcomes in the Evidence Ledger before committing.
