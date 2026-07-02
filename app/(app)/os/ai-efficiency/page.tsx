"use client"

import { useState, useEffect } from "react"
import { AlertTriangle, Brain, CheckCircle2, Gauge, TrendingDown, ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"

type ProviderStatus = {
  id: string
  label: string
  role: string
  lane: string
  configured: boolean
  model: string
  mutationAllowed: boolean
  strengths: string[]
  failureMode: string
  verificationRule: string
}

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

type RunsSummary = {
  total_runs: number
  successful_runs: number
  failed_runs: number
  estimated_codex_tokens_saved: number
  estimated_codex_minutes_saved: number
  verified_codex_tokens_saved: number
  verified_codex_minutes_saved: number
  team_handoffs: number
  pending_verification: number
  by_provider: Record<string, { runs: number; saved_tokens: number; failures: number }>
}

function BoardCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string
  value: number | string
  detail: string
  icon: React.ComponentType<any>
}) {
  return (
    <div className="rounded-lg border border-white/[0.08] bg-[#111318] p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-1">
          <Icon className="h-4 w-4 text-[#D7261E] shrink-0" strokeWidth={1.75} />
          <p className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wide">{label}</p>
        </div>
      </div>
      <p className="text-2xl font-extrabold text-white mb-2">{value}</p>
      <p className="text-xs text-[#6B7280]">{detail}</p>
    </div>
  )
}

export default function AIEfficiencyPage() {
  const [providers, setProviders] = useState<ProviderStatus[]>([])
  const [runs, setRuns] = useState<ProviderRun[]>([])
  const [summary, setSummary] = useState<RunsSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadBoard() {
      try {
        const [providersRes, runsRes] = await Promise.all([
          fetch("/api/os/ai/providers"),
          fetch("/api/os/ai/provider-runs"),
        ])

        if (cancelled) return

        if (providersRes.ok) {
          const data = await providersRes.json()
          setProviders(data.providers ?? [])
        }

        if (runsRes.ok) {
          const data = await runsRes.json()
          setRuns(data.runs ?? [])
          setSummary(data.summary ?? null)
        }
      } catch (err) {
        console.error("[v0] Failed to load AI efficiency board:", err)
      } finally {
        setLoading(false)
      }
    }

    loadBoard()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-7 py-5 border-b border-white/[0.07] shrink-0">
        <Gauge className="w-5 h-5 text-[#D7261E]" strokeWidth={1.75} />
        <div>
          <h1 className="text-xl font-extrabold text-zinc-50 tracking-tight leading-none mb-0.5">
            AI Efficiency Board
          </h1>
          <p className="text-[11px] text-[#6B7280]">Provider optimization & cost tracking</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-7 py-6 [scrollbar-width:none]">
        <div className="mb-8 max-w-2xl">
          <h2 className="text-lg font-extrabold text-white mb-2">Provider Savings</h2>
          <p className="text-xs leading-relaxed text-[#9CA3AF]">
            Tracks where cheaper providers reduce Codex reasoning load, where they fail, and what still needs Codex verification.
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-[#6B7280]">Loading efficiency data…</div>
        ) : (
          <div className="space-y-8">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <BoardCard
                label="Runs"
                value={summary?.total_runs ?? 0}
                detail="Advisor calls logged."
                icon={Brain}
              />
              <BoardCard
                label="Failures"
                value={summary?.failed_runs ?? 0}
                detail="Weaknesses to fix."
                icon={AlertTriangle}
              />
              <BoardCard
                label="Verified Save"
                value={(summary?.verified_codex_tokens_saved ?? 0).toLocaleString()}
                detail="Codex savings backed by proof."
                icon={TrendingDown}
              />
              <BoardCard
                label="Handoffs"
                value={summary?.team_handoffs ?? 0}
                detail="Provider packets shared."
                icon={ShieldCheck}
              />
            </div>

            {/* Provider Status */}
            <div>
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Gauge className="h-4 w-4 text-[#D7261E]" strokeWidth={1.75} />
                Provider Status
              </h3>
              <div className="grid gap-3">
                {providers.length > 0 ? (
                  providers.map((provider) => (
                    <div key={provider.id} className="rounded-lg border border-white/[0.06] bg-[#0D0D0F] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-white">{provider.label}</p>
                          <p className="mt-1 text-[10px] text-[#6B7280]">{provider.model} / {provider.lane}</p>
                          <p className="mt-2 text-[10px] leading-relaxed text-[#9CA3AF] line-clamp-2">{provider.verificationRule}</p>
                        </div>
                        <span className={cn(
                          "rounded-full px-2.5 py-1 text-[9px] font-semibold uppercase whitespace-nowrap shrink-0",
                          provider.configured ? "bg-green-500/10 text-green-300" : "bg-white/[0.06] text-[#6B7280]"
                        )}>
                          {provider.configured ? "Configured" : "Missing"}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-lg border border-white/[0.06] bg-[#0D0D0F] p-4 text-xs text-[#6B7280]">
                    No provider data available
                  </div>
                )}
              </div>
            </div>

            {/* Recent Runs */}
            <div>
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#D7261E]" strokeWidth={1.75} />
                Recent Runs
              </h3>
              <div className="grid gap-3">
                {runs.length > 0 ? (
                  runs.slice(0, 12).map((run) => (
                    <div key={run.id} className="rounded-lg border border-white/[0.06] bg-[#0D0D0F] p-4">
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-white truncate">{run.provider}</p>
                          <p className="text-[10px] text-[#6B7280]">{run.purpose}</p>
                        </div>
                        <span className={cn(
                          "rounded-full px-2 py-1 text-[9px] font-semibold uppercase whitespace-nowrap shrink-0",
                          run.status === "success" ? "bg-green-500/10 text-green-300" :
                          run.status === "failed" ? "bg-red-500/10 text-red-300" :
                          "bg-yellow-500/10 text-yellow-300"
                        )}>
                          {run.status}
                        </span>
                      </div>
                      {run.outcome_summary && (
                        <p className="text-[10px] text-[#9CA3AF] line-clamp-1">{run.outcome_summary}</p>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="rounded-lg border border-white/[0.06] bg-[#0D0D0F] p-4 text-xs text-[#6B7280]">
                    No runs recorded yet
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
