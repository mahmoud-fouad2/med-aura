# Deployment

## Prerequisites

- PostgreSQL (managed recommended), Cloudflare R2 bucket, Stripe account.
- Set all variables from `.env.example` in the host's secret store.

## Steps

1. Provision Postgres; set `DATABASE_URL`.
2. `pnpm install`
3. `pnpm db:migrate` (apply `drizzle/`), then seed only if non-production.
4. `pnpm build` && `pnpm start` (or deploy to a Next.js host).
5. Configure the Stripe webhook endpoint → `/api/webhooks/stripe`; set
   `STRIPE_WEBHOOK_SECRET`.
6. Set `APP_URL` / `BETTER_AUTH_URL` to the public URL; `ENCRYPTION_KEY`
   (`openssl rand -hex 32`); `BETTER_AUTH_SECRET` (`openssl rand -base64 32`).

## Production checklist

- `NODE_ENV=production` (server refuses to boot without core env).
- Real email provider; enable `requireEmailVerification`.
- Tighten CSP; verify security headers.
- `images` optimization works (host provides `sharp`).
- Never run `db:seed` in production (guarded; needs `FORCE_SEED=true`).

## Migrations

Roll forward with `pnpm db:generate` + `pnpm db:migrate`. For rollback, restore
from backup and/or write a compensating migration — Drizzle migrations are
forward-only; keep each change small and reviewed.

## Backups & restore

- Enable automated Postgres backups + PITR; test restore regularly.
- R2: enable versioning/lifecycle as appropriate for medical retention.
- Document the restore runbook and rehearse it (see incident-response.md).
