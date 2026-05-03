"use client"

import useSWR from "swr"
import Link from "next/link"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts"
import {
  AlertTriangle, Clock, CheckCircle2, Zap, TrendingUp,
  Loader2, AlertCircle, RefreshCw, Users, Layers,
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
  accent?: "red" | "amber" | "emerald" | "default"
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
}) {
  const ring = accent === "red" && Number(value) > 0 ? "border-red-800/50 bg-red-950/20"
    : accent === "amber" && Number(value) > 0 ? "border-amber-800/40 bg-amber-950/10"
    : accent === "emerald" ? "border-emerald-800/30 bg-emerald-950/10"
    : "border-zinc-800 bg-zinc-900"
  const valColor = accent === "red" && Number(value) > 0 ? "text-red-400"
    : accent === "amber" && Number(value) > 0 ? "text-amber-400"
    : accent === "emerald" ? "text-emerald-400"
    : "text-white"
  const iconColor = accent === "red" && Number(value) > 0 ? "text-red-500"
    : accent === "amber" && Number(value) > 0 ? "text-amber-500"
    : accent === "emerald" ? "text-emerald-500"
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
      <p className="text-emerald-400">{payload[0].value} completed</p>
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
          accent="amber"
          icon={Clock}
        />
        <StatCard
          label="Done This Week"
          value={data.ops.done_this_week}
          sub="tasks completed ≤ 7 days"
          accent="emerald"
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
                    <span
                      className="text-[11px] font-medium truncate max-w-[200px]"
                      style={{ color: t.tenant_color }}
                    >
                      {t.tenant_name.replace(/^[^\w\s]*\s*/, "").split(" — ")[0].split(" - ")[0]}
                    </span>
                    <div className="flex items-center gap-3 text-[10px] text-zinc-600 shrink-0">
                      {t.overdue > 0 && <span className="text-amber-500">{t.overdue} overdue</span>}
                      {t.blocked > 0 && <span className="text-red-400">{t.blocked} blocked</span>}
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
          {data.team.length === 0 ? (
            <p className="text-sm text-zinc-600">No team data yet.</p>
          ) : (
            <div className="space-y-3">
              {data.team.map((m) => {
                const statusColor = m.has_blocker ? "bg-red-500" : m.has_critical ? "bg-amber-500" : "bg-emerald-500"
                const statusLabel = m.has_blocker ? "Blocked" : m.has_critical ? "Critical" : "On track"
                return (
                  <div key={m.user_id} className="flex items-center gap-3">
                    <OSAvatar userId={m.user_id} size="xs" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-zinc-300 font-medium truncate">{m.name}</span>
                        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", statusColor)} title={statusLabel} />
                      </div>
                      <p className="text-[10px] text-zinc-600">{m.total_active} active · {m.done_this_week} done this week</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
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
              <span className="ml-auto text-[10px] text-amber-500 font-medium">{data.overdue_detail.length} overdue</span>
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
                      <span
                        className="text-[10px] font-medium"
                        style={{ color: t.tenant_color }}
                      >
                        {t.tenant_name.replace(/^[^\w\s]*\s*/, "").split(" — ")[0].split(" - ")[0]}
                      </span>
                      <OSPriorityBadge priority={t.priority} />
                    </div>
                  </div>
                  <span className={cn(
                    "text-[10px] font-medium shrink-0 mt-0.5",
                    t.days_overdue > 7 ? "text-red-400" : "text-amber-400"
                  )}>
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
                const priorities = [
                  { label: "Critical", key: "critical" as const, color: "#EF4444" },
                  { label: "High",     key: "high"     as const, color: "#F97316" },
                  { label: "Medium",   key: "medium"   as const, color: "#F59E0B" },
                  { label: "Low",      key: "low"      as const, color: "#71717A" },
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
                  fill={entry.completed === 0 ? "#27272A" : entry.completed === maxVelocity ? "#10B981" : "#3F3F46"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

    </div>
  )
}
