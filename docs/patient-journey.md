# Patient Journey (implemented slice)

1. **Sign up** → a `patient` account + `patient_profile` are provisioned; a
   `patient` role is assigned. (`/sign-up`)
2. **Search** approved doctors by procedure/category/country/consultation type.
   (`/search`)
3. **Doctor profile** with verification panel and booking CTAs.
   (`/doctors/[slug]`)
4. **Create a case** (wizard) for a procedure (e.g. rhinoplasty), optionally tied
   to the chosen doctor. (`/dashboard/cases/new`)
5. **Upload** private photos/reports to the case (R2). (`/dashboard/cases/[id]`)
6. **Grant consent** so the doctor can view the case + its files; revocable.
7. **Book** a consultation slot and **pay** the fee (Stripe test mode).
   (`/doctors/[slug]/book`)
8. **Confirmation** via webhook → appointment `CONFIRMED`, case
   `CONSULTATION_BOOKED`; appears in `/dashboard/appointments` and the doctor's
   dashboard.

Case status lifecycle (enum `case_status`) continues beyond this slice:
consultation completed → treatment plan → quote → deposit → medical approval →
procedure → follow-up → review. Those screens are the next phase
(see [known-limitations.md](known-limitations.md)).
