"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Flame, DollarSign, Zap, Calendar, Brain,
  AlertTriangle, RefreshCw, CheckCheck, RotateCcw,
  ChevronDown, ChevronUp, Clock, Users, Mic,
  Sun, Moon, Send
} from "lucide-react"
import { OSStatusBadge, OSPriorityBadge } from "@/components/byred/os/os-badge"
import { OSAvatar } from "@/components/byred/os/os-avatar"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import Link from "next/link"
import type { Task } from "@/types/db"

// ─── Types ───────────────────────────────────────────────────────────────────

type BucketKey = "critical_now" | "money_moves" | "quick_wins" | "coming_up" | "deep_work"

type TriageSuggestion = {
  taskId: string
  task: Task
  bucket: BucketKey
  reason: string
  confirmed: boolean | null // null = pending, true = confirmed, false = reassigned
}

type TeamMember = {
  id: string
  name: string
  role: string
  avatar_url: string | null
  taskCount: number
  tasks: Task[]
  status: "on_track" | "at_risk" | "blocked"
}

type DailyBriefData = {
  headline: string
  body: string
  top_3: string[]
  warnings: string[]
  next_action: string
  generated_at?: string
}

// ─── Constants ───────────────────────────────────────────────────────────────

const BUCKETS: {
  key: BucketKey
  label: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  accent: string
  border: string
  bg: string
}[] = [
  // Category colors: red (critical) → green (money) → yellow (quick/deep) → gray (upcoming)
  { key: "critical_now",  label: "Critical Now",  icon: Flame,      accent: "text-red-400",     border: "border-red-900/60",    bg: "bg-red-950/20" },
  { key: "money_moves",   label: "Money Moves",   icon: DollarSign, accent: "text-green-400",   border: "border-green-900/60",  bg: "bg-green-950/20" },
  { key: "quick_wins",    label: "Quick Wins",    icon: Zap,        accent: "text-yellow-400",  border: "border-yellow-900/60", bg: "bg-yellow-950/20" },
  { key: "coming_up",     label: "Coming Up",     icon: Calendar,   accent: "text-zinc-400",    border: "border-zinc-800",      bg: "bg-zinc-900/40" },
  { key: "deep_work",     label: "Deep Work",     icon: Brain,      accent: "text-orange-400",  border: "border-orange-900/60", bg: "bg-orange-950/20" },
]

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function fmtMinutes(min: number) {
  if (min < 60) return `${min}m`
  const h = Math.floor(min / 60), m = min % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

// ─── Task Card ───────────────────────────────────────────────────────────────

function TaskCard({
  task,
  aiReason,
  onConfirm,
  onReassign,
  showActions,
}: {
  task: Task
  aiReason?: string
  onConfirm?: () => void
  onReassign?: () => void
  showActions?: boolean
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="rounded-lg bg-zinc-800/60 border border-zinc-700/50 overflow-hidden hover:border-zinc-600 transition-colors">
      <div
        className="flex items-start gap-2.5 p-3 cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-zinc-200 leading-snug line-clamp-2">{task.title}</p>
          {aiReason && (
            <p className="text-[10px] text-zinc-500 italic mt-1 leading-snug">{aiReason}</p>
          )}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {task.due_date && (
              <span className="text-[10px] text-zinc-600 font-mono">{fmtDate(task.due_date)}</span>
            )}
            {(task.estimated_minutes ?? 0) > 0 && (
              <span className="text-[10px] text-zinc-600 font-mono">{fmtMinutes(task.estimated_minutes)}</span>
            )}
            <OSPriorityBadge priority={task.priority ?? "medium"} className="text-[9px] py-0 px-1.5" />
          </div>
        </div>
        <button className="text-zinc-600 hover:text-zinc-400 shrink-0 mt-0.5">
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-zinc-700/50 px-3 py-2.5 space-y-2 bg-zinc-900/40">
          {task.description && (
            <p className="text-[11px] text-zinc-400 leading-relaxed">{task.description}</p>
          )}
          {task.blocker_flag && task.blocker_reason && (
            <div className="flex items-start gap-1.5 text-[11px] text-red-400">
              <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" strokeWidth={1.75} />
              <span>{task.blocker_reason}</span>
            </div>
          )}
          <Link
            href={`/os/tasks/${task.id}`}
            className="inline-flex text-[10px] text-[#D7261E] hover:text-red-400 transition-colors"
          >
            Open task
          </Link>
        </div>
      )}

      {showActions && onConfirm && onReassign && (
        <div className="border-t border-zinc-700/50 flex">
          <button
            onClick={onConfirm}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-medium text-emerald-400 hover:bg-emerald-950/40 transition-colors"
          >
            <CheckCheck className="w-3 h-3" strokeWidth={1.75} />
            Confirm
          </button>
          <div className="w-px bg-zinc-700/50" />
          <button
            onClick={onReassign}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-medium text-zinc-400 hover:bg-zinc-700/30 transition-colors"
          >
            <RotateCcw className="w-3 h-3" strokeWidth={1.75} />
            Reassign
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Bucket Column ───────────────────────────────────────────────────────────

function BucketColumn({
  bucket,
  tasks,
  suggestions,
  onConfirm,
  onReassign,
  triageMode,
}: {
  bucket: typeof BUCKETS[0]
  tasks: Task[]
  suggestions: TriageSuggestion[]
  onConfirm: (taskId: string) => void
  onReassign: (taskId: string) => void
  triageMode: boolean
}) {
  const Icon = bucket.icon
  const pendingSuggestions = suggestions.filter((s) => s.bucket === bucket.key && s.confirmed === null)
  const confirmedSuggestions = suggestions.filter((s) => s.bucket === bucket.key && s.confirmed === true)
  const displayTasks = triageMode ? [...confirmedSuggestions.map((s) => s.task)] : tasks

  return (
    <div className={cn("rounded-xl border flex flex-col overflow-hidden", bucket.border, bucket.bg)}>
      <div className="flex items-center justify-between px-3.5 py-3 border-b border-zinc-800/60">
        <div className={cn("flex items-center gap-2", bucket.accent)}>
          <Icon className="w-3.5 h-3.5" strokeWidth={1.75} />
          <span className="text-[11px] font-semibold uppercase tracking-widest">{bucket.label}</span>
        </div>
        <span className="text-[10px] font-mono text-zinc-600">
          {triageMode ? pendingSuggestions.length + confirmedSuggestions.length : tasks.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-2.5 space-y-2 max-h-[420px]">
        {/* Pending triage suggestions */}
        {triageMode && pendingSuggestions.map((s) => (
          <TaskCard
            key={s.taskId}
            task={s.task}
            aiReason={s.reason}
            showActions
            onConfirm={() => onConfirm(s.taskId)}
            onReassign={() => onReassign(s.taskId)}
          />
        ))}

        {/* Confirmed / regular tasks */}
        {displayTasks.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}

        {displayTasks.length === 0 && pendingSuggestions.length === 0 && (
          <p className="text-[11px] text-zinc-700 text-center py-6">None.</p>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function OSTodayPage() {
  const hour = new Date().getHours()
  const isMorning = hour < 12
  const isEvening = hour >= 17
  const timeOfDay = isMorning ? "Morning Standup" : isEvening ? "Evening Sync" : "Midday Check"

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  })

  // ── State ──
  const [tasks, setTasks] = useState<Task[]>([])
  const [team, setTeam] = useState<TeamMember[]>([])
  const [blockers, setBlockers] = useState<Task[]>([])
  const [brief, setBrief] = useState<DailyBriefData | null>(null)
  const [suggestions, setSuggestions] = useState<TriageSuggestion[]>([])
  const [triageMode, setTriageMode] = useState(false)
  const [loadingBrief, setLoadingBrief] = useState(false)
  const [loadingTriage, setLoadingTriage] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [expandedMember, setExpandedMember] = useState<string | null>(null)
  const [scriptVisible, setScriptVisible] = useState(false)

  // ── Load data ──
  const loadData = useCallback(async () => {
    setLoadingData(true)
    try {
      const [tasksRes, teamRes] = await Promise.all([
        fetch("/api/os/today/tasks"),
        fetch("/api/os/today/team"),
      ])
      const tasksData = tasksRes.ok ? await tasksRes.json() : { tasks: [], blockers: [] }
      const teamData = teamRes.ok ? await teamRes.json() : { team: [] }
      setTasks(tasksData.tasks ?? [])
      setBlockers(tasksData.blockers ?? [])
      setTeam(teamData.team ?? [])
    } catch {
      toast.error("Failed to load today's data")
    } finally {
      setLoadingData(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // ── Bucket filters ──
  const today_date = new Date().toISOString().split("T")[0]
  const threeDays = new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0]

  const bucketedTasks = (key: BucketKey): Task[] => {
    // Treat any non-terminal status as active — DB may use different strings
    const active = tasks.filter(
      (t) => t.status !== "done" && t.status !== "cancelled" && t.status !== "complete" && t.status !== "completed"
    )
    if (active.length === 0) return []

    switch (key) {
      case "critical_now": {
        const exact = active.filter(
          (t) => t.blocker_flag ||
            t.priority === "critical" ||
            t.priority === "urgent" ||
            (t.due_date != null && t.due_date <= today_date) ||
            t.urgency_score >= 8
        )
        // Hard fallback: show ALL active tasks in this bucket so it's never empty
        return exact.length > 0 ? exact : active.slice(0, 10)
      }
      case "money_moves":
        return active.filter(
          (t) => t.revenue_impact_score >= 7 ||
            t.priority === "high" ||
            t.priority === "critical"
        )
      case "quick_wins":
        // estimated_minutes defaults to 30 in mapper — include those plus explicit short tasks
        return active.filter((t) => t.estimated_minutes <= 45)
      case "coming_up":
        return active.filter(
          (t) => t.due_date && t.due_date > today_date && t.due_date <= threeDays
        )
      case "deep_work":
        return active.filter((t) => t.estimated_minutes > 45)
    }
  }

  // ── AI Brief ──
  const generateBrief = async () => {
    setLoadingBrief(true)
    try {
      const res = await fetch("/api/os/today/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks, blockers, timeOfDay }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setBrief(data)
      toast.success("Brief generated")
    } catch {
      toast.error("Failed to generate brief")
    } finally {
      setLoadingBrief(false)
    }
  }

  // ── AI Triage ──
  const generateTriage = async () => {
    setLoadingTriage(true)
    try {
      const res = await fetch("/api/os/tasks/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks }),
      })
      if (!res.ok) throw new Error()
      const data: { suggestions: { taskId: string; bucket: BucketKey; reason: string }[] } = await res.json()
      const mapped: TriageSuggestion[] = data.suggestions.map((s) => ({
        ...s,
        task: tasks.find((t) => t.id === s.taskId)!,
        confirmed: null,
      })).filter((s) => s.task)
      setSuggestions(mapped)
      setTriageMode(true)
      toast.success(`${mapped.length} tasks triaged — review and confirm`)
    } catch {
      toast.error("Triage failed — check API connection")
    } finally {
      setLoadingTriage(false)
    }
  }

  const confirmSuggestion = (taskId: string) =>
    setSuggestions((prev) => prev.map((s) => s.taskId === taskId ? { ...s, confirmed: true } : s))

  const reassignSuggestion = (taskId: string) =>
    setSuggestions((prev) => prev.map((s) => s.taskId === taskId ? { ...s, confirmed: false } : s))

  const confirmAll = () => {
    setSuggestions((prev) => prev.map((s) => ({ ...s, confirmed: s.confirmed === null ? true : s.confirmed })))
    toast.success("All suggestions confirmed")
  }

  // ── Team Pulse Script ──
  const teamPulseScript = () => {
    const date = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
    const lines = [
      `Team Pulse — ${date} — ${timeOfDay}`,
      ``,
      brief?.body ?? "No brief generated.",
      ``,
      `TEAM STATUS:`,
      ...team.map((m) => `  ${m.name} (${m.taskCount} tasks) — ${m.status.replace("_", " ").toUpperCase()}`),
      ``,
      `BLOCKERS (${blockers.length}):`,
      ...blockers.map((b) => `  [BLOCKED] ${b.title}${b.blocker_reason ? ` — ${b.blocker_reason}` : ""}`),
    ]
    return lines.join("\n")
  }

  const pendingCount = suggestions.filter((s) => s.confirmed === null).length

  return (
    <div className="space-y-6 max-w-[1400px]">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight font-condensed flex items-center gap-3">
            {isMorning ? <Sun className="w-5 h-5 text-amber-400" strokeWidth={1.75} /> : <Moon className="w-5 h-5 text-indigo-400" strokeWidth={1.75} />}
            Today
            <span className="text-zinc-600 font-normal text-base">{timeOfDay}</span>
          </h1>
          <p className="text-xs text-zinc-500 mt-1">{today}</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {triageMode && pendingCount > 0 && (
            <button
              onClick={confirmAll}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-900/50 border border-emerald-800 text-emerald-300 text-xs font-medium hover:bg-emerald-900 transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5" strokeWidth={1.75} />
              Confirm All ({pendingCount})
            </button>
          )}
          <button
            onClick={generateTriage}
            disabled={loadingTriage || tasks.length === 0}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-medium hover:bg-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingTriage
              ? <RefreshCw className="w-3.5 h-3.5 animate-spin" strokeWidth={1.75} />
              : <Zap className="w-3.5 h-3.5" strokeWidth={1.75} />
            }
            {loadingTriage ? "Triaging..." : "AI Triage"}
          </button>
          <button
            onClick={generateBrief}
            disabled={loadingBrief}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#D7261E]/20 border border-[#D7261E]/40 text-red-300 text-xs font-medium hover:bg-[#D7261E]/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingBrief
              ? <RefreshCw className="w-3.5 h-3.5 animate-spin" strokeWidth={1.75} />
              : <Mic className="w-3.5 h-3.5" strokeWidth={1.75} />
            }
            {loadingBrief ? "Generating..." : "Generate Brief"}
          </button>
        </div>
      </div>

      {/* ── Daily Brief ── */}
      {brief && (
        <div className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800">
            <span className="text-[10px] font-semibold tracking-widest text-zinc-500 uppercase">
              Daily Brief · {timeOfDay}
            </span>
            {brief.generated_at && (
              <span className="text-[10px] text-zinc-700 font-mono">
                {new Date(brief.generated_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>
          <div className="px-5 py-4 space-y-4">
            <p className="text-sm text-zinc-200 leading-relaxed">{brief.body}</p>

            {brief.top_3.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">Top 3 Focus</p>
                <ol className="space-y-1">
                  {brief.top_3.map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-zinc-300">
                      <span className="text-[#D7261E] font-bold font-condensed shrink-0 w-4">{i + 1}.</span>
                      {item}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {brief.warnings.length > 0 && (
              <div className="space-y-1.5">
                {brief.warnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-950/40 border border-amber-900/40">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" strokeWidth={1.75} />
                    <p className="text-xs text-amber-400">{w}</p>
                  </div>
                ))}
              </div>
            )}

            {brief.next_action && (
              <div className="pt-3 border-t border-zinc-800">
                <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">Next Action</p>
                <p className="text-sm font-semibold text-white">{brief.next_action}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 5 Bucket Columns ── */}
      {loadingData ? (
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-3">
          {BUCKETS.map((b) => (
            <div key={b.key} className="rounded-xl bg-zinc-900 border border-zinc-800 h-48 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-3">
          {BUCKETS.map((bucket) => (
            <BucketColumn
              key={bucket.key}
              bucket={bucket}
              tasks={bucketedTasks(bucket.key)}
              suggestions={suggestions}
              onConfirm={confirmSuggestion}
              onReassign={reassignSuggestion}
              triageMode={triageMode}
            />
          ))}
        </div>
      )}

      {/* ── Bottom Row: Team Strip + Blocker Rail ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Team Strip */}
        <div className="xl:col-span-2 rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-zinc-800">
            <Users className="w-4 h-4 text-zinc-400" strokeWidth={1.75} />
            <span className="text-sm font-medium text-white">Team Status</span>
          </div>
          <div className="divide-y divide-zinc-800/60">
            {team.length === 0 ? (
              <p className="text-xs text-zinc-600 px-5 py-4">Loading team...</p>
            ) : (
              // Team status: green (on track) → yellow (at risk) → red (blocked)
              team.map((member) => {
                const dot = member.status === "on_track" ? "bg-green-400" :
                  member.status === "at_risk" ? "bg-yellow-400" : "bg-red-400"
                const isExpanded = expandedMember === member.id
                return (
                  <div key={member.id}>
                    <div
                      className="flex items-center gap-3 px-5 py-3 hover:bg-white/[0.02] cursor-pointer transition-colors"
                      onClick={() => setExpandedMember(isExpanded ? null : member.id)}
                    >
                      <OSAvatar name={member.name} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-zinc-200">{member.name}</p>
                          <span className={cn("w-2 h-2 rounded-full shrink-0", dot)} />
                        </div>
                        <p className="text-[10px] text-zinc-600">{member.taskCount} tasks · {member.role}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={cn(
                          "text-[10px] font-medium px-2 py-0.5 rounded border",
                          member.status === "on_track" ? "text-green-400 bg-green-950/40 border-green-900" :
                          member.status === "at_risk" ? "text-yellow-400 bg-yellow-950/40 border-yellow-900" :
                          "text-red-400 bg-red-950/40 border-red-900"
                        )}>
                          {member.status.replace("_", " ").toUpperCase()}
                        </span>
                        {isExpanded
                          ? <ChevronUp className="w-3.5 h-3.5 text-zinc-600" strokeWidth={1.75} />
                          : <ChevronDown className="w-3.5 h-3.5 text-zinc-600" strokeWidth={1.75} />
                        }
                      </div>
                    </div>
                    {isExpanded && member.tasks.length > 0 && (
                      <div className="px-5 pb-3 space-y-1.5 bg-zinc-900/60">
                        {member.tasks.slice(0, 5).map((t) => (
                          <div key={t.id} className="flex items-center gap-2.5">
                            <OSStatusBadge status={t.status ?? "not_started"} className="text-[9px] py-0 px-1.5 shrink-0" />
                            <Link
                              href={`/os/tasks/${t.id}`}
                              className="text-xs text-zinc-400 hover:text-zinc-200 truncate transition-colors"
                            >
                              {t.title}
                            </Link>
                          </div>
                        ))}
                        {member.tasks.length > 5 && (
                          <p className="text-[10px] text-zinc-600">+{member.tasks.length - 5} more</p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Blocker Rail */}
        <div className="rounded-xl bg-zinc-900 border border-red-900/40 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-red-900/30">
            <AlertTriangle className="w-4 h-4 text-red-400" strokeWidth={1.75} />
            <span className="text-sm font-medium text-white">Blockers</span>
            {blockers.length > 0 && (
              <span className="ml-auto text-[10px] font-bold text-red-400 bg-red-950 border border-red-800 px-1.5 py-0.5 rounded">
                {blockers.length}
              </span>
            )}
          </div>
          <div className="divide-y divide-zinc-800/60">
            {blockers.length === 0 ? (
              <p className="text-xs text-zinc-600 px-4 py-4">No active blockers.</p>
            ) : (
              blockers.map((b) => (
                <div key={b.id} className="px-4 py-3 space-y-1.5">
                  <p className="text-xs font-medium text-zinc-200">{b.title}</p>
                  {b.blocker_reason && (
                    <p className="text-[10px] text-zinc-500 italic">{b.blocker_reason}</p>
                  )}
                  <div className="flex items-center gap-2 pt-1">
                    <p className="text-[10px] text-zinc-600 flex-1">
                      Ask: &quot;Who&apos;s handling {b.title.split(" ").slice(0, 4).join(" ")}...?&quot;
                    </p>
                    <Link
                      href={`/os/tasks/${b.id}`}
                      className="text-[10px] font-medium text-[#D7261E] hover:text-red-400 transition-colors"
                    >
                      Resolve
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Team Pulse Script ── */}
      <div className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
        <button
          onClick={() => setScriptVisible((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-3 hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-center gap-2">
            <Send className="w-4 h-4 text-zinc-400" strokeWidth={1.75} />
            <span className="text-sm font-medium text-white">Team Pulse Script</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-600">Ready to read aloud</span>
            {scriptVisible
              ? <ChevronUp className="w-3.5 h-3.5 text-zinc-600" strokeWidth={1.75} />
              : <ChevronDown className="w-3.5 h-3.5 text-zinc-600" strokeWidth={1.75} />
            }
          </div>
        </button>
        {scriptVisible && (
          <div className="border-t border-zinc-800 px-5 py-4">
            <pre className="text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed font-mono">
              {teamPulseScript()}
            </pre>
            <button
              onClick={() => {
                navigator.clipboard.writeText(teamPulseScript())
                toast.success("Script copied to clipboard")
              }}
              className="mt-3 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1.5"
            >
              <Clock className="w-3 h-3" strokeWidth={1.75} />
              Copy to clipboard
            </button>
          </div>
        )}
      </div>

    </div>
  )
}
