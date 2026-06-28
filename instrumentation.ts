/**
 * Next.js instrumentation — runs once when the server boots (not at build).
 * We validate core environment variables here so misconfiguration surfaces
 * immediately rather than as confusing runtime failures.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { assertCoreEnv } = await import("@/lib/env")
    assertCoreEnv()
  }
}
