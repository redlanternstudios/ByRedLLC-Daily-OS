import Link from "next/link"
import {
  FolderKanban,
  CheckSquare,
  AlertTriangle,
  Clock,
  TrendingUp,
  ArrowRight,
  Users,
} from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth"
import { getTasks, getBlockedTasks, getRecentTasks } from "@/lib/data/tasks"
import { OSStatusBadge, OSPriorityBadge } from "@/components/byred/os/os-badge"
import { OSAvatar } from "@/components/byred/os/os-avatar"
import { cn } from "@/lib/utils"
import type { Task } from "@/types/db"

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
  href,
}: {
  label: string
  value: number | string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  accent: string
  href: string
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 p-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors group"
    >
      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", accent)}>
        <Icon className="w-5 h-5" strokeWidth={1.75} />
      </div>
      <div>
        <p className="text-2xl font-bold text-white font-condensed leading-none">{value}</p>
        <p className="text-xs text-zinc-500 mt-0.5">{label}</p>
      </div>
      <ArrowRight className="w-4 h-4 text-zinc-700 ml-auto group-hover:text-zinc-400 transition-colors" strokeWidth={1.75} />
    </Link>
  )
}

export default async function OSDashboardPage() {
  const user = await requireAuth()
  const supabase = await createClient()

  // Load tasks + team members in parallel
  const [allTasks, blockedTasks, recentTasks, teamData] = await Promise.all([
    getTasks(),
    getBlockedTasks(),
    getRecentTasks(8),
    supabase
      .from("byred_users")
      .select("id, name, role, avatar_url")
      .eq("active", true)
      .order("name"),
  ])

  const team = teamData.data ?? []

  // Derive stats from real tasks
  const inProgressTasks = allTasks.filter((t) => t.status === "in_progress")
  const criticalTasks = allTasks.filter(
    (t) => t.priority === "critical" && t.status !== "done" && t.status !== "cancelled"
  )

  // Group tasks by tenant as a proxy for "projects"
  const tasksByTenant = allTasks.reduce<Record<string, Task[]>>((acc, t) => {
    if (!acc[t.tenant_id]) acc[t.tenant_id] = []
    acc[t.tenant_id].push(t)
    return acc
  }, {})

  const tenantGroups = Object.entries(tasksByTenant).map(([tenantId, tasks]) => {
    const tenant = user.tenants.find((t) => t.id === tenantId)
    const done = tasks.filter((t) => t.status === "done").length
    return {
      tenantId,
      name: tenant?.name ?? tenantId,
      color: tenant?.color ?? "#D7261E",
      total: tasks.length,
      done,
      pct: tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0,
      criticalCount: tasks.filter((t) => t.priority === "critical").length,
    }
  }).sort((a, b) => b.total - a.total)

  // Team task counts
  const taskCountByOwner = allTasks.reduce<Record<string, number>>((acc, t) => {
    if (t.owner_user_id) {
      acc[t.owner_user_id] = (acc[t.owner_user_id] ?? 0) + 1
    }
    return acc
  }, {})

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white font-condensed tracking-tight">
          Operations Dashboard
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long", month: "long", day: "numeric", year: "numeric",
          })}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <StatCard
          label="Active Projects"
          value={tenantGroups.length}
          icon={FolderKanban}
          accent="bg-violet-900/50 text-violet-300"
          href="/os/projects"
        />
        <StatCard
          label="In Progress"
          value={inProgressTasks.length}
          icon={TrendingUp}
          accent="bg-sky-900/50 text-sky-300"
          href="/os/tasks"
        />
        <StatCard
          label="Blocked"
          value={blockedTasks.length}
          icon={AlertTriangle}
          accent="bg-red-900/50 text-red-300"
          href="/os/tasks?filter=blocked"
        />
        <StatCard
          label="Critical Tasks"
          value={criticalTasks.length}
          icon={Clock}
          accent="bg-red-900/50 text-red-300"
          href="/os/tasks?filter=critical"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Tenant workload breakdown */}
        <div className="xl:col-span-2 rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <FolderKanban className="w-4 h-4 text-zinc-400" strokeWidth={1.75} />
              <span className="text-sm font-medium text-white">Active Work</span>
            </div>
            <Link
              href="/os/tasks"
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1"
            >
              All tasks <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {tenantGroups.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-zinc-600">No tasks found.</p>
              <p className="text-xs text-zinc-700 mt-1">Create your first task to get started.</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/60">
              {tenantGroups.map((group) => (
                <Link
                  key={group.tenantId}
                  href={`/os/tasks`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.03] transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: group.color }}
                      />
                      <p className="text-sm font-medium text-white truncate">{group.name}</p>
                      {group.criticalCount > 0 && (
                        <span className="text-[9px] font-bold text-red-400 bg-red-950 border border-red-800/50 px-1.5 py-0.5 rounded uppercase tracking-wide">
                          {group.criticalCount} critical
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${group.pct}%`, backgroundColor: group.color }}
                        />
                      </div>
                      <span className="text-xs text-zinc-500 shrink-0 tabular-nums">
                        {group.done}/{group.total}
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-zinc-700 shrink-0" strokeWidth={1.75} />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Blockers */}
          <div className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800">
              <AlertTriangle className="w-4 h-4 text-red-400" strokeWidth={1.75} />
              <span className="text-sm font-medium text-white">Blockers</span>
              {blockedTasks.length > 0 && (
                <span className="ml-auto text-[10px] font-bold text-red-400 bg-red-950 border border-red-800 px-1.5 py-0.5 rounded">
                  {blockedTasks.length}
                </span>
              )}
            </div>
            {blockedTasks.length === 0 ? (
              <p className="text-xs text-zinc-600 px-4 py-4">No active blockers.</p>
            ) : (
              <div className="divide-y divide-zinc-800/60">
                {blockedTasks.slice(0, 4).map((task) => (
                  <Link
                    key={task.id}
                    href={`/os/tasks/${task.id}`}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors"
                  >
                    <CheckSquare className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" strokeWidth={1.75} />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-zinc-200 truncate">{task.title}</p>
                      {task.blocker_reason && (
                        <p className="text-[10px] text-zinc-600 truncate mt-0.5">{task.blocker_reason}</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Team */}
          <div className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800">
              <Users className="w-4 h-4 text-zinc-400" strokeWidth={1.75} />
              <span className="text-sm font-medium text-white">Team</span>
            </div>
            <div className="px-4 py-3 space-y-2.5">
              {team.slice(0, 5).map((member) => (
                <div key={member.id} className="flex items-center gap-2.5">
                  <OSAvatar name={member.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-zinc-300 truncate">{member.name}</p>
                    <p className="text-[10px] text-zinc-600">
                      {taskCountByOwner[member.id] ?? 0} tasks
                    </p>
                  </div>
                </div>
              ))}
              {team.length === 0 && (
                <p className="text-xs text-zinc-600 py-2">No team members found.</p>
              )}
            </div>
            <div className="px-4 py-2 border-t border-zinc-800">
              <Link href="/os/team" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
                View team
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Recent tasks */}
      <div className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-zinc-400" strokeWidth={1.75} />
            <span className="text-sm font-medium text-white">Recent Tasks</span>
          </div>
          <Link
            href="/os/tasks"
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1"
          >
            All tasks <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {recentTasks.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm text-zinc-600">No tasks yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/60">
            {recentTasks.map((task) => (
              <Link
                key={task.id}
                href={`/os/tasks/${task.id}`}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.03] transition-colors group"
              >
                <div className="flex-1 min-w-0 flex items-center gap-3">
                  <OSStatusBadge status={task.status ?? "not_started"} />
                  <span className="text-sm text-zinc-200 truncate group-hover:text-white transition-colors">
                    {task.title}
                  </span>
                  {task.blocker_flag && (
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <OSPriorityBadge priority={task.priority ?? "medium"} />
                  {task.due_date && (
                    <span className="text-xs text-zinc-600 tabular-nums">
                      {new Date(task.due_date).toLocaleDateString("en-US", {
                        month: "short", day: "numeric",
                      })}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
