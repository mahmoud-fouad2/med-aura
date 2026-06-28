# Security

## Authentication & sessions

- Better Auth (email + password), secret from `BETTER_AUTH_SECRET`; the server
  refuses to boot in production without core env (`instrumentation.ts`).
- Cookies use Better Auth per-environment defaults (no forced `secure/none` in
  dev, so localhost login works). Rate limiting enabled on auth endpoints.
- Email verification + password reset implemented (enforce in prod once an email
  provider is configured).

## Authorization

- Real RBAC (`user_role` + permissions). **Public signup can only create a
  patient**; roles are server-granted (`role` field is `input:false`).
- Every server action / route handler checks `requireUser` + `requirePermission`;
  resource access uses `canAccessCase` / `canViewDocument`. Hiding UI is never the
  boundary.

## Data protection

- Private medical files: signed, short-lived read URLs only; per-document consent
  grants; revocation blocks reads; all views audited.
- License numbers encrypted at rest (AES-256-GCM, `lib/crypto.ts`).
- Input validation with Zod on all actions/forms; SQL via Drizzle (parameterized).

## Payments

- Webhook signature verification + idempotent event store; state changes only on
  verified events; no card data stored.

## Transport & headers

- Security headers in `next.config.mjs` (X-Content-Type-Options, X-Frame-Options,
  Referrer-Policy, Permissions-Policy, HSTS). Tighten with a full CSP before
  launch.

## Audit

- `audit_log` records logins, signups, provider approval/rejection, document
  view/upload, consent grant/revoke, appointment create/confirm, payment
  paid/failed (user, action, entity, ip, user-agent, metadata, time).

## Hardening TODO before production

Full CSP; MFA for doctors/admins; brute-force lockout tuning; malware scanning of
uploads; secret management/rotation; backups + restore drills (see deployment.md).
