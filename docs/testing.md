# Testing

```bash
pnpm test          # vitest run
pnpm test:watch
pnpm typecheck     # tsc --noEmit (strict)
pnpm build         # next build (TS enforced)
```

## Unit tests (run anywhere)

- `test/rbac.test.ts` — permission model: public/patient cannot approve providers
  or access admin; patient can apply/case/upload/consent/book/pay; super admin
  wildcard; compliance approves but can't book; doctor confirms but can't approve.
- `test/uploads.test.ts` — MIME allowlist, size limits, empty-file rejection.
- `test/crypto.test.ts` — AES-256-GCM round-trip, random IV, `last4`.
- `test/availability.test.ts` — slot generation, booked-slot exclusion, lead
  time, limit.

## Integration tests (require `DATABASE_URL`; skipped otherwise)

- `test/integration/double-booking.test.ts` — second appointment in the same
  slot fails with unique violation `23505`.
- `test/integration/search-visibility.test.ts` — approved + valid-license doctor
  is listed; expired-license and unapproved doctors are excluded.

Run with a database:

```bash
DATABASE_URL=postgres://… pnpm db:migrate
DATABASE_URL=postgres://… pnpm test
```

## Recommended next tests

Webhook idempotency (duplicate event no-op), consent-revocation blocks document
read, payment-failure never marks paid, and Playwright E2E of the full slice.
