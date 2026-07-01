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
  three migrations in `drizzle/`. Executed on a real Postgres in CI, **not** in
  this session (no local database).

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

Available DB scripts (from `package.json`): `db:generate`, `db:migrate`,
`db:status`, `db:seed`, `db:seed:catalog`, `db:seed:demo`.

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

Do **not** set `ENABLE_DEMO_DATA=true` in production.

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
