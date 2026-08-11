// Custom entry point (package.json "main") instead of the default
// "expo-router/entry" directly. Its one job: kick off warming the
// secure-storage buffer (src/lib/secure-storage.ts) via the *async*
// SecureStore API as early as possible, in TRUE parallel with everything
// else — never gating `require("expo-router/entry")` on it.
//
// An earlier version of this file *awaited* the warm-up before requiring
// expo-router/entry, reasoning that @better-auth/expo's expoClient() plugin
// reads the buffer synchronously at createAuthClient()-time, so the buffer
// had to be warm first. That reasoning was correct about the read being
// synchronous, but wrong about the fix: safeSecureStore.getItem() is a
// plain in-memory Map read (see secure-storage.ts) — it cannot crash
// whether the buffer is warm or empty, empty just means "nothing restored
// yet". Deferring the require() behind an async native-bridge round trip
// delayed expo-router's renderRootComponent()/AppRegistry.registerComponent()
// call by an unpredictable amount — exactly the kind of non-standard,
// device-dependent timing risk that crashed real devices immediately on
// launch (never caught by typecheck/lint/vitest/expo-doctor, since none of
// them actually boot the app). Registering the root must happen
// synchronously, at the same tick native expects it.
//
// Importing secure-warm here starts the async warm-up immediately (its
// module body runs on import) WITHOUT awaiting it — root registration below
// stays synchronous. The boot gate (app/index.tsx) awaits the exported
// `secureStoreWarmed` promise before calling authClient.getSession(), so the
// session cookie is guaranteed to be in the buffer before the first
// authenticated request — closing the cold-start "dropped to sign-in" race.
import "./src/lib/secure-warm"

require("expo-router/entry")
