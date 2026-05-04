"use client"

import { useState } from "react"
import useSWR, { mutate as globalMutate } from "swr"
import {
  Radio, RefreshCw, Clock, Users, AlertTriangle,
  CheckCircle2, ChevronDown, ChevronUp, Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

// ─── Types ────────────────────────────────────────────────────────────────────

type TeamMemberSummary = {
  name: string
  role: string
  taskCount: number
  status: "ON TRACK" | "AT RISK" | "BLOCKED"
}

type PulseSummary = {
  text: string
  time_of_day: string
  task_count: number
  blocker_count: number
  generated_at: string
  generated_by: "cron" | "manual"
  team: TeamMemberSummary[]
}

type PulseRecord = {
  id: string
  date: string
  summary: PulseSummary
  created_at: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00") // noon local to avoid DST edge
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  if (d.toDateString() === today.toDateString()) return "Today"
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday"
  return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit", hour12: true, timeZone: "America/Los_Angeles",
  }) + " PST"
}

function StatusPip({ status }: { status: TeamMemberSummary["status"] }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border",
      status === "BLOCKED"  && "bg-red-950 text-red-300 border-red-800",
      status === "AT RISK"  && "bg-yellow-950 text-yellow-300 border-yellow-800",
      status === "ON TRACK" && "bg-green-950 text-green-300 border-green-800",
    )}>
      {status === "BLOCKED"  && <AlertTriangle className="w-2.5 h-2.5" strokeWidth={2} />}
      {status === "AT RISK"  && <Clock className="w-2.5 h-2.5" strokeWidth={2} />}
      {status === "ON TRACK" && <CheckCircle2 className="w-2.5 h-2.5" strokeWidth={2} />}
      {status}
    </span>
  )
}

// ─── Pulse Card ───────────────────────────────────────────────────────────────

function PulseCard({ pulse }: { pulse: PulseRecord }) {
  const [expanded, setExpanded] = useState(false)
  const s = pulse.summary
  const blocked = s.team.filter((m) => m.status === "BLOCKED")
  const atRisk  = s.team.filter((m) => m.status === "AT RISK")

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-zinc-800/60">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Radio className="w-3.5 h-3.5 text-[#D7261E] shrink-0" strokeWidth={1.75} />
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest">
            {s.time_of_day}
          </span>
          <span className="text-zinc-700 text-[11px]">·</span>
          <span className="text-[11px] text-zinc-500">{formatTime(s.generated_at)}</span>
          {s.generated_by === "manual" && (
            <span className="text-[10px] text-zinc-600 bg-zinc-800 border border-zinc-700 px-1.5 py-0.5 rounded">
              Manual
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1 text-[11px] text-zinc-500">
            <Users className="w-3 h-3" strokeWidth={1.75} />
            {s.team.length}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-zinc-500">
            <CheckCircle2 className="w-3 h-3" strokeWidth={1.75} />
            {s.task_count} tasks
          </div>
          {s.blocker_count > 0 && (
            <div className="flex items-center gap-1 text-[11px] text-red-400">
              <AlertTriangle className="w-3 h-3" strokeWidth={1.75} />
              {s.blocker_count} {s.blocker_count === 1 ? "blocker" : "blockers"}
            </div>
          )}
        </div>
      </div>

      {/* Pulse text */}
      <div className="px-5 py-4">
        <p className="text-sm text-zinc-300 leading-relaxed">{s.text}</p>
      </div>

      {/* Alert row for blocked/at-risk */}
      {(blocked.length > 0 || atRisk.length > 0) && (
        <div className="px-5 pb-3 flex flex-wrap gap-2">
          {blocked.map((m) => (
            <div key={m.name} className="flex items-center gap-1.5 text-[11px] text-red-400 bg-red-950/30 border border-red-900/40 rounded px-2 py-1">
              <AlertTriangle className="w-3 h-3 shrink-0" strokeWidth={1.75} />
              {m.name}
            </div>
          ))}
          {atRisk.map((m) => (
            <div key={m.name} className="flex items-center gap-1.5 text-[11px] text-yellow-400 bg-yellow-950/30 border border-yellow-900/40 rounded px-2 py-1">
              <Clock className="w-3 h-3 shrink-0" strokeWidth={1.75} />
              {m.name}
            </div>
          ))}
        </div>
      )}

      {/* Expand team roster */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-2.5 border-t border-zinc-800/60 text-[11px] text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/30 transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <Users className="w-3 h-3" strokeWidth={1.75} />
          Team roster
        </span>
        {expanded
          ? <ChevronUp className="w-3.5 h-3.5" strokeWidth={2} />
          : <ChevronDown className="w-3.5 h-3.5" strokeWidth={2} />
        }
      </button>

      {expanded && (
        <div className="border-t border-zinc-800/60 divide-y divide-zinc-800/40">
          {s.team.map((m) => (
            <div key={m.name} className="flex items-center justify-between px-5 py-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-6 h-6 rounded-full bg-[#D7261E] flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                  {m.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] font-medium text-zinc-200 truncate">{m.name}</p>
                  {m.role && <p className="text-[10px] text-zinc-600 uppercase tracking-wide">{m.role}</p>}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-[11px] text-zinc-500">{m.taskCount} task{m.taskCount !== 1 ? "s" : ""}</span>
                <StatusPip status={m.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ onGenerate, generating }: { onGenerate: () => void; generating: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-14 h-14 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center mb-4">
        <Radio className="w-6 h-6 text-zinc-500" strokeWidth={1.5} />
      </div>
      <p className="text-base font-semibold text-white mb-1">No pulse yet</p>
      <p className="text-sm text-zinc-500 max-w-xs mb-6">
        The cron runs at 7am and 7pm PST. Generate one now to see the current team status.
      </p>
      <button
        type="button"
        onClick={onGenerate}
        disabled={generating}
        className="flex items-center gap-2 px-4 py-2 bg-[#D7261E] hover:bg-red-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
      >
        {generating
          ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />
          : <RefreshCw className="w-4 h-4" strokeWidth={2} />
        }
        {generating ? "Generating…" : "Generate Now"}
      </button>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TeamPulsePage() {
  const { data, isLoading } = useSWR<{ pulses: PulseRecord[] }>("/api/os/team-pulse", fetcher)
  const [generating, setGenerating] = useState(false)

  const pulses = data?.pulses ?? []

  // Group pulses by date
  const grouped = pulses.reduce<Record<string, PulseRecord[]>>((acc, p) => {
    const key = p.date
    if (!acc[key]) acc[key] = []
    acc[key].push(p)
    return acc
  }, {})

  async function handleGenerate() {
    setGenerating(true)
    try {
      const res = await fetch("/api/os/team-pulse", { method: "POST" })
      if (!res.ok) {
        const { error } = await res.json()
        toast.error(error ?? "Failed to generate pulse")
        return
      }
      await globalMutate("/api/os/team-pulse")
      toast.success("Team pulse generated")
    } catch {
      toast.error("Failed to generate pulse")
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white font-condensed flex items-center gap-2">
            <Radio className="w-5 h-5 text-[#D7261E]" strokeWidth={1.75} />
            Team Pulse
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            AI-generated team status — runs at 7am and 7pm PST. Last 7 days shown.
          </p>
        </div>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-2 px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 border border-zinc-700 text-zinc-200 text-sm font-medium rounded-lg transition-colors"
        >
          {generating
            ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />
            : <RefreshCw className="w-4 h-4" strokeWidth={2} />
          }
          {generating ? "Generating…" : "Generate Now"}
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 text-zinc-600 animate-spin" strokeWidth={1.75} />
        </div>
      ) : pulses.length === 0 ? (
        <EmptyState onGenerate={handleGenerate} generating={generating} />
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped)
            .sort(([a], [b]) => b.localeCompare(a)) // newest date first
            .map(([date, dayPulses]) => (
              <div key={date}>
                <p className="text-[11px] font-semibold text-zinc-600 uppercase tracking-widest mb-3">
                  {formatDate(date)}
                </p>
                <div className="space-y-3">
                  {dayPulses.map((pulse) => (
                    <PulseCard key={pulse.id} pulse={pulse} />
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
