import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { runDeepSeekAdvisor } from "@/lib/ai/deepseek-advisor"
import { runGlmAdvisor } from "@/lib/ai/glm-advisor"
import { getProviderById } from "@/lib/ai/provider-registry"
import { recordProviderRun } from "@/lib/ai/provider-run-ledger"

const advisorSchema = z.object({
  provider: z.enum(["deepseek", "glm"]).default("deepseek"),
  purpose: z.enum(["implementation_plan", "code_review", "bug_hypothesis", "test_plan", "ux_risk"]),
  prompt: z.string().trim().min(20).max(12000),
  context: z.string().trim().max(8000).optional(),
})

type ReceiptRow = {
  summary: string
  lesson: string
  proof_url_or_path: string
  agent_family: string
  framework_scope: string
}

async function getCallerScope() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { supabase, profileId: null, tenantIds: [] as string[] }

  const { data: profileRaw } = await supabase
    .from("byred_users")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle()
  const profileId = (profileRaw as { id: string } | null)?.id ?? null

  if (!profileId) return { supabase, profileId: null, tenantIds: [] as string[] }

  const { data: memberships } = await supabase
    .from("byred_user_tenants")
    .select("tenant_id")
    .eq("user_id", profileId)

  return {
    supabase,
    profileId,
    tenantIds: (memberships ?? []).map((row: { tenant_id: string }) => row.tenant_id),
  }
}

function receiptContext(receipts: ReceiptRow[]) {
  if (receipts.length === 0) return "No verified receipts available."

  return receipts
    .map((receipt) =>
      `${receipt.agent_family}/${receipt.framework_scope}: ${receipt.summary} | Lesson: ${receipt.lesson} | Proof: ${receipt.proof_url_or_path}`
    )
    .join("\n")
}

export async function POST(req: NextRequest) {
  const { supabase, profileId, tenantIds } = await getCallerScope()
  if (!profileId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const parsed = advisorSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { data: receiptRows, error: receiptError } = await supabase
    .from("os_agent_receipts")
    .select("summary, lesson, proof_url_or_path, agent_family, framework_scope")
    .in("tenant_id", tenantIds.length > 0 ? tenantIds : ["__none__"])
    .eq("verification_status", "verified")
    .or("agent_family.eq.web_app,framework_scope.eq.mindset_universal")
    .order("created_at", { ascending: false })
    .limit(8)

  if (receiptError) return NextResponse.json({ error: receiptError.message }, { status: 500 })

  const targetProvider = getProviderById(parsed.data.provider)
  const tenantId = tenantIds[0] ?? null
  const promptChars = parsed.data.prompt.length
  const contextChars = (parsed.data.context ?? "").length

  try {
    const messages = [
      {
        role: "system",
        content: `You are a read-only ByRedLLC AI advisor. You reduce Codex reasoning spend by producing implementation plans, bug hypotheses, test plans, and code-review notes.

Hard rules:
- You cannot mutate files, tasks, databases, GitHub, Vercel, Supabase, email, or browser state.
- You cannot mark work complete.
- You cannot treat unverified observations as truth.
- You can reuse only verified OS receipts and user-provided context.
- Codex must execute, verify, and record receipts.
- Return JSON only with keys: recommendation, reasoning_summary, risks, codex_verification_steps, not_allowed_to_do.`,
      },
      {
        role: "user",
        content: `Purpose: ${parsed.data.purpose}

Verified receipts:
${receiptContext((receiptRows as ReceiptRow[] | null) ?? [])}

User/project context:
${parsed.data.context ?? "No extra context provided."}

Request:
${parsed.data.prompt}`,
      },
    ] as const

    const result = parsed.data.provider === "glm"
      ? await runGlmAdvisor([...messages])
      : await runDeepSeekAdvisor([...messages])

    const parsedContent = JSON.parse(result.content) as unknown
    const run = await recordProviderRun({
      tenantId,
      userId: profileId,
      provider: result.provider,
      model: result.model,
      lane: targetProvider?.lane ?? "code_review",
      purpose: parsed.data.purpose,
      status: "success",
      promptChars,
      contextChars,
      promptTokens: result.usage?.prompt_tokens ?? null,
      completionTokens: result.usage?.completion_tokens ?? null,
      totalTokens: result.usage?.total_tokens ?? null,
      outcomeSummary: `Read-only ${result.provider} advisor completed ${parsed.data.purpose}.`,
      metadata: {
        provider_configured: targetProvider?.configured ?? false,
        receipts_used: receiptRows?.length ?? 0,
      },
    })

    return NextResponse.json({
      provider: result.provider,
      model: result.model,
      mode: "read_only_advisor",
      mutation_allowed: false,
      codex_role: "execute_verify_record_receipts",
      run_id: run?.id ?? null,
      result: parsedContent,
      usage: result.usage,
    })
  } catch (error) {
    await recordProviderRun({
      tenantId,
      userId: profileId,
      provider: parsed.data.provider,
      model: targetProvider?.model ?? parsed.data.provider,
      lane: targetProvider?.lane ?? "code_review",
      purpose: parsed.data.purpose,
      status: "failed",
      promptChars,
      contextChars,
      failureReason: error instanceof Error ? error.message : "AI advisor failed",
      weakness: `${parsed.data.provider} advisor unavailable or returned invalid output.`,
      metadata: {
        provider_configured: targetProvider?.configured ?? false,
        receipts_used: receiptRows?.length ?? 0,
      },
    })

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "AI advisor failed",
        mode: "read_only_advisor",
        mutation_allowed: false,
      },
      { status: 503 }
    )
  }
}
