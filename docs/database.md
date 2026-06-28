# Database

PostgreSQL via Drizzle ORM. Schema is split by domain under `lib/db/schema/` and
re-exported from `index.ts`. Generated SQL lives in `drizzle/`.

## Migrations

```bash
pnpm db:generate   # diff schema -> new SQL in drizzle/
pnpm db:migrate    # apply pending migrations (scripts/migrate.ts)
pnpm db:studio     # browse data
```

`drizzle/0000_init.sql` creates **30 tables** + 12 enums.

## Domains (tables)

- **auth/rbac:** `user`, `session`, `account`, `verification`, `role`,
  `permission`, `role_permission`, `user_role`
- **catalog:** `country`, `city`, `procedure_category`, `procedure`
- **patients:** `patient_profile`
- **providers:** `center`, `doctor_profile`, `doctor_license`,
  `doctor_procedure`, `provider_application`, `verification_review`
- **cases:** `aesthetic_case`, `case_status_history`, `medical_document`,
  `consent`, `document_access_grant`
- **scheduling:** `availability_rule`, `appointment`, `appointment_status_history`
- **finance:** `payment`, `payment_webhook_event`
- **audit:** `audit_log`

## Notable constraints

- `appointment_no_double_booking` — partial **unique** index on
  `(doctorId, startsAt)` WHERE status not cancelled.
- `webhook_event_unique` — unique `(provider, eventId)` for idempotency.
- `payment_intent_idx` — unique provider intent id.
- Relations use FKs; soft-delete via `deletedAt`; `createdAt/updatedAt` everywhere;
  `createdBy/updatedBy` on editable domain tables.

## Conventions

- Better Auth tables keep camelCase columns (do not rename).
- Doctor↔procedure is a real join table (`doctor_procedure`), never a text array.
- Sensitive values (license numbers) are encrypted at rest (`lib/crypto.ts`).
