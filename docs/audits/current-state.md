# Med Aura — Current State Audit (Phase 0)

_Date: 2026-06-28 · Auditor: Product Engineering build-out_

This audit reflects the repository **as found**, before the build-out. Findings
were verified by reading every source file — not assumed.

## 1. Stack (verified from `package.json`)

| Area | Library | Notes |
|------|---------|-------|
| Framework | Next.js 16.2.6 (App Router) | React 19 |
| Language | TypeScript 5.7.3 | `strict: true` in tsconfig |
| Styling | Tailwind v4 + shadcn (`base-nova`) | OKLCH theme in `globals.css` |
| Auth | better-auth ^1.6.22 | email+password only |
| DB | drizzle-orm ^0.45.2 + `pg` | node-postgres pool |
| Storage | `@aws-sdk/client-s3` + presigner | R2 helper present |
| Analytics | `@vercel/analytics` | prod only |

## 2. What actually exists

- **Pages**: `/` (landing), `/sign-in`, `/sign-up`. Nothing else.
- **API**: only `app/api/auth/[...all]/route.ts` (better-auth handler).
- **DB schema** (`lib/db/schema.ts`): `user`, `session`, `account`,
  `verification` (auth) + `center`, `doctor`, `treatment`, `inquiry`, `review`
  (domain stubs).
- **Components**: landing sections, site header, user menu, ~13 shadcn UI atoms.
- **Helpers**: `lib/storage/r2.ts`, `lib/security/recaptcha.ts`,
  `lib/session.ts` (role helper), `lib/db/index.ts`.

## 3. Confirmed problems

### Critical
1. **Build ignores TypeScript errors** — `next.config.mjs` had
   `typescript.ignoreBuildErrors: true`. _(Fixed in this pass.)_
2. **Role security hole** — the sign-up form (`components/auth/auth-form.tsx`)
   sends a `role` field and lets the user pick "مريض / مقدّم خدمة". The auth
   config marks `role` as `input: false` (good), but there is **no RBAC** and
   the role is a free-text column defaulting to `patient`. The product requires
   that public signup can _only_ create a PATIENT, and providers must go through
   an application + approval flow. Needs a real fix.
3. **No Drizzle migration setup** — no `drizzle.config.ts`, no `migrations/`,
   no generate/migrate/seed scripts. The schema can never reach a database.
4. **No env validation / no `.env.example`** — `DATABASE_URL`,
   `BETTER_AUTH_SECRET` etc. are read ad-hoc with no startup checks.

### High
5. **Fake statistics** — `hero.tsx` hardcodes `+٥٠٠ طبيب`, `+١٢٠ مركز`,
   `٤.٩ من ٥`. Must be removed (no number unless computed from DB).
6. **Non-cosmetic specialties** — `specialties.tsx` lists cardiology,
   orthopedics, ophthalmology, fertility, neurology, pediatrics. Out of scope;
   Med Aura is cosmetic-only.
7. **Stethoscope logo** is used as the brand in 3 files
   (`auth-form`, `site-header`, `cta-footer`). Brand must be the Med Aura "M".
8. **Generic teal/green medical theme** — must become Navy / Royal Purple /
   Lavender / Ivory.
9. **Broken links** — header/footer link to `/doctors`, `/centers`, `/search`,
   `/how-it-works` and footer legal `#` links — none of these routes exist
   (all 404).
10. **`images.unoptimized: true`** — disabled image optimization. _(Fixed.)_
11. **`generator: "v0.app"`** in metadata + `[v0]` log prefixes in helpers.
12. **Arrays for relations** — `doctor.specialties` / `center.specialties` are
    text arrays; impossible to do relational catalog search/filtering.

### Medium
13. No `not-found` / `error` / `loading` boundaries.
14. Dev cookie config sets `sameSite:none; secure:true`, which breaks login on
    plain-HTTP `localhost`.
15. `recaptcha.ts` and `r2.ts` helpers exist but are **not wired** to anything.
16. No i18n system despite Arabic-first + English requirement.
17. No tests, no CI, no security headers.

## 4. Environment constraints (this machine)

- `node_modules` **not installed** (being installed during build-out).
- **No `DATABASE_URL`**, no `.env`. No local Postgres, Docker, or `psql`.
- Node v24 + corepack available; no global `pnpm`.

**Implication:** all code, migrations, seed, and tests are authored and
type-/build-verified here, but executing the _live_ end-to-end journey (real
Postgres writes, Stripe sandbox webhook) requires the operator to provide
`DATABASE_URL` and test keys. This is tracked in `docs/known-limitations.md`.

## 5. Build/type status at audit time

Could not run `tsc`/`next build` (no `node_modules` yet). Re-run after install;
results recorded in the Phase reports.

## 6. Decisions taken

- **Keep the stack** (Next 16 + Drizzle + better-auth + R2). No rewrite.
- **Payments**: Stripe in test mode behind a provider-agnostic adapter
  (`lib/payments/*`) so another PSP (Tap/Moyasar/HyperPay) can be added later.
- **Approach**: foundation first (schema, migrations, auth/RBAC, brand, i18n),
  then one real vertical slice end-to-end before broadening to all screens.
