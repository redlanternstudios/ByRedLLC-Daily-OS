"use client"

import { useState, useEffect, useRef } from "react"
import type { ComponentType } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport, isTextUIPart } from "ai"
import { AlertTriangle, Brain, CheckCircle2, Gauge, Send, ShieldCheck, TrendingDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { MentionTextarea } from "@/components/byred/mention-textarea"
import { useTeamMembers } from "@/lib/hooks/use-team-members"

const SUGGESTIONS = [
  "What are the highest-priority blockers right now?",
  "Summarize open tasks by tenant",
  "What should I focus on today?",
  "Which projects are at risk?",
]

function LanternIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true" className="shrink-0">
      <rect width="32" height="32" rx="6" fill="#D7261E" />
      <path d="M16 5L20 11H12L16 5Z" fill="white" opacity="0.9" />
      <rect x="12" y="11" width="8" height="11" rx="1" fill="white" opacity="0.85" />
      <rect x="14.5" y="22" width="3" height="4" rx="0.75" fill="white" opacity="0.7" />
      <circle cx="16" cy="16.5" r="2.5" fill="#D7261E" opacity="0.6" />
    </svg>
  )
}

const transport = new DefaultChatTransport({ api: "/api/os/lantern-ai" })

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
  value: string | number
  detail: string
  icon: ComponentType<{ className?: string; strokeWidth?: number }>
}) {
  return (
    <div className="rounded-lg border border-white/[0.08] bg-[#111318] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#6B7280]">{label}</p>
        <Icon className="h-4 w-4 text-[#D7261E]" strokeWidth={1.75} />
      </div>
      <p className="text-2xl font-bold leading-none text-white">{value}</p>
      <p className="mt-2 text-[11px] leading-relaxed text-[#9CA3AF]">{detail}</p>
    </div>
  )
}

export default function OSAIPage() {
  const [input, setInput] = useState("")
  const [providers, setProviders] = useState<ProviderStatus[]>([])
  const [runs, setRuns] = useState<ProviderRun[]>([])
  const [summary, setSummary] = useState<RunsSummary | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const teamMembers = useTeamMembers()

  const { messages, sendMessage, status, error } = useChat({ transport })

  const isActive = status === "submitted" || status === "streaming"

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    let cancelled = false

    async function loadBoard() {
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
    }

    loadBoard().catch(() => {
      if (!cancelled) {
        setProviders([])
        setRuns([])
        setSummary(null)
      }
    })

    return () => {
      cancelled = true
    }
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text || isActive) return
    setInput("")
    sendMessage({ text })
  }

  return (
    <div className="grid h-[calc(100vh-52px)] grid-cols-1 overflow-hidden xl:grid-cols-[minmax(0,1fr)_390px]">
      <div className="flex min-h-0 flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-7 py-5 border-b border-white/[0.07] shrink-0">
        <LanternIcon />
        <div>
          <h1 className="text-xl font-extrabold text-zinc-50 tracking-tight leading-none mb-0.5">
            LanternAI
          </h1>
          <p className="text-[11px] text-[#6B7280]">Your intelligent operations assistant</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-7 py-5 min-h-0 [scrollbar-width:none]">
        {messages.length === 0 && (
          <div className="text-center pt-[15vh]">
            <div className="flex justify-center mb-4">
              <LanternIcon />
            </div>
            <p className="text-base font-bold text-zinc-50 mb-2">How can I help you today?</p>
            <p className="text-xs text-[#6B7280] max-w-sm mx-auto">
              Ask me about your tasks, projects, blockers, or anything about your business operations.
            </p>
            <div className="flex gap-2 justify-center mt-5 flex-wrap">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setInput(s)}
                  className="text-[11px] text-[#9CA3AF] bg-[#111318] border border-white/10 rounded-md px-3 py-1.5 cursor-pointer transition-colors hover:border-red-500/40 hover:text-white"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => {
          const text = m.parts.filter(isTextUIPart).map((p) => p.text).join("")
          const isStreamingThis =
            isActive && m.role === "assistant" && m.id === messages[messages.length - 1]?.id

          return (
            <div
              key={m.id}
              className={cn(
                "flex mb-3",
                m.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[70%] px-3.5 py-2.5 text-[13px] text-zinc-50 leading-relaxed whitespace-pre-wrap",
                  m.role === "user"
                    ? "bg-red-600 rounded-xl rounded-br-sm"
                    : "bg-[#111318] border border-white/[0.07] rounded-xl rounded-bl-sm"
                )}
              >
                {text}
                {isStreamingThis && (
                  <span className="inline-block w-[3px] h-3.5 ml-0.5 bg-zinc-500 align-middle animate-pulse" />
                )}
              </div>
            </div>
          )
        })}

        {isActive && messages[messages.length - 1]?.role === "user" && (
          <div className="flex justify-start mb-3">
            <div className="px-3.5 py-2.5 bg-[#111318] border border-white/[0.07] rounded-xl rounded-bl-sm text-xs text-[#6B7280]">
              Thinking…
            </div>
          </div>
        )}

        {error && (
          <div className="text-center py-2 text-xs text-red-500">
            Something went wrong. Try again.
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-7 pb-5 pt-3 border-t border-white/[0.07] shrink-0">
        <form
          onSubmit={handleSubmit}
          className="flex gap-2 items-center bg-[#111318] border border-white/10 rounded-lg px-3.5 py-2"
        >
          <MentionTextarea
            placeholder="Ask LanternAI anything… (@name to mention)"
            value={input}
            onChange={setInput}
            users={teamMembers}
            onSubmit={() => { const text = input.trim(); if (!text || isActive) return; setInput(""); sendMessage({ text }) }}
            disabled={isActive}
            className="flex-1 text-zinc-50 text-[13px] placeholder-zinc-600 disabled:opacity-50 min-h-[20px] max-h-[120px]"
            autoResize
            maxHeight={120}
          />
          <button
            type="submit"
            title="Send message"
            disabled={isActive || !input.trim()}
            className={cn(
              "w-[30px] h-[30px] inline-flex items-center justify-center rounded-[5px] border-none shrink-0 transition-colors",
              isActive || !input.trim()
                ? "bg-white/[0.06] cursor-not-allowed text-[#6B7280]"
                : "bg-red-600 cursor-pointer text-white hover:bg-red-500"
            )}
          >
            <Send size={13} strokeWidth={2} />
          </button>
        </form>
      </div>
      </div>

      <aside className="hidden min-h-0 overflow-y-auto border-l border-white/[0.07] bg-[#09090B] p-5 xl:block">
        <div className="mb-5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#D7261E]">AI Efficiency Board</p>
          <h2 className="mt-1 text-lg font-extrabold tracking-tight text-white">Provider Savings</h2>
          <p className="mt-2 text-xs leading-relaxed text-[#9CA3AF]">
            Tracks where cheaper providers reduce Codex reasoning load, where they fail, and what still needs Codex verification.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
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
            label="Tokens Saved"
            value={(summary?.estimated_codex_tokens_saved ?? 0).toLocaleString()}
            detail="Estimated Codex reasoning avoided."
            icon={TrendingDown}
          />
          <BoardCard
            label="Pending"
            value={summary?.pending_verification ?? 0}
            detail="Need Codex proof."
            icon={ShieldCheck}
          />
        </div>

        <div className="mt-5 rounded-lg border border-white/[0.08] bg-[#111318] p-4">
          <div className="mb-3 flex items-center gap-2">
            <Gauge className="h-4 w-4 text-[#D7261E]" strokeWidth={1.75} />
            <h3 className="text-sm font-bold text-white">Provider Status</h3>
          </div>
          <div className="space-y-2">
            {providers.map((provider) => (
              <div key={provider.id} className="rounded-md border border-white/[0.06] bg-[#0D0D0F] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-white">{provider.label}</p>
                    <p className="mt-1 truncate text-[10px] text-[#6B7280]">{provider.model} / {provider.lane}</p>
                  </div>
                  <span className={cn(
                    "rounded-full px-2 py-1 text-[9px] font-semibold uppercase",
                    provider.configured ? "bg-green-500/10 text-green-300" : "bg-white/[0.06] text-[#6B7280]"
                  )}>
                    {provider.configured ? "Configured" : "Missing"}
                  </span>
                </div>
                <p className="mt-2 text-[10px] leading-relaxed text-[#9CA3AF] line-clamp-2">{provider.verificationRule}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 rounded-lg border border-white/[0.08] bg-[#111318] p-4">
          <div className="mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#D7261E]" strokeWidth={1.75} />
            <h3 className="text-sm font-bold text-white">Recent Runs</h3>
          </div>
          <div className="space-y-2">
            {runs.length > 0 ? runs.slice(0, 8).map((run) => (
              <div key={run.id} className="rounded-md border border-white/[0.06] bg-[#0D0D0F] p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold capitalize text-white">{run.provider} / {run.purpose.replaceAll("_", " ")}</p>
                  <span className={cn(
                    "rounded-full px-2 py-1 text-[9px] font-semibold uppercase",
                    run.status === "success" || run.status === "verified" ? "bg-green-500/10 text-green-300" : "bg-red-500/10 text-red-300"
                  )}>
                    {run.status}
                  </span>
                </div>
                <p className="mt-2 text-[10px] text-[#9CA3AF]">
                  Saved ~{run.estimated_codex_tokens_saved.toLocaleString()} Codex tokens / {Number(run.estimated_codex_minutes_saved).toFixed(1)} min
                </p>
                {(run.weakness || run.failure_reason || run.outcome_summary) && (
                  <p className="mt-1 text-[10px] leading-relaxed text-[#6B7280] line-clamp-2">
                    {run.weakness ?? run.failure_reason ?? run.outcome_summary}
                  </p>
                )}
              </div>
            )) : (
              <p className="rounded-md border border-dashed border-white/[0.08] px-3 py-6 text-center text-xs text-[#6B7280]">
                No provider runs logged yet.
              </p>
            )}
          </div>
        </div>
      </aside>
    </div>
  )
}
