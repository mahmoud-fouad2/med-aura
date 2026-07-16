# Med Aura Mobile

The native app lives in `apps/mobile`. Expo SDK 57 / React Native 0.86 /
TypeScript / Expo Router — fully native screens, no WebView anywhere in the
core journey.

> A Capacitor WebView shell existed briefly as a stopgap. It was removed once
> the native app took over the download link; nothing depends on it. It stays
> recoverable in git history if it's ever needed for comparison.

## What the app does

- **Boot flow**: branded splash → onboarding (first run only) → session
  restore from the device keychain → route by state. No login flash, no
  white screen.
- **Onboarding**: 4 swipeable slides, each led by a brand illustration
  (Next/Back/Skip, animated page dots, haptics, correct in both directions).
- **Auth**: native sign-in + sign-up (patient/doctor choice, phone, country,
  terms). Sessions via Better Auth's Expo plugin — stored in
  Keychain/Keystore (`expo-secure-store`), never plain storage.
- **Patient tabs**: Home (hero, quick actions, next appointment, featured
  doctors), Explore (search + doctor list), Appointments (upcoming/past),
  Account.
- **Booking**: consultation type → day → slot → confirm, backed by the same
  `bookConsultation` action the web uses (double-booking rejected server-side);
  payment hands off to the secure page when Stripe is configured.
- **Settings**: account, language & appearance, notification preferences,
  security, support & info — on a native bottom sheet.
- **App lock**: optional biometric unlock (fingerprint/face, device PIN as
  the OS fallback). Enabling and disabling both require a successful
  authentication; the app re-locks when backgrounded; sign-out clears it.
- **Design**: brand tokens in `src/theme`, illustrations for every empty and
  error state, Arabic-first with real RTL and a full ar/en dictionary.

## Assets

`pnpm app:assets` (root) regenerates everything the app ships from
`assets/logo.png` via `scripts/generate-app-assets.ts`: the transparent and
white-knockout logo, 4 onboarding illustrations, splash/auth/home
backgrounds, 6 empty/status illustrations, the avatar fallback, and the app
icon + adaptive foreground.

Everything is bundled in-repo — no CDN, no hotlink. Illustrations are
abstract and faceless by rule: **real doctor photos only ever come from the
database**, and a doctor with no photo gets an initials avatar.

## Backend

`app/api/mobile/v1/*` (me, home, doctors, doctors/[slug],
doctors/[slug]/slots, appointments, bookings, signup-profile) — thin JSON
wrappers over the same session/RBAC/data layer the web uses
(`lib/mobile-api.ts`). `lib/auth.ts` runs the Better Auth `expo()` plugin and
trusts the `medaura://` scheme.

## Running / building

- Dev: `cd apps/mobile && npm install && npx expo start` (point
  `EXPO_PUBLIC_API_URL` at a LAN dev server if not using production).
- **APK**: the **Native App Android** workflow builds `assembleRelease` and
  publishes it to the fixed `apk-latest` release — the same URL the site
  footer links. Native folders are generated on the runner (`expo prebuild`)
  and never committed.
- iOS: same codebase; `npx expo prebuild -p ios` on a Mac with Xcode.

## Signing (read before store release)

Release APKs are signed with `apps/mobile/signing/medaura-dist.p12` via
`scripts/apply-release-signing.mjs` (post-prebuild). This keystore is
**deliberately committed** so every CI build carries the SAME signature —
rotating debug keys were why phones refused to install/update the APK.
Because the repo is public, treat it strictly as a **testing-distribution
key**: before publishing to Google Play, generate a private keystore (kept in
Actions secrets, never committed) and enroll in Play App Signing.

## Install troubleshooting

- "App not installed / cannot install": uninstall any previous Med Aura build
  first (signature mismatch), then reinstall.
- Download from the footer link (a direct `.apk`). The Actions *artifact*
  downloads as a `.zip` — unzip it first if you use that path.

## Not built yet

- **iOS build** — needs a Mac; never claimed as passing from this environment.
- **Push notifications** — the settings toggles persist the preference, but
  delivery needs `expo-notifications` + a Firebase project (FCM) and a sender
  in `lib/notifications`.
- **Native profile editing / password change** — currently open the secure
  web page.
- **Files, invoices, provider (doctor/staff) experience** — web only so far.

## PWA layer (website, separate from the app)

`public/sw.js` + `/offline` + `public/manifest.json` make the website itself
installable with a branded offline fallback. Independent of the native app.
