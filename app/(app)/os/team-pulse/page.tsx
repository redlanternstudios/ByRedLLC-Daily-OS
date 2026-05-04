"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Users, AlertTriangle, RefreshCw, Copy, Check,
  Sun, Moon, Activity, ChevronDown, ChevronUp,
  Clock, CheckSquare, TrendingUp,
} from "lucide-react"
import { OSAvatar } from "@/components/byred/os/os-avatar"
import { OSStatusBadge } from "@/components/byred/os/os-badge"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import Link from "next/link"
import type { Task } from "@/types/db"

// ─── Types ────────────────────────────────────────────────────────────────────

type TeamMember = {
  id: string
  name: string
  role: string
  avatar_url: string | null
  taskCount: number
  tasks: Task[]
  status: "on_track" | "at_risk" | "blocked"
}

type StoredPulse = {
  id: string
  date: string
  created_at: string
  summary: {
    text: string
    time_of_day: string
    task_count: number
    blocker_count: number
    generated_at: string
    generated_by: string
    team: { name: string; role: string; taskCount: number; status: string }[]
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
}

function statusDot(status: string) {
  if (status === "on_track" || status === "ON TRACK") return "bg-green-400"
  if (status === "at_risk" || status === "AT RISK") return "bg-yellow-400"
  return "bg-red-400"
}

function statusLabel(status: string) {
  return status.replace(/_/g, " ").toUpperCase()
}

// ─── Member Row ───────────────────────────────────────────────────────────────

function MemberRow({ member }: { member: TeamMember }) {
  const [expanded, setExpanded] = useState(false)
  const blockerTasks = member.tasks.filter((t) => t.blocker_flag)
  const criticalTasks = member.tasks.filter((t) => t.priority === "critical" && !t.blocker_flag)

  return (
    <div className="border-b border-zinc-800/60 last:border-0">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors text-left"
      >
        {/* Avatar */}
        <OSAvatar name={member.name} size="md" />

        {/* Name + role */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5">
            <p className="text-sm font-semibold text-white">{member.name}</p>
            <span className={cn("w-2 h-2 rounded-full shrink-0", statusDot(member.status))} />
          </div>
          <p className="text-[11px] text-zinc-500 capitalize">{member.role}</p>
        </div>

        {/* Task count */}
        <div className="flex items-center gap-1.5 shrink-0">
          <CheckSquare className="w-3.5 h-3.5 text-zinc-600" strokeWidth={1.75} />
          <span className="text-sm font-mono font-semibold text-zinc-300">{member.taskCount}</span>
          <span className="text-[10px] text-zinc-600">tasks</span>
        </div>

        {/* Blocker badge */}
        {blockerTasks.length > 0 && (
          <span className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold text-red-400 bg-red-950/50 border border-red-800">
            <AlertTriangle className="w-3 h-3" strokeWidth={2} />
            {blockerTasks.length} BLOCKED
          </span>
        )}

        {/* Status pill */}
        <span className={cn(
          "shrink-0 text-[10px] font-bold px-2.5 py-1 rounded border",
          member.status === "on_track"
            ? "text-green-400 bg-green-950/40 border-green-900"
            : member.status === "at_risk"
            ? "text-yellow-400 bg-yellow-950/40 border-yellow-900"
            : "text-red-400 bg-red-950/40 border-red-900"
        )}>
          {statusLabel(member.status)}
        </span>

        {expanded
          ? <ChevronUp className="w-4 h-4 text-zinc-600 shrink-0" strokeWidth={1.75} />
          : <ChevronDown className="w-4 h-4 text-zinc-600 shrink-0" strokeWidth={1.75} />
        }
      </button>

      {expanded && (
        <div className="px-5 pb-4 bg-zinc-900/40 space-y-1.5">
          {blockerTasks.length > 0 && (
            <div className="mb-3 space-y-1.5">
              <p className="text-[10px] font-semibold text-red-400 uppercase tracking-widest">Blocked</p>
              {blockerTasks.map((t) => (
                <div key={t.id} className="flex items-start gap-2 p-2 rounded-lg bg-red-950/30 border border-red-900/40">
                  <AlertTriangle className="w-3 h-3 text-red-400 mt-0.5 shrink-0" strokeWidth={1.75} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-zinc-200 leading-snug">{t.title}</p>
                    {t.blocker_reason && (
                      <p className="text-[10px] text-zinc-500 italic mt-0.5">{t.blocker_reason}</p>
                    )}
                  </div>
                  <Link href={`/os/tasks/${t.id}`} className="text-[10px] text-[#D7261E] hover:text-red-400 shrink-0">
                    Resolve
                  </Link>
                </div>
              ))}
            </div>
          )}

          {criticalTasks.length > 0 && (
            <div className="mb-3 space-y-1.5">
              <p className="text-[10px] font-semibold text-yellow-400 uppercase tracking-widest">Critical</p>
              {criticalTasks.map((t) => (
                <div key={t.id} className="flex items-center gap-2">
                  <OSStatusBadge status={t.status ?? "not_started"} className="text-[9px] shrink-0" />
                  <Link href={`/os/tasks/${t.id}`} className="text-xs text-zinc-400 hover:text-zinc-200 truncate">
                    {t.title}
                  </Link>
                </div>
              ))}
            </div>
          )}

          {member.tasks.filter((t) => !t.blocker_flag && t.priority !== "critical").slice(0, 5).map((t) => (
            <div key={t.id} className="flex items-center gap-2">
              <OSStatusBadge status={t.status ?? "not_started"} className="text-[9px] shrink-0" />
              <Link href={`/os/tasks/${t.id}`} className="text-xs text-zinc-400 hover:text-zinc-200 truncate">
                {t.title}
              </Link>
            </div>
          ))}
          {member.taskCount > 7 && (
            <p className="text-[10px] text-zinc-600 pt-1">+{member.taskCount - 7} more tasks</p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Meeting Script Generator ─────────────────────────────────────────────────

function buildScript(
  timeOfDay: string,
  pulseText: string,
  team: TeamMember[],
  blockers: Task[],
) {
  const date = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  })
  const lines = [
    `Team Pulse — ${date}`,
    `${timeOfDay}`,
    ``,
    pulseText,
    ``,
    `TEAM ROLL CALL (${team.length} members):`,
    ...team.map((m) =>
      `  ${m.name} — ${m.taskCount} active tasks — ${statusLabel(m.status)}`
    ),
    ``,
    `BLOCKERS (${blockers.length}):`,
    blockers.length === 0
      ? `  None. All clear.`
      : blockers.map((b) =>
          `  [BLOCKED] ${b.title}${b.blocker_reason ? ` — ${b.blocker_reason}` : ""}`
        ).join("\n"),
  ]
  return lines.join("\n")
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TeamPulsePage() {
  const hour = new Date().getHours()
  const isMorning = hour < 12
  const timeOfDay = isMorning ? "Morning Standup" : hour >= 17 ? "Evening Sync" : "Midday Check"

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  })

  const [team, setTeam] = useState<TeamMember[]>([])
  const [pulses, setPulses] = useState<StoredPulse[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [scriptOpen, setScriptOpen] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [teamRes, pulseRes] = await Promise.all([
        fetch("/api/os/today/team"),
        fetch("/api/os/team-pulse"),
      ])
      const teamData = teamRes.ok ? await teamRes.json() : { team: [] }
      const pulseData = pulseRes.ok ? await pulseRes.json() : { pulses: [] }
      setTeam(teamData.team ?? [])
      setPulses(pulseData.pulses ?? [])
    } catch {
      toast.error("Failed to load Team Pulse data")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const latestPulse = pulses[0] ?? null
  const blockers = team.flatMap((m) => m.tasks.filter((t) => t.blocker_flag))

  // Summary stats
  const totalTasks = team.reduce((acc, m) => acc + m.taskCount, 0)
  const blockedCount = team.filter((m) => m.status === "blocked").length
  const atRiskCount = team.filter((m) => m.status === "at_risk").length
  const onTrackCount = team.filter((m) => m.status === "on_track").length

  const pulseText = latestPulse?.summary.text ?? "No pulse generated yet. Run the cron or wait for the 7am / 7pm schedule."
  const script = buildScript(timeOfDay, pulseText, team, blockers)

  async function copyScript() {
    await navigator.clipboard.writeText(script)
    setCopied(true)
    toast.success("Meeting script copied")
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6 max-w-4xl">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight font-condensed flex items-center gap-3">
            <Activity className="w-5 h-5 text-[#D7261E]" strokeWidth={1.75} />
            Team Pulse
            <span className="text-zinc-600 font-normal text-base">{timeOfDay}</span>
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            {isMorning ? <Sun className="w-3 h-3 inline mr-1 text-yellow-400" strokeWidth={1.75} /> : <Moon className="w-3 h-3 inline mr-1 text-zinc-400" strokeWidth={1.75} />}
            {today}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={copyScript}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-medium hover:bg-zinc-700 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" strokeWidth={2} /> : <Copy className="w-3.5 h-3.5" strokeWidth={1.75} />}
            {copied ? "Copied!" : "Copy Script"}
          </button>
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-medium hover:bg-zinc-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} strokeWidth={1.75} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Stats Bar ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-3">
          <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-semibold">Members</p>
          <p className="text-2xl font-bold text-white font-condensed mt-1">{team.length}</p>
        </div>
        <div className="rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-3">
          <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-semibold">Active Tasks</p>
          <p className="text-2xl font-bold text-white font-condensed mt-1">{loading ? "—" : totalTasks}</p>
        </div>
        <div className="rounded-xl bg-zinc-900 border border-red-900/40 px-4 py-3">
          <p className="text-[10px] text-red-500 uppercase tracking-widest font-semibold">Blockers</p>
          <p className={cn("text-2xl font-bold font-condensed mt-1", blockers.length > 0 ? "text-red-400" : "text-white")}>
            {loading ? "—" : blockers.length}
          </p>
        </div>
        <div className="rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-3">
          <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-semibold">Health</p>
          <div className="flex items-center gap-1.5 mt-1">
            {onTrackCount > 0 && <span className="text-sm font-bold text-green-400 font-condensed">{onTrackCount}</span>}
            {atRiskCount > 0 && <span className="text-sm font-bold text-yellow-400 font-condensed">{atRiskCount}</span>}
            {blockedCount > 0 && <span className="text-sm font-bold text-red-400 font-condensed">{blockedCount}</span>}
            {team.length === 0 && <span className="text-2xl font-bold text-white font-condensed">—</span>}
          </div>
          {team.length > 0 && (
            <div className="flex items-center gap-2 mt-0.5">
              {onTrackCount > 0 && <span className="text-[9px] text-green-600">on track</span>}
              {atRiskCount > 0 && <span className="text-[9px] text-yellow-600">at risk</span>}
              {blockedCount > 0 && <span className="text-[9px] text-red-600">blocked</span>}
            </div>
          )}
        </div>
      </div>

      {/* ── AI-Generated Pulse (from cron) ── */}
      <div className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#D7261E]" />
            <span className="text-[10px] font-semibold tracking-widest text-zinc-500 uppercase">
              Scheduled Pulse · {latestPulse?.summary.time_of_day ?? timeOfDay}
            </span>
          </div>
          {latestPulse?.summary.generated_at && (
            <div className="flex items-center gap-1.5 text-[10px] text-zinc-600 font-mono">
              <Clock className="w-3 h-3" strokeWidth={1.75} />
              {fmtTime(latestPulse.summary.generated_at)}
            </div>
          )}
        </div>
        <div className="px-5 py-4">
          {loading ? (
            <div className="h-12 rounded-lg bg-zinc-800 animate-pulse" />
          ) : (
            <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap">{pulseText}</p>
          )}
        </div>

        {/* Second pulse of the day if exists */}
        {pulses.length > 1 && (
          <div className="border-t border-zinc-800/60 px-5 py-3">
            <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-semibold mb-2">
              Earlier — {pulses[1].summary.time_of_day}
            </p>
            <p className="text-xs text-zinc-500 leading-relaxed">{pulses[1].summary.text}</p>
          </div>
        )}
      </div>

      {/* ── Team Roll Call ── */}
      <div className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-zinc-800">
          <Users className="w-4 h-4 text-zinc-400" strokeWidth={1.75} />
          <span className="text-sm font-semibold text-white">Team Roll Call</span>
          <span className="ml-auto text-[10px] text-zinc-600 font-mono">{team.length} members</span>
        </div>

        {loading ? (
          <div className="divide-y divide-zinc-800/60">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4">
                <div className="w-8 h-8 rounded-full bg-zinc-800 animate-pulse shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-32 rounded bg-zinc-800 animate-pulse" />
                  <div className="h-2 w-20 rounded bg-zinc-800 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : team.length === 0 ? (
          <p className="text-xs text-zinc-600 px-5 py-6 text-center">No team members found.</p>
        ) : (
          <div>
            {team.map((member) => (
              <MemberRow key={member.id} member={member} />
            ))}
          </div>
        )}
      </div>

      {/* ── Active Blockers ── */}
      {(blockers.length > 0 || !loading) && (
        <div className="rounded-xl bg-zinc-900 border border-red-900/40 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-red-900/30">
            <AlertTriangle className="w-4 h-4 text-red-400" strokeWidth={1.75} />
            <span className="text-sm font-semibold text-white">Active Blockers</span>
            <span className={cn(
              "ml-auto text-[10px] font-bold px-2 py-0.5 rounded border font-mono",
              blockers.length > 0
                ? "text-red-400 bg-red-950 border-red-800"
                : "text-zinc-500 bg-zinc-800 border-zinc-700"
            )}>
              {blockers.length}
            </span>
          </div>
          {blockers.length === 0 ? (
            <div className="flex items-center gap-2 px-5 py-4">
              <TrendingUp className="w-4 h-4 text-green-400" strokeWidth={1.75} />
              <p className="text-sm text-green-400 font-medium">All clear — no active blockers.</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/60">
              {blockers.map((b) => {
                const owner = team.find((m) => m.tasks.some((t) => t.id === b.id))
                return (
                  <div key={b.id} className="px-5 py-4 space-y-2">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" strokeWidth={1.75} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-zinc-200">{b.title}</p>
                        {b.blocker_reason && (
                          <p className="text-xs text-zinc-500 italic mt-0.5">{b.blocker_reason}</p>
                        )}
                        {owner && (
                          <p className="text-[10px] text-zinc-600 mt-1">Owner: {owner.name}</p>
                        )}
                      </div>
                      <Link
                        href={`/os/tasks/${b.id}`}
                        className="text-xs font-medium text-[#D7261E] hover:text-red-400 transition-colors shrink-0"
                      >
                        Resolve →
                      </Link>
                    </div>
                    <p className="text-[11px] text-zinc-600 pl-7 italic">
                      Ask: &quot;Who&apos;s unblocking {b.title.split(" ").slice(0, 4).join(" ")}...?&quot;
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Meeting Script ── */}
      <div className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
        <button
          onClick={() => setScriptOpen((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-3 hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-center gap-2">
            <Copy className="w-4 h-4 text-zinc-400" strokeWidth={1.75} />
            <span className="text-sm font-semibold text-white">Meeting Script</span>
            <span className="text-[10px] text-zinc-600">— read aloud</span>
          </div>
          {scriptOpen
            ? <ChevronUp className="w-3.5 h-3.5 text-zinc-600" strokeWidth={1.75} />
            : <ChevronDown className="w-3.5 h-3.5 text-zinc-600" strokeWidth={1.75} />
          }
        </button>
        {scriptOpen && (
          <div className="border-t border-zinc-800 px-5 py-4 space-y-3">
            <pre className="text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed font-mono bg-zinc-950/50 rounded-lg p-4">
              {script}
            </pre>
            <button
              onClick={copyScript}
              className="flex items-center gap-2 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-400" strokeWidth={2} /> : <Copy className="w-3.5 h-3.5" strokeWidth={1.75} />}
              {copied ? "Copied!" : "Copy to clipboard"}
            </button>
          </div>
        )}
      </div>

    </div>
  )
}
