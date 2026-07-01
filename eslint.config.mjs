import nextPlugin from "@next/eslint-plugin-next"
import tseslint from "typescript-eslint"

// Flat config using the Next.js ESLint plugin directly. FlatCompat +
// eslint-config-next crashes under ESLint 9, so we apply the Next plugin's
// recommended + core-web-vitals rule sets and parse TS with typescript-eslint's
// parser (no TS-specific rules enabled — Next correctness rules only).
const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "drizzle/**",
      "public/**",
      "next-env.d.ts",
      "e2e/**",
      "*.config.mjs",
      "*.config.ts",
    ],
  },
  {
    files: ["**/*.{js,jsx,ts,tsx,mjs}"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: { "@next/next": nextPlugin },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
    },
  },
]

export default eslintConfig
