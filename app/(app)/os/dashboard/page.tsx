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
      className="flex min-h-24 items-center gap-4 rounded-lg border border-[#2A2D35] bg-[#111318] p-4 transition-colors hover:border-[#3A3D46] hover:bg-[#1A1D24] group"
    >
      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", accent)}>
        <Icon className="w-5 h-5" strokeWidth={1.75} />
      </div>
      <div className="min-w-0">
        <p className="text-3xl font-bold text-[#D7261E] leading-none tabular-nums">{value}</p>
        <p className="mt-1 text-sm font-medium leading-snug text-[#9CA3AF]">{label}</p>
      </div>
      <ArrowRight className="w-4 h-4 text-[#6B7280] ml-auto group-hover:text-[#D7261E] transition-colors" strokeWidth={1.75} />
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
    (supabase as any)
      .from("byred_users")
      .select("id, name, role, avatar_url")
      .eq("active", true)
      .order("name"),
  ])

  type TeamMember = { id: string; name: string; role: string; avatar_url: string | null }
  const team = (teamData.data ?? []) as TeamMember[]

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
      <div className="flex flex-col gap-3 border-b border-white/[0.06] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="mb-1 text-sm font-medium leading-snug text-[#9CA3AF]">
            By Red, LLC. — Internal Operations
          </p>
          <h1 className="text-2xl font-bold leading-tight text-white">
            Command Center
          </h1>
        </div>
        <p className="shrink-0 text-sm leading-snug text-[#6B7280] tabular-nums">
          {new Date().toLocaleDateString("en-US", {
            weekday: "short", month: "short", day: "numeric", year: "numeric",
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
        <div className="xl:col-span-2 rounded-lg bg-[#111318] border border-[#2A2D35] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#2A2D35] bg-[#1A1D24]/40">
            <div className="flex items-center gap-2">
              <FolderKanban className="w-3.5 h-3.5 text-[#D7261E]" strokeWidth={1.75} />
              <span className="text-sm font-semibold leading-snug text-white">Active Work</span>
            </div>
            <Link
              href="/os/tasks"
              className="flex items-center gap-1 text-sm leading-snug text-[#6B7280] transition-colors hover:text-[#9CA3AF]"
            >
              All tasks <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {tenantGroups.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-[#6B7280]">No tasks found.</p>
              <p className="text-xs text-[#6B7280] mt-1">Create your first task to get started.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#2A2D35]/40">
              {tenantGroups.map((group) => (
                <Link
                  key={group.tenantId}
                  href={`/os/tasks`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.03] transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="mb-2 flex min-w-0 flex-wrap items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: group.color }}
                      />
                      <p className="min-w-0 flex-1 truncate text-base font-semibold leading-snug text-white">{group.name}</p>
                      {group.criticalCount > 0 && (
                        <span className="shrink-0 rounded border border-red-800/50 bg-red-950 px-2 py-0.5 text-xs font-semibold leading-none text-red-400">
                          {group.criticalCount} critical
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-1 bg-[#2A2D35] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${group.pct}%`, backgroundColor: group.color }}
                        />
                      </div>
                      <span className="shrink-0 text-sm text-[#9CA3AF] tabular-nums">
                        {group.done}/{group.total}
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#6B7280] shrink-0" strokeWidth={1.75} />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Blockers */}
          <div className="rounded-lg bg-[#111318] border border-[#2A2D35] overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[#2A2D35] bg-white/[0.02]">
              <AlertTriangle className="w-3.5 h-3.5 text-[#D7261E]" strokeWidth={1.75} />
              <span className="text-sm font-semibold leading-snug text-white">Blockers</span>
              {blockedTasks.length > 0 && (
                <span className="ml-auto rounded border border-[#D7261E]/30 bg-[#D7261E]/10 px-2 py-0.5 text-xs font-bold leading-none text-[#D7261E]">
                  {blockedTasks.length}
                </span>
              )}
            </div>
            {blockedTasks.length === 0 ? (
              <p className="px-4 py-4 text-sm text-[#6B7280]">No active blockers.</p>
            ) : (
              <div className="divide-y divide-[#2A2D35]/40">
                {blockedTasks.slice(0, 4).map((task) => (
                  <Link
                    key={task.id}
                    href={`/os/tasks/${task.id}`}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors"
                  >
                    <CheckSquare className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" strokeWidth={1.75} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium leading-snug text-white">{task.title}</p>
                      {task.blocker_reason && (
                        <p className="mt-0.5 truncate text-xs leading-snug text-[#6B7280]">{task.blocker_reason}</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Team */}
          <div className="rounded-lg bg-[#111318] border border-[#2A2D35] overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[#2A2D35] bg-white/[0.02]">
              <Users className="w-3.5 h-3.5 text-[#D7261E]" strokeWidth={1.75} />
              <span className="text-sm font-semibold leading-snug text-white">Team</span>
            </div>
            <div className="px-4 py-3 space-y-2.5">
              {team.slice(0, 5).map((member) => (
                <div key={member.id} className="flex items-center gap-2.5">
                  <OSAvatar name={member.name} avatarUrl={member.avatar_url} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium leading-snug text-[#9CA3AF]">{member.name}</p>
                    <p className="text-xs leading-snug text-[#6B7280]">
                      {taskCountByOwner[member.id] ?? 0} tasks
                    </p>
                  </div>
                </div>
              ))}
              {team.length === 0 && (
                <p className="py-2 text-sm text-[#6B7280]">No team members found.</p>
              )}
            </div>
            <div className="px-4 py-2 border-t border-[#2A2D35]">
              <Link href="/os/team" className="text-sm text-[#9CA3AF] transition-colors hover:text-white">
                View team
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Recent tasks */}
      <div className="rounded-lg bg-[#111318] border border-[#2A2D35] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#2A2D35] bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-3.5 h-3.5 text-[#D7261E]" strokeWidth={1.75} />
            <span className="text-sm font-semibold leading-snug text-white">Recent Tasks</span>
          </div>
          <Link
            href="/os/tasks"
            className="flex items-center gap-1 text-sm leading-snug text-[#6B7280] transition-colors hover:text-[#9CA3AF]"
          >
            All tasks <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {recentTasks.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm text-[#6B7280]">No tasks yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#2A2D35]/40">
            {recentTasks.map((task) => (
              <Link
                key={task.id}
                href={`/os/tasks/${task.id}`}
                className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-white/[0.03] group"
              >
                <div className="flex-1 min-w-0 flex items-center gap-3">
                  <OSStatusBadge status={task.status ?? "not_started"} taskId={task.id} />
                  <span className="truncate text-sm font-medium leading-snug text-white transition-colors group-hover:text-white">
                    {task.title}
                  </span>
                  {task.blocker_flag && (
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <OSPriorityBadge priority={task.priority ?? "medium"} />
                  {task.due_date && (
                    <span className="text-xs text-[#6B7280] tabular-nums">
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
