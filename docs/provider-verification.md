# Provider Verification

## Flow

1. A signed-in patient submits a **doctor application**
   (`/dashboard/provider/apply`) with personal/professional data, selected
   procedures, and license info. Stored in `provider_application` (status
   `SUBMITTED`, payload as JSONB). One open application per applicant.
2. A **compliance reviewer** (or super admin) reviews it at
   `/admin/applications`.
3. **Approve** (`approveApplication`) runs one transaction:
   - create `doctor_profile` (approved, published, verified),
   - store the license encrypted (`doctor_license`, status `VALID`),
   - link selected procedures (`doctor_procedure`),
   - grant the `doctor` role (`user_role`) + set denormalized `user.role`,
   - update the application (`APPROVED`, `resultingDoctorId`),
   - write a `verification_review` row + audit log.
4. **Reject** (`rejectApplication`) requires a reason; records review + audit.

## Application states

`DRAFT · SUBMITTED · UNDER_REVIEW · NEEDS_CHANGES · APPROVED · REJECTED ·
SUSPENDED · EXPIRED`.

## Visibility rule (enforced in `lib/data/doctors.ts`)

A doctor appears publicly only if: `status=approved` **and** `published` **and**
has a `VALID` license with `expiryDate >= today` **and** (no center, or an
`approved` center). Expired-license or unapproved doctors are excluded — covered
by `test/integration/search-visibility.test.ts`.

## Pending

Center onboarding UI, license-expiry automation (hide on expiry + notify), and
reviewer "request changes / suspend / reactivate" actions are next.
