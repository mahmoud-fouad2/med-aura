# Privacy (engineering)

Patient-facing policy lives at `/privacy`. This note covers the engineering
posture.

## Data minimization

- `patient_profile` holds demographics/preferences only. Medical details are
  collected per **case**, when needed — not up front.
- Doctors never get blanket access to all patients' files; access is per-case,
  per-document, and consent-bound.

## Consent

- `consent` (case-level, revocable, optionally time-bound) + `document_access_grant`
  (per document). Revocation is immediate for future reads.
- Before/after publication will require a separate, explicit consent (future
  module).

## Access logging

Every medical-document view/download and consent change is written to
`audit_log`.

## Subject rights

Data export and account deletion are product requirements; the audit log and
soft-delete (`deletedAt`) support them. The user-facing export/delete flows are a
pending module.

## Retention

Define retention windows per data class (cases, documents, audit) before launch;
medical/audit data typically has regulatory minimums.
