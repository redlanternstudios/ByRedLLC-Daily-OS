import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"
import type { OsAiProviderRunInsert } from "@/types/database"

type ProviderRunStatus = "success" | "failed" | "blocked" | "rejected" | "verified"

export function estimateCodexSavings(promptChars: number, contextChars: number, totalTokens: number | null) {
  const sourceTokens = Math.ceil((promptChars + contextChars) / 4)
  const advisorTokens = totalTokens ?? 0
  const estimatedCodexTokensSaved = Math.max(sourceTokens + 900 - Math.ceil(advisorTokens * 0.15), 0)
  const estimatedCodexMinutesSaved = Number(Math.min(45, estimatedCodexTokensSaved / 450).toFixed(2))

  return {
    estimatedCodexTokensSaved,
    estimatedCodexMinutesSaved,
  }
}

export async function recordProviderRun(input: {
  tenantId: string | null
  userId: string | null
  provider: OsAiProviderRunInsert["provider"]
  model: string
  lane: string
  purpose: string
  status: ProviderRunStatus
  promptChars: number
  contextChars: number
  promptTokens?: number | null
  completionTokens?: number | null
  totalTokens?: number | null
  outcomeSummary?: string | null
  weakness?: string | null
  failureReason?: string | null
  metadata?: Record<string, unknown>
}) {
  if (!input.tenantId) return null

  const savings = estimateCodexSavings(input.promptChars, input.contextChars, input.totalTokens ?? null)
  const admin = createAdminClient() as any
  const { data, error } = await admin
    .from("os_ai_provider_runs")
    .insert({
      tenant_id: input.tenantId,
      created_by_user_id: input.userId,
      provider: input.provider,
      model: input.model,
      lane: input.lane,
      purpose: input.purpose,
      status: input.status,
      mutation_allowed: false,
      prompt_chars: input.promptChars,
      context_chars: input.contextChars,
      prompt_tokens: input.promptTokens ?? null,
      completion_tokens: input.completionTokens ?? null,
      total_tokens: input.totalTokens ?? null,
      estimated_codex_tokens_saved: savings.estimatedCodexTokensSaved,
      estimated_codex_minutes_saved: savings.estimatedCodexMinutesSaved,
      verification_status: input.status === "success" ? "pending" : "not_required",
      outcome_summary: input.outcomeSummary ?? null,
      weakness: input.weakness ?? null,
      failure_reason: input.failureReason ?? null,
      metadata: input.metadata ?? {},
    })
    .select("*")
    .single()

  if (error) {
    console.error("[provider-run-ledger]", error.message)
    return null
  }

  return data
}
