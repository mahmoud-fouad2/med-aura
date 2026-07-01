# Deploying Med Aura to Render

All commands below are derived from the current `package.json` and were run in
this repo. The package manager is **pnpm** — the repo commits `pnpm-lock.yaml`
and `package.json` sets `"packageManager": "pnpm@9.15.0"`. There is no
`package-lock.json`/`yarn.lock`. `npm run <script>` also works locally because it
just runs the same scripts, but **installs must use pnpm** to honor the lockfile.

## Service type

Create a **Web Service** from the repo.

| Setting | Value |
|---|---|
| Root Directory | `.` (repo root — `package.json` and `next.config.mjs` live here) |
| Runtime | Node |
| Node version | `20` (pinned via `.node-version`; matches CI in `.github/workflows/ci.yml`) |
| Build Command | `corepack enable && pnpm install --frozen-lockfile && pnpm run build` |
| Pre-Deploy Command | `pnpm run db:migrate` |
| Start Command | `pnpm run start` |
| Health Check Path | `/api/health` |

Notes:
- `pnpm run build` → `next build`. **Tested in this repo: exit 0** (all routes
  compiled, incl. `/api/health`, `/api/readiness`).
- `pnpm run start` → `next start`. `next start` binds to the `PORT` Render
  injects — do **not** hardcode a port. **Tested here:** `PORT=10000 npm run start`
  served `GET /api/health` → `200`.
- `pnpm install --frozen-lockfile` is the correct install for the committed
  `pnpm-lock.yaml` (not re-run this session — dependencies were already present).
- `db:migrate` (`tsx scripts/migrate.ts`) requires `DATABASE_URL`. It applies the
  four migrations in `drizzle/` (`0000_init` … `0003_c7_ops_followup_safety_refund_closure`).
  Executed on a real Postgres in CI, **not** in this session (no local database).
- **"Pre-Deploy Command" is a Render dashboard field you must set yourself** —
  it is not read from this repo automatically. If it's left blank, Render
  builds and starts the app without ever running `db:migrate`, so the schema
  stays empty (`/api/readiness` reports `migrationsPending` > 0 and the app
  shows honest "temporarily unavailable" states instead of data). This is
  exactly what happened on the first deploy — see "Known issues" below.

## Health vs readiness

- `GET /api/health` — liveness. Never touches the DB. **Tested:** `200`
  `{"status":"ok",...}`. Use this as Render's Health Check Path so the instance
  stays up during migrations.
- `GET /api/readiness` — returns `200` only when the DB is connected and all
  migrations are applied, else `503`. **Tested:** `503` when DB is unreachable
  (`{"status":"not_ready","checks":{"databaseConnected":false,"migrationsPending":3,...}}`).
  The body contains booleans/counts only — no `DATABASE_URL`, SQL, or secrets.

## Database & seeding

1. Create a Render PostgreSQL instance; copy its **Internal** connection string
   into `DATABASE_URL`.
2. Migrations run automatically via the Pre-Deploy Command (`pnpm run db:migrate`).
3. Seed reference/catalog data once (roles, permissions, geography, procedures,
   FAQs) — safe in production:
   ```
   pnpm run db:seed:catalog
   ```
4. **Never** run demo data in production. `pnpm run db:seed:demo` refuses when
   `NODE_ENV=production`, and startup refuses to boot if `ENABLE_DEMO_DATA=true`.
5. Verify readiness from a shell: `pnpm run db:status` (exit 0 when all
   migrations are applied).
6. Create your first real admin account (safe in production — you supply the
   real email/password, there is no fixed demo password):
   ```
   BOOTSTRAP_ADMIN_EMAIL=you@example.com \
   BOOTSTRAP_ADMIN_PASSWORD='a-strong-password' \
   pnpm run db:bootstrap-admin
   ```
   Run this from the Render **Shell** tab (or a one-off Job) against the same
   `DATABASE_URL`. It refuses to run if an admin already exists, unless you
   also set `BOOTSTRAP_ADMIN_FORCE=true`.

Available DB scripts (from `package.json`): `db:generate`, `db:migrate`,
`db:status`, `db:seed`, `db:seed:catalog`, `db:seed:demo`, `db:bootstrap-admin`.

### Getting doctor/patient test accounts

`db:seed:demo` (fixed password `MedAura#2026`, from `scripts/seed.ts`) refuses
to run whenever `NODE_ENV=production` — Render sets that automatically for web
services, and this refusal is intentional (real customer data must never share
a database with fake demo accounts). Two honest ways to actually get a doctor
and a patient to click through as:

- **Use the real flows on production**: sign up a real patient account from
  `/sign-up`; for a doctor, sign up, then submit the provider application from
  `/dashboard/provider/apply`, then approve it yourself from `/admin/applications`
  using the admin account from step 6 above. This exercises the real approval
  flow, not a shortcut.
- **Spin up a second Render Web Service pointed at a second (cheap/free)
  Render Postgres** with `NODE_ENV=test` and `ENABLE_DEMO_DATA=true` set as
  env var overrides on that service only. There, `pnpm run db:seed:demo` is
  allowed and creates: `admin@medaura.local`, `compliance@medaura.local`,
  `patient@medaura.local`, `doctor@medaura.local`, `pending-doctor@medaura.local`
  — all with password `MedAura#2026`. Keep this service separate from the real
  production database.

## Environment variables

Set these in the Render dashboard (see `.env.example` and
`docs/audits/environment-audit.md` for the full, code-derived list):

Required to boot in production: `DATABASE_URL`, `BETTER_AUTH_SECRET`,
`ENCRYPTION_KEY`, `APP_URL` (and `BETTER_AUTH_URL`), `NODE_ENV=production`.
Startup **throws** if any of the first three is missing in production.

Feature-gated (optional; the feature is disabled and says so if unset):
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `R2_ACCOUNT_ID`,
`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_BASE_URL`,
`RESEND_API_KEY`, `EMAIL_FROM`, `RECAPTCHA_SECRET_KEY`, `MONITORING_WEBHOOK_URL`,
`VIDEO_PROVIDER_API_KEY`, `VIDEO_PROVIDER_API_SECRET`.

Recommended (see "Known issues" below): `NEXT_TELEMETRY_DISABLED=1`.

One-off, only when running `db:bootstrap-admin` (not needed for normal boot):
`BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD`, `BOOTSTRAP_ADMIN_NAME`,
`BOOTSTRAP_ADMIN_FORCE`.

Do **not** set `ENABLE_DEMO_DATA=true` in production.

## Known issues observed on first deploy

Two things showed up in the first Render deploy log (2026-07-01) that are worth
recording honestly:

**1. `migrationsPending: 3` / `42P01` (undefined_table) warnings.**
Not a bug — this is `lib/db/query.ts`'s error classification working exactly as
designed: it detected the schema wasn't there yet and returned `unavailable`
instead of crashing or showing a fake empty list. Root cause: the Render Web
Service's **Pre-Deploy Command** field was not set, so `db:migrate` never ran.
Fix: set it in the dashboard (Settings → Pre-Deploy Command → `pnpm run
db:migrate`), or run it once manually from the Render Shell tab, then confirm
with `pnpm run db:status`.

**2. `⨯ TypeError: controller[kState].transformAlgorithm is not a function`
right after boot.** Confirmed by inspecting `node_modules`: this string does
not appear in any dependency we ship — it is Node's own `stream/web`
(`TransformStream`) internals, not app code. It appeared once at startup (not
tied to a specific request) and did not crash the process — the service stayed
live and kept serving traffic. The only outbound `fetch()` that runs
unconditionally at `next start` boot in this stack, before any request is
handled, is Next.js's own anonymous CLI telemetry ping; that class of Node
fetch/decompression bug is a known trigger. Mitigation applied: set
`NEXT_TELEMETRY_DISABLED=1` as a Render env var, which removes that ping
entirely. This is a mitigation for a known trigger, not a change to any
application code path — if the error recurs with telemetry disabled, it has a
different cause and needs fresh log evidence to chase.

## Payments webhook (Stripe)

- Route (from `app/api/webhooks/stripe/route.ts`): **`https://YOUR_DOMAIN/api/webhooks/stripe`**
- Events consumed (from `lib/payments/stripe.ts`): `checkout.session.completed`
  and `payment_intent.payment_failed`.
- Signature is verified with `STRIPE_WEBHOOK_SECRET`; without it, webhook calls
  are rejected (payments can start but never confirm).
- After the first deploy, create the webhook endpoint in the Stripe dashboard
  pointing to the URL above, then put its signing secret in `STRIPE_WEBHOOK_SECRET`.

## Custom domain / URL changes

When you attach a custom domain, update `APP_URL` and `BETTER_AUTH_URL` to the
final `https://` origin (used for links, redirects, auth trusted origins, and the
Stripe success/cancel URLs), then update the Stripe webhook URL to match.

## Rollback

- Migrations are additive and are **not** auto-reverted. Roll back the service to
  the previous deploy in Render; if a migration must be undone, write a new
  forward migration (do not edit an applied one).
- `pnpm run db:status` reports whether the live schema matches the repo.
