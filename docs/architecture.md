# Architecture

## Overview

Next.js App Router monolith. Server Components fetch data directly via Drizzle;
mutations go through **Server Actions** (`lib/actions/*`) and a few **Route
Handlers** (`app/api/*`) for uploads and the Stripe webhook.

```
app/                 routes (pages, layouts, api)
components/          UI (brand, layout, search, cases, booking, admin, …)
lib/
  db/               drizzle client + schema (by domain) + migrations source
  data/             read queries (doctors, cases, appointments, availability)
  actions/          server actions (provider, cases, booking)
  payments/         Stripe adapter (provider-agnostic surface)
  storage/          R2 (private signed reads)
  rbac.ts           roles, permissions, resource-level checks
  session.ts        auth/session + page/action guards
  env.ts            import-safe env + integration flags
  audit.ts, logger.ts, errors.ts, crypto.ts, email.ts, uploads.ts, status-labels.ts
  i18n/             ar/en dictionaries + cookie locale
drizzle/            generated SQL migrations
scripts/            migrate / seed / db-health
test/               unit + DB-gated integration
```

## Key principles

- **Authorization is server-side.** Every action/route calls `requireUser` +
  `requirePermission` and, for resources, `canAccessCase` / `canViewDocument`.
  Hiding a button is never the security boundary.
- **Honest integrations.** `env.ts` exposes `isStripeConfigured` / `isR2Configured`
  etc.; the UI shows "not configured" instead of faking success.
- **State machines in the DB.** Statuses are `pgEnum`s; transitions are recorded
  in `*_status_history` tables.
- **Money/correctness guarantees live in the DB.** No-double-booking is a
  partial unique index; webhook idempotency is a unique `(provider,eventId)`.
- **Dynamic rendering** for data pages (`export const dynamic = "force-dynamic"`),
  so builds never touch the database.
