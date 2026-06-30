import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getProviderStatusForClient } from "@/lib/ai/provider-registry"

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  return NextResponse.json({
    mode: "optional_complementary_providers",
    dependency_rule: "Core OS task, dashboard, and receipt flows must work without Gemini, DeepSeek, GLM, or Groq configured.",
    authority_rule: "Complementary providers advise only. Codex executes, verifies, and records receipts.",
    providers: getProviderStatusForClient(),
    verified_receipt_rule: "Feature agents can use only verified OS receipts as reusable learning context.",
  })
}
