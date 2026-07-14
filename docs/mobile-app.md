# Med Aura Mobile

Two mobile deliverables exist in this repo. **The native app is the product**;
the Capacitor shell is a legacy stopgap kept only while the native app matures.

## 1. Native app — `apps/mobile` (the real one)

Expo SDK 57 / React Native 0.86 / TypeScript / Expo Router. Fully native
screens — no WebView anywhere in the core journey:

- **Boot flow**: branded splash → onboarding (first run only) → session
  restore from the device keychain → route by state. No login flash, no
  white screen.
- **Onboarding**: 4 swipeable native slides (Next/Back/Skip, animated page
  dots, haptics, RTL).
- **Auth**: native sign-in + sign-up (patient/doctor choice, phone, country,
  terms). Sessions via Better Auth's Expo plugin — stored in
  Keychain/Keystore (`expo-secure-store`), never plain storage.
- **Patient tabs**: Home (welcome, quick actions, next appointment,
  featured doctors), Explore (search + doctor list), Appointments
  (upcoming/past), Account (language, policies, native sign-out sheet).
- **Doctor profile screen** with stats, bio, procedures, sticky booking CTA
  (booking currently completes on the secure web flow — native booking is
  the next milestone).
- **Design**: brand tokens in `src/theme` (deep purple #4A1D96, cream
  #FFFCF7, gold #C9A24B), reanimated press/entrance micro-interactions,
  skeleton loading, human Arabic/English copy (`src/lib/i18n.tsx`), real RTL.

### Backend for the app

`app/api/mobile/v1/*` (me, home, doctors, doctors/[slug], appointments,
signup-profile) — thin JSON wrappers over the same session/RBAC/data layer
the web uses (`lib/mobile-api.ts`). `lib/auth.ts` runs the Better Auth
`expo()` plugin and trusts the `medaura://` scheme.

### Running / building

- Dev: `cd apps/mobile && npm install && npx expo start` (point
  `EXPO_PUBLIC_API_URL` at a LAN dev server if not using production).
- **APK**: the **Native App Android** workflow builds `assembleRelease`
  and publishes it to the fixed `apk-latest` release — the same URL the
  site footer links. Native folders are generated on the runner
  (`expo prebuild`) and never committed.
- iOS: same codebase; `npx expo prebuild -p ios` on a Mac with Xcode.

### Signing (read before store release)

Release APKs are signed with `apps/mobile/signing/medaura-dist.p12` via
`scripts/apply-release-signing.mjs` (post-prebuild). This keystore is
**deliberately committed** so every CI build carries the SAME signature —
rotating debug keys were why phones refused to install/update the APK.
Because the repo is public, treat it strictly as a **testing-distribution
key**: before publishing to Google Play, generate a private keystore
(kept in Actions secrets, never committed) and enroll in Play App
Signing. Installing on a device: enable "install from unknown sources"
for the browser, and uninstall any previously installed Med Aura build
once (older builds carry a different signature).

### Install troubleshooting

- "App not installed / cannot install": uninstall any previous Med Aura
  app first (signature mismatch), then reinstall.
- Download the APK from the footer link (a direct `.apk`). The Actions
  *artifact* downloads as a `.zip` — unzip it first if you use that path.

### Next milestones

Native booking flow (availability → slot → confirm → pay), notifications
(expo-notifications + FCM — needs a Firebase project), files upload
(camera/picker → presigned R2), invoices/payments screens, doctor/staff
experience, deep links, store release signing.

## 2. Legacy Capacitor shell — `android/` + `capacitor.config.ts`

WebView wrapper around the deployed site. Still powers the footer's
apk-latest release link until the native app replaces it. Workflow:
**Android APK** (`.github/workflows/android.yml`). Do not extend it — new
mobile work goes in `apps/mobile`.

## PWA layer (web)

`public/sw.js` + `/offline` + `public/manifest.json` make the website itself
installable with a branded offline fallback. Independent of both apps.
