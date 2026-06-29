import Link from "next/link"
import {
  AlertTriangle,
  ArrowRight,
  Brain,
  CheckCircle2,
  CircleDashed,
  Clock3,
  Flame,
  FolderKanban,
  Lightbulb,
  ListChecks,
  ShieldCheck,
  Target,
  UserRoundCheck,
  Users,
  WalletCards,
} from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth"
import { OSAvatar } from "@/components/byred/os/os-avatar"
import { OSPriorityBadge, OSStatusBadge } from "@/components/byred/os/os-badge"
import { MyDashboardTaskActions } from "@/components/byred/os/my-dashboard-task-actions"
import type { ByredTask, OsAgentReceipt } from "@/types/database"

type TeamMember = {
  id: string
  name: string
  role: string
  avatar_url: string | null
}

type FocusProject = {
  title: string
  status: string
  detail: string
  match: RegExp
}

const focusProjects: FocusProject[] = [
  {
    title: "Authentic Hadith",
    status: "App Store live",
    detail: "Keep live-store receipts, release follow-ups, and app proof clean.",
    match: /authentic hadith/i,
  },
  {
    title: "Amina",
    status: "Live web",
    detail: "Track web health, content, and next-feature proof without launch noise.",
    match: /\bamina\b/i,
  },
  {
    title: "BeautyByRed LLC",
    status: "Homira lashing / eyelash business",
    detail: "Keep Homira's beauty operations, lash services, and customer flow visible.",
    match: /beauty\s*by\s*red|beautybyred|lash|eyelash|homira/i,
  },
]

const priorityWeight: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
}

function dateOnly(value: string | null) {
  if (!value) return null
  return value.includes("T") ? value.split("T")[0] : value
}

function isOpen(task: ByredTask) {
  return task.status !== "done" && task.status !== "cancelled"
}

function isOverdue(task: ByredTask, today: string) {
  const due = dateOnly(task.due_date)
  return isOpen(task) && !!due && due < today
}

function isDueToday(task: ByredTask, today: string) {
  return dateOnly(task.due_date) === today
}

function taskScore(task: ByredTask, today: string) {
  let score = 0
  if (task.priority === "critical") score += 80
  if (task.priority === "high") score += 45
  if (task.blocker_flag || task.status === "blocked") score += 35
  if (isOverdue(task, today)) score += 30
  if (isDueToday(task, today)) score += 22
  score += task.revenue_impact_score ?? 0
  score += task.urgency_score ?? 0
  return score
}

function sortForAction(today: string) {
  return (a: ByredTask, b: ByredTask) => {
    const scoreDiff = taskScore(b, today) - taskScore(a, today)
    if (scoreDiff !== 0) return scoreDiff
    const priorityDiff = (priorityWeight[a.priority] ?? 2) - (priorityWeight[b.priority] ?? 2)
    if (priorityDiff !== 0) return priorityDiff
    return (dateOnly(a.due_date) ?? "9999-12-31").localeCompare(dateOnly(b.due_date) ?? "9999-12-31")
  }
}

function formatDue(value: string | null) {
  const due = dateOnly(value)
  if (!due) return "No date"
  return new Date(`${due}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function tenantName(task: ByredTask, tenants: Map<string, { name: string; color?: string | null }>) {
  return tenants.get(task.tenant_id)?.name ?? "Workspace"
}

function isFocusProjectTask(task: ByredTask, tenants: Map<string, { name: string; color?: string | null }>, project: FocusProject) {
  const haystack = `${tenantName(task, tenants)} ${task.title} ${task.description ?? ""}`
  return project.match.test(haystack)
}

function Section({
  title,
  subtitle,
  icon: Icon,
  children,
}: {
  title: string
  subtitle: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  children: React.ReactNode
}) {
  return (
    <section className="rounded-lg bg-[#111318] border border-[#2A2D35] overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#2A2D35] bg-white/[0.02]">
        <Icon className="w-3.5 h-3.5 text-[#D7261E]" strokeWidth={1.75} />
        <div className="min-w-0">
          <h2 className="text-xs font-semibold text-white font-condensed uppercase tracking-wider">{title}</h2>
          <p className="text-[10px] text-[#6B7280] mt-0.5">{subtitle}</p>
        </div>
      </div>
      <div className="p-3">{children}</div>
    </section>
  )
}

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string
  value: number | string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  accent: string
}) {
  return (
    <div className="rounded-lg bg-[#111318] border border-[#2A2D35] p-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold tracking-widest text-[#6B7280] uppercase font-condensed">{label}</p>
        <Icon className={accent} strokeWidth={1.75} />
      </div>
      <p className="mt-3 text-3xl font-bold text-white font-condensed tabular-nums leading-none">{value}</p>
    </div>
  )
}

function CommandCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string
  value: string | number
  detail: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
}) {
  return (
    <div className="rounded-lg border border-[#2A2D35] bg-[#111318] p-4">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-[#D7261E]" strokeWidth={1.75} />
        <p className="text-[10px] font-condensed font-semibold uppercase tracking-widest text-[#6B7280]">
          {label}
        </p>
      </div>
      <p className="text-sm font-semibold leading-snug text-white line-clamp-2">{value}</p>
      <p className="mt-2 text-[11px] leading-relaxed text-[#9CA3AF]">{detail}</p>
    </div>
  )
}

function FocusProjectCard({
  project,
  tasks,
  tenants,
}: {
  project: FocusProject
  tasks: ByredTask[]
  tenants: Map<string, { name: string; color?: string | null }>
}) {
  const blockedCount = tasks.filter((task) => task.blocker_flag || task.status === "blocked").length
  const nextTask = tasks[0]

  return (
    <div className="rounded-lg border border-[#2A2D35] bg-[#111318] p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-condensed font-semibold uppercase tracking-widest text-[#D7261E]">
            {project.status}
          </p>
          <h2 className="mt-1 truncate text-lg font-condensed font-bold uppercase tracking-tight text-white">
            {project.title}
          </h2>
        </div>
        <span className="rounded-full border border-[#2A2D35] px-2 py-1 text-[10px] font-semibold text-[#9CA3AF]">
          {tasks.length} open
        </span>
      </div>
      <p className="min-h-10 text-xs leading-relaxed text-[#9CA3AF]">{project.detail}</p>
      <div className="mt-4 rounded-md border border-[#2A2D35]/70 bg-[#0D0D0F] p-3">
        <div className="flex items-center justify-between gap-3 text-[10px] uppercase tracking-wider text-[#6B7280]">
          <span>Current signal</span>
          <span>{blockedCount} blocked</span>
        </div>
        {nextTask ? (
          <Link href={`/os/tasks/${nextTask.id}`} className="mt-2 block text-xs font-medium leading-snug text-white line-clamp-2 hover:text-red-200">
            {nextTask.title}
            <span className="ml-2 text-[10px] font-normal text-[#6B7280]">
              {tenantName(nextTask, tenants)} / {formatDue(nextTask.due_date)}
            </span>
          </Link>
        ) : (
          <p className="mt-2 text-xs text-green-300">No open task pressure showing.</p>
        )}
      </div>
    </div>
  )
}

function SignalStrip({
  label,
  value,
  detail,
}: {
  label: string
  value: string | number
  detail: string
}) {
  return (
    <div className="rounded-lg border border-[#2A2D35]/80 bg-[#0D0D0F] px-4 py-3">
      <p className="text-[10px] font-condensed font-semibold uppercase tracking-widest text-[#6B7280]">{label}</p>
      <p className="mt-2 text-xl font-condensed font-bold uppercase leading-none text-white">{value}</p>
      <p className="mt-1 text-[11px] leading-relaxed text-[#9CA3AF]">{detail}</p>
    </div>
  )
}

function EmptyState({ label }: { label: string }) {
  return <p className="px-2 py-6 text-center text-xs text-[#6B7280]">{label}</p>
}

function TaskRow({
  task,
  owner,
  tenants,
  compact = false,
  showActions = true,
}: {
  task: ByredTask
  owner?: TeamMember | null
  tenants: Map<string, { name: string; color?: string | null }>
  compact?: boolean
  showActions?: boolean
}) {
  const color = tenants.get(task.tenant_id)?.color ?? "#D7261E"

  return (
    <div className="rounded-md border border-[#2A2D35]/70 bg-[#0D0D0F] px-3 py-3 transition-colors hover:border-[#3A3D46] hover:bg-[#151820]">
      <div className="flex items-start gap-3">
        <span className="mt-1 h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <Link href={`/os/tasks/${task.id}`} className="text-xs font-medium text-white leading-snug line-clamp-2 hover:text-red-200">
              {task.title}
            </Link>
            <Link href={`/os/tasks/${task.id}`} aria-label="Open task">
              <ArrowRight className="w-3.5 h-3.5 text-[#6B7280] shrink-0 mt-0.5 hover:text-white" strokeWidth={1.75} />
            </Link>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] text-[#9CA3AF]">{tenantName(task, tenants)}</span>
            <span className="text-[10px] text-[#3F3F46]">/</span>
            <span className="text-[10px] text-[#6B7280]">{formatDue(task.due_date)}</span>
            <OSPriorityBadge priority={task.priority} className="text-[9px] py-0 px-1.5" />
            <OSStatusBadge status={task.status} className="text-[9px] py-0 px-1.5" />
            {owner && (
              <span className="inline-flex items-center gap-1 text-[10px] text-[#9CA3AF]">
                <OSAvatar userId={owner.id} fallbackName={owner.name} size="xs" />
                {owner.name}
              </span>
            )}
          </div>
          {!compact && task.blocker_reason && (
            <p className="mt-2 text-[10px] text-red-400 line-clamp-2">Blocker: {task.blocker_reason}</p>
          )}
          {showActions && (
            <div className="mt-3 border-t border-[#2A2D35]/50 pt-2">
              <MyDashboardTaskActions taskId={task.id} status={task.status} blockerFlag={task.blocker_flag} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default async function MyDashboardPage() {
  const user = await requireAuth()
  const supabase = await createClient()

  const profileId = user.profile?.id ?? null
  const tenantIds = user.tenants.map((tenant) => tenant.id)
  const tenantMap = new Map(user.tenants.map((tenant) => [tenant.id, { name: tenant.name, color: tenant.color }]))
  const today = new Date().toISOString().split("T")[0]

  if (!profileId || tenantIds.length === 0) {
    return (
      <div className="max-w-4xl">
        <EmptyState label="No ByRedLLC profile or workspace access found for this account." />
      </div>
    )
  }

  const [tasksRes, teamRes, receiptsRes] = await Promise.all([
    (supabase as any)
      .from("byred_tasks")
      .select("*")
      .in("tenant_id", tenantIds)
      .not("status", "eq", "cancelled")
      .order("due_date", { ascending: true }) as Promise<{ data: ByredTask[] | null; error: { message: string } | null }>,
    (supabase as any)
      .from("byred_users")
      .select("id, name, role, avatar_url")
      .eq("active", true)
      .order("name") as Promise<{ data: TeamMember[] | null; error: { message: string } | null }>,
    (supabase as any)
      .from("os_agent_receipts")
      .select("*")
      .in("tenant_id", tenantIds)
      .eq("verification_status", "verified")
      .or("agent_family.eq.web_app,framework_scope.eq.mindset_universal")
      .order("created_at", { ascending: false })
      .limit(5) as Promise<{ data: OsAgentReceipt[] | null; error: { message: string } | null }>,
  ])

  const tasks = (tasksRes.data ?? []).filter(isOpen)
  const team = teamRes.data ?? []
  const receipts = receiptsRes.data ?? []
  const teamById = new Map(team.map((member) => [member.id, member]))

  const myTasks = tasks.filter((task) => task.owner_user_id === profileId).sort(sortForAction(today))
  const doFirst = myTasks.slice(0, 3)
  const myBlocked = myTasks.filter((task) => task.blocker_flag || task.status === "blocked")
  const myCritical = myTasks.filter((task) => task.priority === "critical")
  const myHighRevenue = myTasks.filter((task) => (task.revenue_impact_score ?? 0) >= 7)
  const myDueOrOverdue = myTasks.filter((task) => isDueToday(task, today) || isOverdue(task, today))

  const decisionQueueAll = tasks
    .filter((task) =>
      task.owner_user_id === profileId
      || task.blocker_flag
      || task.status === "blocked"
      || task.priority === "critical"
    )
    .sort(sortForAction(today))
  const decisionQueue = decisionQueueAll.slice(0, 4)

  const teamWatchlistAll = tasks
    .filter((task) =>
      task.owner_user_id !== profileId
      && !!task.owner_user_id
      && (task.blocker_flag || task.status === "blocked" || task.priority === "critical" || isOverdue(task, today))
    )
    .sort(sortForAction(today))
  const teamWatchlist = teamWatchlistAll.slice(0, 5)

  const unassignedAll = tasks
    .filter((task) => !task.owner_user_id)
    .sort(sortForAction(today))
  const unassigned = unassignedAll.slice(0, 4)

  const focusProjectCards = focusProjects.map((project) => ({
    project,
    tasks: tasks.filter((task) => isFocusProjectTask(task, tenantMap, project)).sort(sortForAction(today)),
  }))

  const projectLanes = Array.from(
    myTasks.reduce((map, task) => {
      const list = map.get(task.tenant_id) ?? []
      list.push(task)
      map.set(task.tenant_id, list)
      return map
    }, new Map<string, ByredTask[]>())
  ).sort((a, b) => b[1].length - a[1].length).slice(0, 4)

  const primaryMove = doFirst[0]
  const proofRule = receipts[0]
  const visibleTaskRows = doFirst.length + decisionQueue.length + teamWatchlist.length + unassigned.length + projectLanes.reduce((count, [, laneTasks]) => count + Math.min(laneTasks.length, 2), 0)

  return (
    <div className="max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 border-b border-white/[0.06] pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[10px] font-condensed font-semibold tracking-widest text-[#D7261E]/70 uppercase mb-1">
            ByRedLLC PM Command
          </p>
          <h1 className="text-3xl font-bold text-white font-condensed tracking-tight uppercase">
            My Dashboard
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[#9CA3AF]">
            Your personal lane for active projects, proof-backed PM decisions, and the few tasks that need attention now.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#6B7280]">
          <ShieldCheck className="w-4 h-4 text-[#D7261E]" strokeWidth={1.75} />
          Verified receipts + universal mindset only
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        {focusProjectCards.map(({ project, tasks: projectTasks }) => (
          <FocusProjectCard key={project.title} project={project} tasks={projectTasks} tenants={tenantMap} />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <SignalStrip label="Visible task load" value={visibleTaskRows} detail="Dashboard rows shown after priority trimming." />
        <SignalStrip label="Hidden for calm" value={Math.max(tasks.length - visibleTaskRows, 0)} detail="Still searchable in Tasks, not dumped here." />
        <SignalStrip label="Active focus" value="3 projects" detail="Authentic Hadith, Amina, and BeautyByRed LLC." />
        <SignalStrip label="Proof trail" value={receipts.length} detail="Verified receipts available for agent learning." />
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <StatCard label="My Open" value={myTasks.length} icon={UserRoundCheck} accent="w-4 h-4 text-sky-300" />
        <StatCard label="Due / Overdue" value={myDueOrOverdue.length} icon={Clock3} accent="w-4 h-4 text-yellow-300" />
        <StatCard label="Blocked" value={myBlocked.length} icon={AlertTriangle} accent="w-4 h-4 text-red-400" />
        <StatCard label="Critical" value={myCritical.length} icon={Flame} accent="w-4 h-4 text-[#D7261E]" />
        <StatCard label="Money Impact" value={myHighRevenue.length} icon={WalletCards} accent="w-4 h-4 text-green-300" />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
        <CommandCard
          label="Primary Move"
          value={primaryMove?.title ?? "No KP-owned task is currently demanding first move."}
          detail={primaryMove ? `${tenantName(primaryMove, tenantMap)} / due ${formatDue(primaryMove.due_date)}` : "Keep the lane clean and review team risk."}
          icon={Target}
        />
        <CommandCard
          label="Clearance Pressure"
          value={`${myDueOrOverdue.length} due or overdue`}
          detail="Work these before opening new lanes unless a blocker or money task outranks them."
          icon={ListChecks}
        />
        <CommandCard
          label="Decision Pressure"
          value={`${decisionQueueAll.length} items need PM attention`}
          detail="Use this to separate your decision work from normal execution work."
          icon={Lightbulb}
        />
        <CommandCard
          label="Learning Guardrail"
          value={proofRule ? "Verified receipt available" : "No verified receipt yet"}
          detail="Agents can reuse only verified web-app receipts and universal mindset lessons."
          icon={ShieldCheck}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <Section title="Do First" subtitle="Highest leverage KP-owned tasks; clear only when proof exists" icon={CheckCircle2}>
            <div className="space-y-2">
              {doFirst.length > 0 ? (
                doFirst.map((task) => (
                  <TaskRow key={task.id} task={task} owner={teamById.get(task.owner_user_id ?? "")} tenants={tenantMap} />
                ))
              ) : (
                <EmptyState label="No KP-owned open tasks found." />
              )}
            </div>
          </Section>

          <Section title="Project Lanes" subtitle="KP-owned work grouped by workspace" icon={FolderKanban}>
            {projectLanes.length > 0 ? (
              <div className="space-y-3">
                {projectLanes.map(([tenantId, laneTasks]) => (
                  <div key={tenantId} className="rounded-md border border-[#2A2D35]/70 bg-[#0D0D0F] p-3">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: tenantMap.get(tenantId)?.color ?? "#D7261E" }}
                        />
                        <h3 className="truncate text-sm font-semibold text-white">{tenantMap.get(tenantId)?.name ?? tenantId}</h3>
                      </div>
                      <span className="text-[10px] text-[#6B7280]">{laneTasks.length} open</span>
                    </div>
                    <div className="space-y-2">
                      {laneTasks.slice(0, 2).map((task) => (
                        <TaskRow key={task.id} task={task} owner={teamById.get(task.owner_user_id ?? "")} tenants={tenantMap} compact showActions={false} />
                      ))}
                      {laneTasks.length > 2 && (
                        <Link href="/os/tasks" className="block rounded-md border border-[#2A2D35]/60 px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF] hover:border-[#3A3D46] hover:text-white">
                          View {laneTasks.length - 2} more in Tasks
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState label="No project lanes yet." />
            )}
          </Section>
        </div>

        <div className="space-y-5">
          <Section title="Decision Queue" subtitle={`${decisionQueueAll.length} total; showing the top ${decisionQueue.length}`} icon={Lightbulb}>
            <div className="space-y-2">
              {decisionQueue.length > 0 ? (
                decisionQueue.map((task) => (
                  <TaskRow key={task.id} task={task} owner={teamById.get(task.owner_user_id ?? "")} tenants={tenantMap} compact />
                ))
              ) : (
                <EmptyState label="No decision pressure showing right now." />
              )}
            </div>
          </Section>

          <Section title="Agent Learning" subtitle="Verified OS receipts plus universal mindset" icon={Brain}>
            {receipts.length > 0 ? (
              <div className="space-y-2">
                {receipts.map((receipt) => (
                  <div key={receipt.id} className="rounded-md border border-[#2A2D35]/70 bg-[#0D0D0F] p-3">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#D7261E]">
                        {receipt.agent_family} / {receipt.framework_scope}
                      </span>
                      <span className="text-[9px] text-green-400 uppercase">{receipt.verification_status}</span>
                    </div>
                    <p className="text-xs font-medium text-white line-clamp-2">{receipt.summary}</p>
                    <p className="mt-1 text-[11px] text-[#9CA3AF] line-clamp-3">{receipt.lesson}</p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState label="No verified OS receipts yet." />
            )}
          </Section>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Section title="Team Watchlist" subtitle={`${teamWatchlistAll.length} total risks; showing the top ${teamWatchlist.length}`} icon={Users}>
          <div className="space-y-2">
            {teamWatchlist.length > 0 ? (
              teamWatchlist.map((task) => (
                <TaskRow key={task.id} task={task} owner={teamById.get(task.owner_user_id ?? "")} tenants={tenantMap} compact showActions={false} />
              ))
            ) : (
              <EmptyState label="No high-risk team tasks found." />
            )}
          </div>
        </Section>

        <Section title="Unassigned Intake" subtitle={`${unassignedAll.length} total; showing the top ${unassigned.length}`} icon={CircleDashed}>
          <div className="space-y-2">
            {unassigned.length > 0 ? (
              unassigned.map((task) => (
                <TaskRow key={task.id} task={task} tenants={tenantMap} compact />
              ))
            ) : (
              <EmptyState label="No unassigned open tasks found." />
            )}
          </div>
        </Section>
      </div>
    </div>
  )
}
