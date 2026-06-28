# Incident Response (baseline)

A minimal, practical plan to expand before launch.

## Roles

- **On-call engineer** — triage & mitigation.
- **Security owner** — assessment, comms, regulator/notification decisions.
- **Product/Support** — user communication.

## Severity

- **SEV1** — data breach, payments incorrect, platform down.
- **SEV2** — major feature broken, degraded auth.
- **SEV3** — minor/isolated.

## Steps

1. **Detect** — alerts, logs (`audit_log`, app logs), provider dashboards
   (Stripe/R2/DB).
2. **Contain** — revoke keys, disable affected route/feature flag, rotate
   `BETTER_AUTH_SECRET`/provider keys, suspend accounts if needed.
3. **Eradicate & recover** — patch, restore from backup (see deployment.md),
   re-enable.
4. **Notify** — affected users / regulators per policy and jurisdiction.
5. **Postmortem** — timeline, root cause, action items; no blame.

## Useful queries

- Recent sensitive actions: `SELECT * FROM audit_log ORDER BY "createdAt" DESC`.
- Webhook anomalies: inspect `payment_webhook_event` (`error`, `processedAt`).
- Suspicious file access: filter `audit_log` for `medical_document.view`.

## Contacts

Maintain an up-to-date on-call + provider-support contact list (out of repo).
