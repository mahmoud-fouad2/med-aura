# Environment audit — extracted from the code

Every variable below was found by searching the current code (`process.env.*`
and the zod schema in `lib/env.ts`). Variables are grouped as **consumed by the
app**, **platform-injected** (set by the host, not by us), and **removed this
session** (declared but never read). All app variables are **server-only** —
there are currently **no `NEXT_PUBLIC_*`** variables.

## Consumed by application code

| Variable | Req/Opt | Where read (file:line) | Purpose | If missing |
|---|---|---|---|---|
| `DATABASE_URL` | Required | `lib/db/index.ts:15`, `lib/db/query.ts:39`, `lib/db/migration-status.ts:36`, `drizzle.config.ts:11`, `instrumentation.ts:13`, `scripts/migrate.ts`, `scripts/seed.ts`, `scripts/check-database.ts` | PostgreSQL connection | Blocks startup in prod (`lib/env.ts` assertCoreEnv); in dev the app runs and DB pages show an honest "unavailable" state |
| `BETTER_AUTH_SECRET` | Required | `lib/auth.ts:22`, `lib/env.ts` (assertCoreEnv) | Better Auth session/signing secret | Blocks startup in prod; dev uses a placeholder |
| `ENCRYPTION_KEY` | Required in prod | `lib/crypto.ts:19`, `lib/env.ts` (assertCoreEnv) | AES-256-GCM field encryption at rest | Blocks startup in prod; dev derives a warned insecure key |
| `APP_URL` | Optional (req prod) | `lib/env.ts:114` (appUrl) | Public base URL for links/redirects/auth | Falls back to `BETTER_AUTH_URL` then `http://localhost:3000` |
| `BETTER_AUTH_URL` | Optional | `lib/env.ts:117` (appUrl), `lib/auth.ts:23` | Auth base URL | Falls back to `APP_URL`/localhost |
| `NODE_ENV` | Optional | `lib/env.ts:16`, `lib/db/index.ts:20`, `lib/crypto.ts:25`, `lib/logger.ts:8`, `lib/session.ts:29`, `lib/email.ts:24`, `app/layout.tsx:56` | dev/test/prod behavior switch | Defaults to `development` |
| `STRIPE_SECRET_KEY` | Optional | `lib/env.ts:105` (isStripeConfigured), `lib/payments/stripe.ts:15` | Stripe (payments) | Payments disabled; UI says "not configured" |
| `STRIPE_WEBHOOK_SECRET` | Optional | `lib/env.ts:106`, `lib/payments/stripe.ts:97`, `app/api/webhooks/stripe/route.ts` | Verify Stripe webhook signature | Payments can start but never confirm |
| `R2_ACCOUNT_ID` | Optional | `lib/env.ts:100`, `lib/storage/r2.ts:32` | R2 storage account | Uploads disabled |
| `R2_ACCESS_KEY_ID` | Optional | `lib/env.ts:100`, `lib/storage/r2.ts:34` | R2 access key | Uploads disabled |
| `R2_SECRET_ACCESS_KEY` | Optional | `lib/env.ts:100`, `lib/storage/r2.ts:35` | R2 secret | Uploads disabled |
| `R2_BUCKET` | Optional | `lib/env.ts:101`, `lib/storage/r2.ts:49` | R2 bucket name | Uploads disabled |
| `R2_PUBLIC_BASE_URL` | Optional | `next.config.mjs:28,32`, `lib/storage/r2.ts:66` | Public-asset base URL + Next image host allowlist | `getPublicUrl` returns null; no remote image host |
| `RESEND_API_KEY` | Optional | `lib/env.ts:107` (isEmailConfigured), `lib/email.ts:34` | Resend email send | Emails logged, not sent |
| `EMAIL_FROM` | Optional | `lib/env.ts:107`, `lib/email.ts:39` | Email From address | Emails logged, not sent |
| `RECAPTCHA_SECRET_KEY` | Optional | `lib/env.ts:110` (isRecaptchaConfigured), `lib/security/recaptcha.ts:41` | Contact-form spam check (server verify) | Verification skipped (fallback allow) |
| `VIDEO_PROVIDER_API_KEY` | Optional | `lib/env.ts:108` (isVideoConfigured), `app/admin/system-health/page.tsx:27` | Video readiness flag | Flag shows "off" |
| `VIDEO_PROVIDER_API_SECRET` | Optional | `lib/env.ts:109` | Video readiness flag | Flag shows "off" |
| `MONITORING_WEBHOOK_URL` | Optional | `lib/monitoring.ts:13`, `lib/env.ts:53` | Forward sanitized error payloads | Errors logged only |
| `ENABLE_DEMO_DATA` | Dev/Test only | `scripts/seed.ts`, `scripts/check-database.ts:28`, `lib/env.ts` (assertCoreEnv) | Gate demo accounts in the seed | No demo data; **must be false in prod** (prod boot refuses `true`) |

## Platform-injected (not set by us)

| Variable | Set by | Read in | Note |
|---|---|---|---|
| `PORT` | Host (Render) | `next start` (framework) | Our code does not read it; `next start` binds to it |
| `NEXT_RUNTIME` | Next.js | `instrumentation.ts:7` | "nodejs"/"edge" during instrumentation |
| `VERCEL_PROJECT_PRODUCTION_URL` | Vercel | `lib/env.ts:119` | Only used as an appUrl fallback on Vercel; irrelevant on Render |
| `CI` | CI runner | `playwright.config.ts`, `.github/workflows/ci.yml` | Test/retry behavior |

## Removed this session (declared but never consumed)

- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — no client code read it. Stripe checkout is
  redirect-based (`lib/payments/stripe.ts` `createCheckoutSession`), which needs
  only the server secret. Removed from `lib/env.ts` + `.env.example`.
- `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` — no client widget generates a token. Server
  verification exists (`lib/actions/contact.ts:30`) but the client half is not
  implemented, so the key was unused. Removed; re-add with a client widget to
  complete reCAPTCHA.

## Integration reality (from code)

- **Payments: Stripe** — used (`lib/payments/stripe.ts`, `stripe` dependency,
  `app/api/webhooks/stripe/route.ts`). Redirect Checkout + webhook. Needs
  `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET`.
- **Storage: Cloudflare R2** — used (`lib/storage/r2.ts`, `@aws-sdk/client-s3`).
  Private files via signed URLs; needs the four `R2_*` values.
- **Email: Resend** — used (`lib/email.ts`, direct REST call to
  `https://api.resend.com/emails`). Needs `RESEND_API_KEY` + `EMAIL_FROM`.
- **reCAPTCHA** — server verify only (`lib/security/recaptcha.ts`), wired into the
  contact action; client token generation not implemented.
- **Monitoring** — adapter only (`lib/monitoring.ts`): logs, plus optional POST
  to `MONITORING_WEBHOOK_URL`. No Sentry/Datadog SDK.
- **Video** — no provider SDK integrated; the two `VIDEO_*` vars only drive the
  readiness indicator on `/admin/system-health`.
- **SMS / WhatsApp** — **not used** (no code references, no dependency).
