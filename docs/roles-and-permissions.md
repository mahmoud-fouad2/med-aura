# Roles & Permissions (RBAC)

Authorization is **not** based on the denormalized `user.role` string. It is
based on the `user_role` table (assignable only by the server) mapped to
permissions defined in `lib/rbac.ts`.

## Roles

`patient`, `doctor`, `center_owner`, `center_admin`, `center_staff`, `concierge`,
`compliance_reviewer`, `finance_admin`, `support_agent`, `content_admin`,
`super_admin`.

- **Public signup always creates a `patient`** (Better Auth `role` field is
  `input:false`). Users can never self-assign a privileged role.
- Provider roles (`doctor`, …) are granted only by the reviewed Provider
  Application approval flow.
- `super_admin` is a wildcard (all permissions).

## Permission checks

- `requirePermission(userId, PERMISSIONS.X)` — throws `FORBIDDEN`/`UNAUTHORIZED`.
- `requirePermissionPage(X)` — for server components; redirects to `/sign-in` or
  `/403`.
- Resource-level: `canAccessCase(userId, caseId)` (owner, admin/concierge, or
  assigned doctor **with active consent**); `canViewDocument(userId, docId)`
  (owner, admin, or active grant tied to a still-valid consent).

## Seeding

`scripts/seed.ts` writes `role`, `permission`, and `role_permission` from the
single source of truth `ROLE_PERMISSIONS` in `lib/rbac.ts`, then creates demo
users and assigns roles.

## Tests

`test/rbac.test.ts` asserts: patient cannot approve providers or access admin;
patient can apply/case/upload/consent/book/pay; super admin wildcard; compliance
can approve but not book; doctor can confirm but not approve.
