# File Access (private medical documents)

## Principles (sections 17–18)

- Medical files are **always private**. Reads use short-lived signed URLs —
  never a public R2 URL.
- Upload requires authentication **and** case ownership.
- A doctor sees a patient's files only via an **active consent + per-document
  access grant**. Revoking blocks future reads immediately.
- Every view/download is written to the audit log.

## Upload flow

1. `POST /api/uploads/presign` — auth + case-ownership + MIME/size validation;
   creates a `medical_document` (`finalized=false`) with a namespaced object key;
   returns a presigned PUT URL. If R2 is unconfigured → `503` (honest).
2. Browser `PUT`s the file directly to R2.
3. `POST /api/uploads/finalize` — confirms the object exists in storage, marks
   `finalized=true`, audits `medical_document.upload`.

## Read flow

`GET /api/documents/[id]` — `canViewDocument` check → signed read URL (300s) →
redirect; audits `medical_document.view`.

## Consent

`grantCaseConsent` creates a `GRANTED` consent for the case's doctor and a
`document_access_grant` per finalized document. `revokeCaseConsent` sets the
consent to `REVOKED` and stamps `revokedAt` on grants — `canViewDocument` then
returns false.

## Validation

`lib/uploads.ts`: allowlist `image/jpeg|png|webp|heic`, `application/pdf`; max
15 MB; non-empty. Enforced both client-side (UX) and server-side (authority).
