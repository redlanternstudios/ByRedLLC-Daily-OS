/**
 * One-shot invite script for Deijah Blanks.
 *
 * Usage:
 *   BYRED_OS_SERVICE_ROLE_KEY=<key> npx tsx scripts/invite-deijah.ts
 *
 * Get the service role key from:
 *   Supabase Dashboard → mlmrdkiyxlngmwhdtrln → Settings → API → service_role key
 */
import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = "https://mlmrdkiyxlngmwhdtrln.supabase.co"
const SERVICE_ROLE_KEY = process.env.BYRED_OS_SERVICE_ROLE_KEY

if (!SERVICE_ROLE_KEY) {
  console.error("❌  Set BYRED_OS_SERVICE_ROLE_KEY before running this script.")
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const EMAIL = "deijahblanks789@gmail.com"
const REDIRECT_TO = "https://byredlanternos.com/auth/callback"

async function main() {
  console.log(`Sending invite to ${EMAIL}…`)

  const { data, error } = await admin.auth.admin.inviteUserByEmail(EMAIL, {
    redirectTo: REDIRECT_TO,
  })

  if (error) {
    console.error("❌  Invite failed:", error.message)
    process.exit(1)
  }

  console.log("✅  Invite sent. Auth user id:", data.user.id)
  console.log("    Deijah will receive a magic link at", EMAIL)
  console.log("    On click → /auth/callback → byred_users row auto-linked → she's in.")
}

main()
