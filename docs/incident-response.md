# Incident Response

## Ownership

- **Incident commander** — owns severity, timeline, decisions, and closure.
- **On-call engineer** — triage, mitigation, rollback, and technical evidence.
- **Security owner** — assessment, key rotation, and regulator/notification decisions.
- **Product/Support** — customer communication and affected-user follow-up.

Keep names and provider escalation contacts outside the repository. Every alert
must have one acknowledged incident commander; an unowned alert is unresolved.

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

## Production rollback checklist

1. Capture the failing commit, first observed time, route, status code, and
   request ID. Never paste tokens, cookies, connection strings, or medical text.
2. Check `/api/health` and `/api/readiness` separately to distinguish process
   failure from database/schema failure.
3. Stop the rollout and redeploy the last known-good Render commit.
4. Do not roll back an applied migration. Use a compatible forward migration
   when schema correction is required.
5. Verify Arabic and English home/auth routes, sign-in, session, logout, and the
   affected journey before resolving the incident.
6. Assign every follow-up an owner and due date.

## Useful queries

- Recent sensitive actions: `SELECT * FROM audit_log ORDER BY "createdAt" DESC`.
- Webhook anomalies: inspect `payment_webhook_event` (`error`, `processedAt`).
- Suspicious file access: filter `audit_log` for `medical_document.view`.

## Automated signals

- GitHub Actions runs `.github/workflows/production-smoke.yml` every 30 minutes
  and checks the public home, liveness, and readiness endpoints.
- Render remains responsible for process health using `/api/health`.
- Application error aggregation still requires an external monitoring provider
  and production credentials; until configured, structured Render logs and
  request IDs are the diagnostic source of record.
