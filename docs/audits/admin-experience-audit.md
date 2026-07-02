# Admin Experience — pre-work audit (2026-07-01)

Real code inspection of `app/admin`, `app/dashboard`, RBAC, schema, and actions
before rebuilding the admin experience. HEAD at audit time: `586b101`.

| Area | State | Detail |
|---|---|---|
| `/admin` shell | **Placeholder** | `AppShell` flat top-nav (3 links), no sidebar, no breadcrumbs, no search, no KPIs |
| `/admin` overview | **Placeholder** | One card: pending-applications count. No other metric exists |
| `/admin/applications` | **Real** | Full review flow (approve/reject/notes), DB-backed |
| `/admin/system-health` | **Real** | DB + integration status, no secrets leaked |
| Case list (admin-wide) | **Unimplemented** | No `/admin/cases`; only per-role views (`/dashboard/cases` = own cases, `/dashboard/center` = center-scoped) |
| Case detail (`/dashboard/cases/[id]`) | **Real, but patient-viewpoint only** | Missing patient name / center name fields (schema has them, query doesn't select them); quote/payment panels gated to literal owner/doctor, invisible to staff; no activity-log section |
| Follow-up (`lib/actions/follow-up.ts`) | **Real, submit+review only** | No manual "staff creates a task" action — tasks only ever auto-created by `completeProcedure` |
| Safety alerts (`lib/actions/safety.ts`) | **Real, auto-trigger + lifecycle only** | No manual "staff opens an alert" action; no `assignedTo` column existed (added this session, migration `0004`) |
| Payments (`lib/actions/payment.ts`, `/dashboard/finance`) | **Real** | Deposit + final balance + Stripe webhook; finance dashboard already reads live payment/invoice data |
| Refunds (`lib/actions/refund.ts`) | **Real** | Request → review → provider-confirm → process, wired into `/dashboard/finance` |
| Notifications (`/dashboard/notifications`) | **Real** | Inbox, unread count, mark read, retry, preference toggle |
| Case closure (`lib/actions/case-closure.ts`) | **Real** | Eligibility gates + record, wired into case detail |
| Concierge board (`/dashboard/concierge`) | **Real** | Kanban/table for `internal_task`, not yet linked from admin nav |
| Center dashboard (`/dashboard/center`) | **Real** | Scoped via `center_staff`, not yet linked from admin nav |
| Patients list | **Unimplemented** | No admin-wide patient list page |
| Doctors / Centers oversight list | **Unimplemented** | Only public marketing listings (`/doctors`, `/centers`); no admin management view |
| Consultation-requests admin view | **Unimplemented** | Appointments are queried per-doctor/per-patient only; no platform-wide view |
| Activity log UI | **Unimplemented** | `audit_log` table + `writeAudit()` populate it everywhere; nothing renders it |
| Content/procedures management | **Unimplemented** | Catalog is seed-only; no CRUD UI (`CATALOG_MANAGE` permission exists, unused) |
| Countries/cities management | **Unimplemented** | Same — seed-only |
| Users & roles management | **Unimplemented** | `ROLE_ASSIGN`, `USER_READ_ANY` permissions exist, no UI consumes them |
| Global conversations inbox | **Unimplemented** | Conversations exist only per-case inside case detail |
| Settings | **Unimplemented, nothing to configure yet** | No platform-level settings exist in schema |

### RBAC gaps found (fixed this session, see `lib/rbac.ts`)

- `COMPLIANCE_REVIEWER` had no `CASE_READ_ANY` — a compliance reviewer could
  reach `/admin` but `canAccessCase` would reject them from every case detail
  page the new case list would link to. Added `CASE_READ_ANY`,
  `APPOINTMENT_READ_ANY`, `SAFETY_ALERT_MANAGE`, `ADMIN_ACCESS`.
- `CONCIERGE` had `SAFETY_ALERT_MANAGE` but not `FOLLOWUP_MANAGE`, so they could
  never schedule a follow-up task. Added `FOLLOWUP_MANAGE`.
- Financial permissions (`PAYMENT_READ_ANY`, `FINANCE_ACCESS`) were **not**
  added to `COMPLIANCE_REVIEWER` — kept deliberately scoped to
  `FINANCE_ADMIN`/`SUPER_ADMIN` only, consistent with the existing
  no-financial-data-to-non-finance-roles principle already enforced elsewhere.

### Hardcoded / placeholder data found

- `app/admin/page.tsx`: only one real query (pending applications); no fake
  numbers, but also no other metric — the "empty" the user is reporting.
- No file in `app/admin/**` or `app/dashboard/**` contains fabricated numbers
  or Lorem Ipsum; the complaint is under-building, not fake data.

### Scope decisions for this pass (stated up front, not hidden)

- The new sidebar shell is built for `/admin/*` specifically. `/dashboard/*`
  (patient-facing + doctor + the three ops dashboards already shipped) keeps
  the existing flat `AppShell` — rebuilding every shared layout is out of
  scope for this pass; the admin sidebar links out to `/dashboard/center`,
  `/dashboard/concierge`, `/dashboard/finance`, `/dashboard/notifications`
  rather than duplicating them under `/admin/*`.
- Case *detail* stays at `/dashboard/cases/[id]` (extended for staff
  visibility) — no duplicate `/admin/cases/[id]` route, per the "don't create
  duplicate routes" instruction.
