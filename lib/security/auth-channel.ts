const NATIVE_APP_ORIGIN = "medaura://"

/**
 * Better Auth's Expo client sends both headers for native requests. Native
 * clients cannot run the web reCAPTCHA widget, so they use the auth endpoint's
 * rate limiting while browser requests continue through reCAPTCHA.
 *
 * This distinguishes the supported client channel; it is not device
 * attestation and must not be treated as proof that a device is trustworthy.
 */
export function isExpoNativeAuthRequest(headers: Headers | undefined): boolean {
  return (
    headers?.get("expo-origin") === NATIVE_APP_ORIGIN &&
    headers.get("x-skip-oauth-proxy") === "true"
  )
}
