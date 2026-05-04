"use client"

import { useState } from "react"
import useSWR from "swr"
import Link from "next/link"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie,
} from "recharts"
import {
  AlertTriangle, Clock, CheckCircle2, Zap, TrendingUp,
  Loader2, AlertCircle, RefreshCw, Users, Layers, ArrowLeft,
} from "lucide-react"
import { OSAvatar } from "@/components/byred/os/os-avatar"
import { OSPriorityBadge } from "@/components/byred/os/os-badge"
import { cn } from "@/lib/utils"
import type { KPIPayload } from "@/app/api/os/kpis/route"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
}

// ── Stat Card ──────────────────────────────────────────────────────────────
function StatCard({
  label, value, sub, accent, icon: Icon,
}: {
  label: string
  value: number | string
  sub?: string
  accent?: "red" | "yellow" | "green" | "default"
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
}) {
  // Street light: red = stop/overdue, yellow = caution/at-risk, green = go/done
  const ring = accent === "red" && Number(value) > 0 ? "border-red-800/50 bg-red-950/20"
    : accent === "yellow" && Number(value) > 0 ? "border-yellow-800/40 bg-yellow-950/10"
    : accent === "green" ? "border-green-800/30 bg-green-950/10"
    : "border-zinc-800 bg-zinc-900"
  const valColor = accent === "red" && Number(value) > 0 ? "text-red-400"
    : accent === "yellow" && Number(value) > 0 ? "text-yellow-400"
    : accent === "green" ? "text-green-400"
    : "text-white"
  const iconColor = accent === "red" && Number(value) > 0 ? "text-red-500"
    : accent === "yellow" && Number(value) > 0 ? "text-yellow-500"
    : accent === "green" ? "text-green-500"
    : "text-zinc-600"

  return (
    <div className={cn("rounded-xl border p-5 flex flex-col gap-3", ring)}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">{label}</span>
        <Icon className={cn("w-3.5 h-3.5", iconColor)} strokeWidth={1.75} />
      </div>
      <p className={cn("text-3xl font-bold font-condensed tracking-tight", valColor)}>{value}</p>
      {sub && <p className="text-xs text-zinc-600">{sub}</p>}
    </div>
  )
}

// ── Velocity Tooltip ───────────────────────────────────────────────────────
function VelocityTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-zinc-200 shadow-xl">
      <p className="font-medium">{label}</p>
      <p className="text-green-400">{payload[0].value} completed</p>
    </div>
  )
}

// ── Team Load Pie ──────────────────────────────────────────────────────────
// Refined palette: distinct hues, consistent saturation, dark-mode friendly
const MEMBER_COLORS = [
  "#22D3EE", // cyan-400 — primary accent
  "#A78BFA", // violet-400
  "#34D399", // emerald-400
  "#FB923C", // orange-400
  "#F472B6", // pink-400
  "#60A5FA", // blue-400
  "#FBBF24", // amber-400
  "#A3E635", // lime-400
]

function TeamPieTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number }> }) {
  if (!active || !payload?.length) return null
  return (
    <div className="px-2.5 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-xs shadow-xl">
      <p className="font-medium text-white">{payload[0].name}</p>
      <p className="text-zinc-400">{payload[0].value} active tasks</p>
    </div>
  )
}

type TeamMember = KPIPayload["team"][number]

function TeamLoadPanel({ team }: { team: TeamMember[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = team.find((m) => m.user_id === selectedId) ?? null
  const active = team.filter((m) => m.total_active > 0)

  const pieData = active.map((m, i) => ({
    name: m.name,
    value: m.total_active,
    color: MEMBER_COLORS[i % MEMBER_COLORS.length],
    userId: m.user_id,
  }))

  if (team.length === 0) return <p className="text-sm text-zinc-600">No team data yet.</p>

  if (active.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-emerald-500">
        <CheckCircle2 className="w-4 h-4" strokeWidth={1.75} />
        No active workload — everyone clear.
      </div>
    )
  }

  return (
    <div className="flex gap-3 items-start min-h-[130px]">
      {/* Donut pie */}
      <div className="shrink-0 w-[130px] h-[130px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={34}
              outerRadius={56}
              paddingAngle={3}
              dataKey="value"
              onClick={(entry: { userId: string }) => setSelectedId(selectedId === entry.userId ? null : entry.userId)}
              style={{ cursor: "pointer" }}
              strokeWidth={0}
            >
              {pieData.map((entry) => (
                <Cell
                  key={entry.userId}
                  fill={entry.color}
                  opacity={selectedId === null || selectedId === entry.userId ? 1 : 0.2}
                />
              ))}
            </Pie>
            <Tooltip content={<TeamPieTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Detail panel */}
      <div className="flex-1 min-w-0 pt-1">
        {selected ? (
          <div className="space-y-2.5">
            {/* Member header */}
            <div className="flex items-center gap-2">
              <OSAvatar userId={selected.user_id} size="xs" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-white truncate">{selected.name}</span>
                  {/* Risk indicator: red (blocker) → yellow (critical) → green (ok) */}
                  <span className={cn(
                    "w-1.5 h-1.5 rounded-full shrink-0",
                    selected.has_blocker ? "bg-red-500" : selected.has_critical ? "bg-yellow-500" : "bg-green-500"
                  )} />
                </div>
                <p className="text-[10px] text-zinc-600">{selected.done_this_week} done this week</p>
              </div>
            </div>

            {/* Tenant breakdown */}
            <div className="space-y-1.5">
              {selected.tenant_breakdown.map((t) => (
                <div key={t.tenant_id}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[10px] font-medium truncate max-w-[110px]" style={{ color: t.tenant_color }}>
                      {t.tenant_name.replace(/^[^\w\s]*\s*/, "").split(" — ")[0].split(" - ")[0]}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      {t.has_blocker && <AlertTriangle className="w-2.5 h-2.5 text-red-400" strokeWidth={2} />}
                      <span className="text-[10px] text-zinc-500">{t.task_count}</span>
                    </div>
                  </div>
                  <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.round((t.task_count / selected.total_active) * 100)}%`,
                        backgroundColor: t.tenant_color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="flex items-center gap-1 text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              <ArrowLeft className="w-2.5 h-2.5" strokeWidth={2} />
              All members
            </button>
          </div>
        ) : (
          /* Legend */
          <div className="space-y-1.5">
            {pieData.map((entry) => {
              const member = team.find((m) => m.user_id === entry.userId)!
              return (
                <button
                  key={entry.userId}
                  type="button"
                  onClick={() => setSelectedId(entry.userId)}
                  className="w-full flex items-center gap-2 text-left group/leg"
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                  <span className="text-[11px] text-zinc-400 group-hover/leg:text-zinc-200 transition-colors truncate flex-1">
                    {member.name.split(" ")[0]}
                  </span>
                  <span className={cn(
                    "w-1.5 h-1.5 rounded-full shrink-0",
                    member.has_blocker ? "bg-red-500" : member.has_critical ? "bg-yellow-500" : "bg-green-500"
                  )} />
                  <span className="text-[10px] text-zinc-600 shrink-0 tabular-nums">{entry.value}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function OSKPIsPage() {
  const { data, isLoading, error, mutate } = useSWR<KPIPayload>("/api/os/kpis", fetcher, { revalidateOnFocus: false })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-5 h-5 text-zinc-600 animate-spin" strokeWidth={1.75} />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex items-center gap-2.5 px-4 py-3 rounded-lg bg-red-950/40 border border-red-800/40 text-red-400 text-sm">
        <AlertCircle className="w-4 h-4 shrink-0" strokeWidth={1.75} />
        Failed to load KPIs. Please refresh.
      </div>
    )
  }

  const maxVelocity = Math.max(...data.velocity.map((v) => v.completed), 1)
  const totalPipelineRevenue = data.pipeline.reduce((s, p) => s + p.revenue_potential, 0)

  return (
    <div className="space-y-6 max-w-6xl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white font-condensed tracking-tight">KPIs</h1>
          <p className="text-sm text-zinc-500 mt-1">Read-only · as of {fmtTime(data.as_of)}</p>
        </div>
        <button
          type="button"
          onClick={() => mutate()}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.75} />
          Refresh
        </button>
      </div>

      {/* ── Row 1: Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Tasks"
          value={data.ops.total_active}
          sub={`${data.ops.completion_rate}% overall complete`}
          accent="default"
          icon={Layers}
        />
        <StatCard
          label="Blockers"
          value={data.ops.blockers}
          sub={data.ops.blockers > 0 ? `${data.ops.estimated_hours_at_risk}h at risk` : "All clear"}
          accent="red"
          icon={AlertTriangle}
        />
        <StatCard
          label="Overdue"
          value={data.ops.overdue}
          sub={data.ops.critical_count > 0 ? `${data.ops.critical_count} critical` : "No critical items"}
          accent="red"
          icon={Clock}
        />
        <StatCard
          label="Done This Week"
          value={data.ops.done_this_week}
          sub="tasks completed ≤ 7 days"
          accent="green"
          icon={CheckCircle2}
        />
      </div>

      {/* ── Row 2: Projects + Team ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Completion by Project */}
        <div className="lg:col-span-3 rounded-xl bg-zinc-900 border border-zinc-800 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Layers className="w-3.5 h-3.5 text-zinc-600" strokeWidth={1.75} />
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Completion by Project</span>
          </div>
          {data.by_tenant.length === 0 ? (
            <p className="text-sm text-zinc-600">No project data yet.</p>
          ) : (
            <div className="space-y-3">
              {data.by_tenant.map((t) => (
                <div key={t.tenant_id}>
                    <div className="flex items-center justify-between mb-1">
                    {/* Project names use neutral text; color is reserved for the progress bar */}
                    <span className="text-[11px] font-medium text-zinc-300 truncate max-w-[200px]">
                      {t.tenant_name.replace(/^[^\w\s]*\s*/, "").split(" — ")[0].split(" - ")[0]}
                    </span>
                    <div className="flex items-center gap-3 text-[10px] text-zinc-600 shrink-0">
                      {t.overdue > 0 && <span className="text-red-400">{t.overdue} overdue</span>}
                      {t.blocked > 0 && <span className="text-red-500">{t.blocked} blocked</span>}
                      <span>{t.done}/{t.total} · {t.pct}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${t.pct}%`, backgroundColor: t.tenant_color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Team Load */}
        <div className="lg:col-span-2 rounded-xl bg-zinc-900 border border-zinc-800 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-3.5 h-3.5 text-zinc-600" strokeWidth={1.75} />
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Team Load</span>
          </div>
          <TeamLoadPanel team={data.team} />
        </div>
      </div>

      {/* ── Row 3: Delivery Risk + Pipeline/Priority ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Delivery Risk */}
        <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-3.5 h-3.5 text-zinc-600" strokeWidth={1.75} />
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Delivery Risk</span>
            {data.overdue_detail.length > 0 && (
              <span className="ml-auto text-[10px] text-red-400 font-medium">{data.overdue_detail.length} overdue</span>
            )}
          </div>
          {data.overdue_detail.length === 0 ? (
            <div className="flex items-center gap-2 py-3 text-sm text-emerald-500">
              <CheckCircle2 className="w-4 h-4" strokeWidth={1.75} />
              No overdue tasks — delivery on track.
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {data.overdue_detail.map((t) => (
                <Link
                  key={t.id}
                  href={`/os/tasks/${t.id}`}
                  className="flex items-start gap-2.5 p-2.5 rounded-lg bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/50 hover:border-zinc-600 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-zinc-300 group-hover:text-white truncate leading-snug">{t.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {/* Small color dot + neutral text for project name */}
                      <span className="flex items-center gap-1.5 text-[10px] font-medium text-zinc-500">
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: t.tenant_color }}
                        />
                        {t.tenant_name.replace(/^[^\w\s]*\s*/, "").split(" — ")[0].split(" - ")[0]}
                      </span>
                      <OSPriorityBadge priority={t.priority} />
                    </div>
                  </div>
                  {/* Late indicator — always red (street light: overdue = stop) */}
                  <span className="text-[10px] font-medium shrink-0 mt-0.5 text-red-400">
                    {t.days_overdue}d late
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Pipeline or Priority Mix */}
        <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-5">
          {data.pipeline.length > 0 ? (
            <>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-3.5 h-3.5 text-zinc-600" strokeWidth={1.75} />
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Pipeline</span>
                {totalPipelineRevenue > 0 && (
                  <span className="ml-auto text-[10px] text-zinc-500">
                    ${totalPipelineRevenue.toLocaleString()} total potential
                  </span>
                )}
              </div>
              <div className="space-y-3">
                {data.pipeline.map((p) => {
                  const stageColor: Record<string, string> = {
                    NEW: "#71717A", CONTACTED: "#0EA5E9", QUALIFIED: "#F59E0B",
                    QUOTED: "#8B5CF6", WON: "#10B981", LOST: "#EF4444",
                  }
                  const color = stageColor[p.stage] ?? "#71717A"
                  return (
                    <div key={p.stage} className="flex items-center gap-3">
                      <span className="text-[10px] font-semibold w-20 shrink-0" style={{ color }}>{p.stage}</span>
                      <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${Math.min((p.count / (data.pipeline.reduce((s, x) => s + x.count, 0))) * 100, 100)}%`, backgroundColor: color }}
                        />
                      </div>
                      <span className="text-[10px] text-zinc-500 w-8 text-right shrink-0">{p.count}</span>
                      {p.revenue_potential > 0 && (
                        <span className="text-[10px] text-zinc-600 shrink-0">${(p.revenue_potential / 1000).toFixed(0)}k</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-3.5 h-3.5 text-zinc-600" strokeWidth={1.75} />
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Priority Mix</span>
              </div>
              {(() => {
                // Street light: critical=red, high=red, medium=yellow, low=green
                const priorities = [
                  { label: "Critical", key: "critical" as const, color: "#F87171" }, // red-400
                  { label: "High",     key: "high"     as const, color: "#F87171" }, // red-400
                  { label: "Medium",   key: "medium"   as const, color: "#FACC15" }, // yellow-400
                  { label: "Low",      key: "low"      as const, color: "#4ADE80" }, // green-400
                ]
                const total = data.ops.total_active || 1
                return (
                  <div className="space-y-3">
                    {priorities.map((p) => {
                      const count = data.priority_mix[p.key]
                      const pct = Math.round((count / total) * 100)
                      return (
                        <div key={p.key} className="flex items-center gap-3">
                          <span className="text-[10px] font-semibold w-14 shrink-0" style={{ color: p.color }}>{p.label}</span>
                          <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${pct}%`, backgroundColor: p.color }}
                            />
                          </div>
                          <span className="text-[10px] text-zinc-500 w-10 text-right shrink-0">{count} ({pct}%)</span>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </>
          )}
        </div>
      </div>

      {/* ── Row 4: 14-Day Velocity ── */}
      <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-5">
        <div className="flex items-center gap-2 mb-5">
          <TrendingUp className="w-3.5 h-3.5 text-zinc-600" strokeWidth={1.75} />
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">14-Day Velocity</span>
          <span className="ml-auto text-[10px] text-zinc-600">tasks completed per day</span>
        </div>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={data.velocity} barSize={16} margin={{ top: 4, right: 0, left: -24, bottom: 0 }}>
            <XAxis
              dataKey="label"
              tick={{ fill: "#52525B", fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              interval={1}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: "#52525B", fontSize: 9 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<VelocityTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
            <Bar dataKey="completed" radius={[3, 3, 0, 0]}>
              {data.velocity.map((entry) => (
                <Cell
                  key={entry.date}
                  fill={entry.completed === 0 ? "#27272A" : entry.completed === maxVelocity ? "#4ADE80" : "#3F3F46"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

    </div>
  )
}
