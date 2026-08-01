// Custom entry point (package.json "main") instead of the default
// "expo-router/entry" directly. This exists for exactly one reason: to
// pre-warm the secure-storage buffer (src/lib/secure-storage.ts) via the
// *async* SecureStore API before src/lib/auth-client.ts is ever imported.
//
// @better-auth/expo's expoClient() plugin calls storage.getItem()
// *synchronously* the moment createAuthClient() runs, at module-evaluation
// time. expo-secure-store's sync getItem is a native crash vector on
// Android when a Keystore key can't be read (invalidated by a biometric/PIN
// change, an OS update, a corrupted entry) — the crash happens before any
// JS try/catch can run. That was the "close the app after signing in, then
// it won't reopen — have to uninstall and reinstall" crash: the very next
// sync read of the session data written on first login could crash natively
// on the second launch.
//
// The fix (see secure-storage.ts) never calls the sync API — it's an
// in-memory buffer, and this file populates it via getItemAsync (which
// safely rejects instead of crashing) BEFORE requiring expo-router's real
// entry, which is what first imports auth-client.ts. The native splash
// screen is already covering the screen at this point (shown by the OS
// immediately at launch, independent of JS), so this adds a few
// milliseconds under the splash, never a visible delay or blank frame.
import { warmSecureStore } from "./src/lib/secure-storage"
import { AUTH_STORAGE_PREFIX } from "./src/lib/config"

const KEYS = [`${AUTH_STORAGE_PREFIX}_cookie`, `${AUTH_STORAGE_PREFIX}_session_data`]

warmSecureStore(KEYS)
  .catch(() => undefined)
  .then(() => {
    require("expo-router/entry")
  })
