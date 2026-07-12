# Med Aura Mobile App (Android + iOS later)

The native app is a **Capacitor shell** around the deployed platform
(`https://med-aura.onrender.com`). The shell contributes the app identity
(icon, splash, status bar), native behaviors (hardware back button), and a
native offline screen — while every feature (auth, cases, booking, payments,
dashboards) runs from the live deployment, so app users always get the latest
release without store re-submissions.

## Architecture

| Piece | Where | Role |
| --- | --- | --- |
| `capacitor.config.ts` | repo root | App id `com.medaura.app`, remote `server.url`, splash config |
| `android/` | repo root | Generated native project (committed; build outputs ignored) |
| `mobile/www/` | repo root | Tiny native-side shell: loading + offline/error pages |
| `components/mobile/native-bridge.tsx` | web app | Back button, status-bar theming, splash hide — no-op in browsers |
| `components/pwa/sw-registration.tsx` + `public/sw.js` | web app | PWA layer: offline fallback (`/offline`), static-asset caching |
| `scripts/generate-mobile-assets.ts` | repo | Regenerates all launcher icons + splash screens from `assets/logo.png` |
| `.github/workflows/android.yml` | CI | Builds the installable debug APK on every mobile change |

## Getting the APK

No local Android SDK is needed:

1. Open the repo's **Actions → Android APK** workflow (runs automatically on
   mobile-related pushes, or trigger it with **Run workflow**).
2. Download the **med-aura-debug-apk** artifact from the run.
3. Install `app-debug.apk` on any Android device (allow "install from unknown
   sources"). This debug build is for testing/distribution outside the store.

Local builds (optional) need JDK 21 + Android Studio, then:
`pnpm mobile:sync && cd android && ./gradlew assembleDebug`.

## Release / Play Store checklist (not yet done)

1. Create a release keystore (`keytool -genkeypair …`) — keep it out of git;
   store the keystore + passwords as GitHub Actions secrets.
2. Add a `signingConfigs.release` block to `android/app/build.gradle` reading
   those secrets, and a workflow step for `./gradlew bundleRelease` (AAB).
3. Play Console: app listing, privacy policy URL (`/privacy`), data-safety
   form (health data — declare case photos/medical answers), content rating.

## iOS later

Same config and bridge code: `pnpm add -D @capacitor/ios && pnpm exec cap add ios`
(requires a Mac with Xcode for the build/signing; App Store review also
requires the account holder to justify health-data handling).

## Push notifications (future)

The in-app notification inbox already exists. Native push needs:
`@capacitor/push-notifications` + a Firebase project (FCM) + storing device
tokens server-side + a sender in `lib/notifications`. Deliberately deferred —
requires the user's Firebase account.

## Notes

- External origins (e.g. Stripe Checkout) intentionally open in the system
  browser, not inside the shell — payment completes on the web and the site
  reflects it on return (webhook-driven), which is the safest v1 behavior.
- `mobile/www/error.html` is what users see if the app starts fully offline.
- Icons/splash: edit `assets/logo.png`, run `pnpm mobile:assets`, commit.
