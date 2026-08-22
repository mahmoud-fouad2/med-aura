import { defineConfig } from "vitest/config"
import { fileURLToPath } from "node:url"

export default defineConfig({
  // Keep Vite from walking up to the web app's PostCSS config. Mobile CI
  // installs only apps/mobile dependencies, so web-only Tailwind plugins are
  // intentionally unavailable there.
  css: {
    postcss: { plugins: [] },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
})
