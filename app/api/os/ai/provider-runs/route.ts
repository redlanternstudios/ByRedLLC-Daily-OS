import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

type ProviderRun = {
  id: string
  created_at: string
  provider: string
  model: string
  lane: string
  purpose: string
  status: string
  estimated_codex_tokens_saved: number
  estimated_codex_minutes_saved: number
  verification_status: string
  outcome_summary: string | null
  weakness: string | null
  failure_reason: string | null
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

export async function GET() {
  const { supabase, profileId, tenantIds } = await getCallerScope()
  if (!profileId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (tenantIds.length === 0) return NextResponse.json({ summary: null, runs: [] })

  const { data, error } = await (supabase as any)
    .from("os_ai_provider_runs")
    .select("id, created_at, provider, model, lane, purpose, status, estimated_codex_tokens_saved, estimated_codex_minutes_saved, verification_status, outcome_summary, weakness, failure_reason")
    .in("tenant_id", tenantIds)
    .order("created_at", { ascending: false })
    .limit(50) as { data: ProviderRun[] | null; error: { message: string } | null }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const runs = data ?? []
  const successful = runs.filter((run) => run.status === "success" || run.status === "verified")
  const failed = runs.filter((run) => run.status === "failed" || run.status === "blocked" || run.status === "rejected")
  const byProvider = runs.reduce<Record<string, { runs: number; saved_tokens: number; failures: number }>>((acc, run) => {
    const current = acc[run.provider] ?? { runs: 0, saved_tokens: 0, failures: 0 }
    current.runs += 1
    current.saved_tokens += run.estimated_codex_tokens_saved
    if (run.status === "failed" || run.status === "blocked" || run.status === "rejected") current.failures += 1
    acc[run.provider] = current
    return acc
  }, {})

  return NextResponse.json({
    summary: {
      total_runs: runs.length,
      successful_runs: successful.length,
      failed_runs: failed.length,
      estimated_codex_tokens_saved: runs.reduce((sum, run) => sum + run.estimated_codex_tokens_saved, 0),
      estimated_codex_minutes_saved: Number(runs.reduce((sum, run) => sum + Number(run.estimated_codex_minutes_saved), 0).toFixed(2)),
      pending_verification: runs.filter((run) => run.verification_status === "pending").length,
      by_provider: byProvider,
    },
    runs,
  })
}
