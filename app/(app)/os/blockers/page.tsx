"use client"

import { useState, useCallback } from "react"
import useSWR, { mutate } from "swr"
import {
  ShieldAlert, AlertTriangle, ArrowRight, ChevronDown, ChevronUp,
  CheckCircle2, Clock, TrendingUp, Loader2, RefreshCw, Link2,
} from "lucide-react"
import { OSAvatar } from "@/components/byred/os/os-avatar"
import { OSPriorityBadge } from "@/components/byred/os/os-badge"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import Link from "next/link"

// ─── Types ────────────────────────────────────────────────────────────────────

type BlockingTask = {
  id: string
  title: string
  status: string
  owner: { id: string; name: string } | null
}

type BlockerTask = {
  id: string
  title: string
  status: string
  priority: string
  due_date: string | null
  blocker_reason: string | null
  blocked_by_task_id: string | null
  tenant_id: string
  owner_user_id: string | null
  created_at: string
  days_overdue: number
  owner: { id: string; name: string; role: string; avatar_url: string | null } | null
  project: { id: string; name: string } | null
  blocking_task: BlockingTask | null
}

type GroupedOwner = {
  owner: { id: string; name: string; role: string; avatar_url: string | null }
  tasks: BlockerTask[]
}

type BlockersData = {
  blockers: BlockerTask[]
  grouped: GroupedOwner[]
  unassigned: BlockerTask[]
  stats: {
    total: number
    critical: number
    ownersAffected: number
    overdue: number
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function daysSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
}

// ─── Blocker Card ─────────────────────────────────────────────────────────────

function BlockerCard({ task, onUnblocked }: { task: BlockerTask; onUnblocked: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const [unblocking, setUnblocking] = useState(false)
  const blockedDays = daysSince(task.created_at)

  async function handleUnblock() {
    setUnblocking(true)
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "in_progress" }),
      })
      if (!res.ok) throw new Error()
      toast.success("Task unblocked — status set to In Progress")
      onUnblocked()
    } catch {
      toast.error("Failed to unblock task")
    } finally {
      setUnblocking(false)
    }
  }

  return (
    <div className="rounded-xl border border-red-900/40 bg-red-950/10 overflow-hidden hover:border-red-800/60 transition-colors">
      {/* Main row */}
      <div
        className="flex items-start gap-3 p-4 cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
      >
        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" strokeWidth={1.75} />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-zinc-100 leading-snug">{task.title}</p>

          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {task.project && (
              <span className="text-[10px] text-[#9CA3AF] truncate max-w-[180px]">{task.project.name}</span>
            )}
            <OSPriorityBadge priority={task.priority ?? "medium"} className="text-[9px] py-0 px-1.5" />
            {task.due_date && (
              <span className={cn(
                "text-[10px] font-mono",
                task.days_overdue > 0 ? "text-red-400" : "text-[#6B7280]"
              )}>
                {task.days_overdue > 0 ? `${task.days_overdue}d overdue` : fmtDate(task.due_date)}
              </span>
            )}
            <span className="text-[10px] text-[#6B7280] font-mono">
              blocked {blockedDays === 0 ? "today" : `${blockedDays}d ago`}
            </span>
          </div>
        </div>

        <button className="text-[#6B7280] hover:text-[#9CA3AF] shrink-0 mt-0.5">
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-red-900/30 px-4 py-3 bg-[#111318]/60 space-y-3">

          {/* Blocker reason */}
          <div>
            <p className="text-[10px] text-[#6B7280] uppercase tracking-widest font-semibold mb-1">Why blocked</p>
            <p className="text-xs text-[#9CA3AF] leading-relaxed">
              {task.blocker_reason ?? "No reason provided — update this task to add context."}
            </p>
          </div>

          {/* Dependency link */}
          {task.blocking_task ? (
            <div>
              <p className="text-[10px] text-[#6B7280] uppercase tracking-widest font-semibold mb-1.5">Blocked by</p>
              <Link
                href={`/os/tasks/${task.blocking_task.id}`}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1A1D24]/80 border border-[#2A2D35] hover:border-zinc-500 transition-colors group"
                onClick={(e) => e.stopPropagation()}
              >
                <Link2 className="w-3 h-3 text-[#9CA3AF] shrink-0 group-hover:text-[#9CA3AF]" strokeWidth={1.75} />
                <span className="text-xs text-[#9CA3AF] truncate flex-1 group-hover:text-white">{task.blocking_task.title}</span>
                {task.blocking_task.owner && (
                  <span className="text-[10px] text-[#6B7280] shrink-0">{task.blocking_task.owner.name}</span>
                )}
                <ArrowRight className="w-3 h-3 text-[#6B7280] shrink-0 group-hover:text-[#9CA3AF]" strokeWidth={1.75} />
              </Link>
            </div>
          ) : (
            <div>
              <p className="text-[10px] text-[#6B7280] uppercase tracking-widest font-semibold mb-1">Dependency</p>
              <p className="text-xs text-[#6B7280] italic">No linked dependency — blocker is standalone.</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            <Link
              href={`/os/tasks/${task.id}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1A1D24] border border-[#2A2D35] text-xs font-medium text-[#9CA3AF] hover:bg-[#1A1D24] transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              Open task
              <ArrowRight className="w-3 h-3" strokeWidth={1.75} />
            </Link>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); void handleUnblock() }}
              disabled={unblocking}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-950/40 border border-green-900 text-xs font-medium text-green-400 hover:bg-green-950/70 transition-colors disabled:opacity-50"
            >
              {unblocking
                ? <Loader2 className="w-3 h-3 animate-spin" strokeWidth={1.75} />
                : <CheckCircle2 className="w-3 h-3" strokeWidth={1.75} />
              }
              {unblocking ? "Unblocking…" : "Mark Unblocked"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Owner Group ──────────────────────────────────────────────────────────────

function OwnerGroup({ group, onUnblocked }: { group: GroupedOwner; onUnblocked: () => void }) {
  const [collapsed, setCollapsed] = useState(false)
  const critCount = group.tasks.filter((t) => t.priority === "critical").length

  return (
    <div className="rounded-xl bg-[#111318] border border-[#2A2D35] overflow-hidden">
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-white/[0.02] transition-colors"
      >
        <OSAvatar name={group.owner.name} size="sm" />
        <div className="flex-1 min-w-0 text-left">
          <p className="text-sm font-semibold text-white">{group.owner.name}</p>
          <p className="text-[10px] text-[#6B7280] capitalize">{group.owner.role}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-mono text-red-400 font-semibold">
            {group.tasks.length} blocked
          </span>
          {critCount > 0 && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-950 border border-red-800 text-red-400">
              {critCount} CRITICAL
            </span>
          )}
          {collapsed
            ? <ChevronDown className="w-3.5 h-3.5 text-[#6B7280]" strokeWidth={1.75} />
            : <ChevronUp className="w-3.5 h-3.5 text-[#6B7280]" strokeWidth={1.75} />
          }
        </div>
      </button>

      {!collapsed && (
        <div className="px-4 pb-4 space-y-2.5 border-t border-[#2A2D35]/60 pt-3">
          {group.tasks.map((task) => (
            <BlockerCard key={task.id} task={task} onUnblocked={onUnblocked} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function BlockersPage() {
  const { data, isLoading, mutate: revalidate } = useSWR<BlockersData>("/api/os/blockers", fetcher, {
    refreshInterval: 30000,
  })

  const reload = useCallback(() => { void revalidate() }, [revalidate])

  const stats = data?.stats ?? { total: 0, critical: 0, ownersAffected: 0, overdue: 0 }
  const grouped = data?.grouped ?? []
  const unassigned = data?.unassigned ?? []
  const hasBlockers = (data?.blockers?.length ?? 0) > 0

  return (
    <div className="space-y-6 max-w-4xl">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight font-condensed flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-red-400" strokeWidth={1.75} />
            Blockers
            {!isLoading && hasBlockers && (
              <span className="text-sm font-mono font-normal text-red-400 bg-red-950 border border-red-800 px-2 py-0.5 rounded">
                {stats.total}
              </span>
            )}
          </h1>
          <p className="text-xs text-[#9CA3AF] mt-1">
            Active blocks and dependencies — auto-populated from task status
          </p>
        </div>
        <button
          type="button"
          onClick={reload}
          disabled={isLoading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1A1D24] border border-[#2A2D35] text-[#9CA3AF] text-xs font-medium hover:bg-[#1A1D24] transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} strokeWidth={1.75} />
          Refresh
        </button>
      </div>

      {/* ── Stats Bar ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Blocked",     value: stats.total,          color: stats.total > 0 ? "text-red-400" : "text-white",    border: stats.total > 0 ? "border-red-900/40" : "border-[#2A2D35]" },
          { label: "Critical",          value: stats.critical,       color: stats.critical > 0 ? "text-red-400" : "text-white", border: stats.critical > 0 ? "border-red-900/40" : "border-[#2A2D35]" },
          { label: "Owners Affected",   value: stats.ownersAffected, color: "text-yellow-400",  border: "border-yellow-900/30" },
          { label: "Overdue",           value: stats.overdue,        color: stats.overdue > 0 ? "text-orange-400" : "text-white", border: stats.overdue > 0 ? "border-orange-900/40" : "border-[#2A2D35]" },
        ].map(({ label, value, color, border }) => (
          <div key={label} className={cn("rounded-xl bg-[#111318] border px-4 py-3", border)}>
            <p className="text-[10px] text-[#6B7280] uppercase tracking-widest font-semibold">{label}</p>
            <p className={cn("text-2xl font-bold font-condensed mt-1", isLoading ? "text-[#6B7280]" : color)}>
              {isLoading ? "—" : value}
            </p>
          </div>
        ))}
      </div>

      {/* ── Content ── */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="rounded-xl bg-[#111318] border border-[#2A2D35] h-24 animate-pulse" />
          ))}
        </div>
      ) : !hasBlockers ? (
        <div className="rounded-xl bg-[#111318] border border-green-900/30 px-6 py-10 text-center space-y-3">
          <TrendingUp className="w-8 h-8 text-green-400 mx-auto" strokeWidth={1.5} />
          <p className="text-sm font-semibold text-green-400">No active blockers</p>
          <p className="text-xs text-[#6B7280] max-w-sm mx-auto">
            Tasks with <code className="text-[#9CA3AF]">status: blocked</code> will appear here automatically.
            Mark any task as "Blocked" from its detail page to track it.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map((group) => (
            <OwnerGroup key={group.owner.id} group={group} onUnblocked={reload} />
          ))}

          {unassigned.length > 0 && (
            <div className="rounded-xl bg-[#111318] border border-[#2A2D35] overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[#2A2D35]/60">
                <Clock className="w-4 h-4 text-[#6B7280]" strokeWidth={1.75} />
                <p className="text-sm font-semibold text-[#9CA3AF]">Unassigned</p>
                <span className="ml-auto text-[11px] font-mono text-[#6B7280]">{unassigned.length}</span>
              </div>
              <div className="px-4 pb-4 pt-3 space-y-2.5">
                {unassigned.map((task) => (
                  <BlockerCard key={task.id} task={task} onUnblocked={reload} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  )
}
