"use client"

import { createAuthClient } from "better-auth/react"
import { inferAdditionalFields, twoFactorClient } from "better-auth/client/plugins"
import type { auth } from "@/lib/auth"

export const authClient = createAuthClient({
  // No onTwoFactorRedirect/twoFactorPage here on purpose — both force a
  // full navigation. auth-form.tsx instead reads signIn.email()'s own
  // response for `twoFactorRedirect`/`twoFactorMethods` directly, the same
  // way it already handles every other sign-in outcome, and swaps in the
  // verification step without leaving the page.
  plugins: [inferAdditionalFields<typeof auth>(), twoFactorClient()],
})

export const { signIn, signUp, signOut, useSession } = authClient
