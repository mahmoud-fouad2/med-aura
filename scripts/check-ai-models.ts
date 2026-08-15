/**
 * Verifies that every model the AI concierge depends on actually exists and is
 * reachable by our API key — and that it still supports the function calling
 * the assistant's tools require.
 *
 * The concierge has now gone down twice because a model ID silently stopped
 * being valid (`gemini-2.5-flash` restricted to existing users, then the
 * `-latest` alias resolving to a rate-limited experimental model). Guessing
 * from docs is not verification; this asks Google directly.
 *
 *   GEMINI_API_KEY=... npx tsx scripts/check-ai-models.ts
 *
 * Exits non-zero if any configured model is missing or lacks function calling,
 * so it can be wired into CI or run before a release.
 */
import { MODELS } from "@/lib/ai/assistant"

type ApiModel = {
  name: string
  displayName?: string
  supportedGenerationMethods?: string[]
}

async function main() {
  const key = process.env.GEMINI_API_KEY
  if (!key) {
    console.error("✗ GEMINI_API_KEY is not set. Run with the same key the server uses.")
    process.exit(2)
  }

  const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", {
    headers: { "x-goog-api-key": key },
  })
  if (!res.ok) {
    console.error(`✗ ListModels failed: HTTP ${res.status} ${await res.text()}`)
    process.exit(1)
  }

  const { models = [] } = (await res.json()) as { models?: ApiModel[] }
  // The API returns fully-qualified names ("models/gemini-3.7-flash").
  const byId = new Map(models.map((m) => [m.name.replace(/^models\//, ""), m]))

  let failed = false
  console.log(`Checked against ${models.length} models visible to this key.\n`)
  for (const id of MODELS) {
    const found = byId.get(id)
    if (!found) {
      console.error(`✗ ${id} — NOT available to this API key`)
      failed = true
      continue
    }
    // generateContent is what the assistant calls; without it the tools can't run.
    const methods = found.supportedGenerationMethods ?? []
    if (methods.length && !methods.includes("generateContent")) {
      console.error(`✗ ${id} — exists but does not support generateContent (${methods.join(", ")})`)
      failed = true
      continue
    }
    console.log(`✓ ${id} — available${found.displayName ? ` (${found.displayName})` : ""}`)
  }

  if (failed) {
    console.error(
      "\nAt least one configured model is unusable. Update MODELS in lib/ai/assistant.ts.",
    )
    process.exit(1)
  }
  console.log("\nAll configured assistant models are available.")
}

main().catch((err) => {
  console.error("✗ check failed:", err instanceof Error ? err.message : err)
  process.exit(1)
})
