import Link from "next/link"
import Image from "next/image"
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
import { ProjectMonthDrilldown, type DashboardProjectSummary, type DashboardProjectTask } from "@/components/byred/os/project-month-drilldown"
import type { ByredTask, OsAgentReceipt } from "@/types/database"

type TeamMember = {
  id: string
  name: string
  role: string
  avatar_url: string | null
}

type FocusProject = {
  title: string
  sector: string
  status: string
  detail: string
  accent: string
  match: RegExp
}

const focusProjects: FocusProject[] = [
  {
    title: "Authentic Hadith",
    sector: "Faith & Mobile App",
    status: "App Store live",
    detail: "Keep live-store receipts, release follow-ups, and app proof clean.",
    accent: "#8B5CF6",
    match: /authentic hadith/i,
  },
  {
    title: "Amina",
    sector: "Web Product",
    status: "Live web",
    detail: "Track web health, content, and next-feature proof without launch noise.",
    accent: "#38BDF8",
    match: /\bamina\b/i,
  },
  {
    title: "BeautyByRed LLC",
    sector: "Beauty Operations",
    status: "Homira lashing / eyelash business",
    detail: "Keep Homira's beauty operations, lash services, and customer flow visible.",
    accent: "#F472B6",
    match: /beauty\s*by\s*red|beautybyred|lash|eyelash/i,
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

function dateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function currentMonthWindow(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1)
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  const label = date.toLocaleDateString("en-US", { month: "long", year: "numeric" })
  return { start: dateKey(start), end: dateKey(end), label }
}

function isDueInRange(task: ByredTask, start: string, end: string) {
  const due = dateOnly(task.due_date)
  return !!due && due >= start && due <= end
}

function tenantName(task: ByredTask, tenants: Map<string, { name: string; color?: string | null }>) {
  return tenants.get(task.tenant_id)?.name ?? "Workspace"
}

function isFocusProjectTask(task: ByredTask, tenants: Map<string, { name: string; color?: string | null }>, project: FocusProject) {
  const haystack = `${tenantName(task, tenants)} ${task.title} ${task.description ?? ""}`
  return project.match.test(haystack)
}

function toDashboardProjectTask(
  task: ByredTask,
  tenants: Map<string, { name: string; color?: string | null }>,
  teamById: Map<string, TeamMember>,
): DashboardProjectTask {
  const owner = task.owner_user_id ? teamById.get(task.owner_user_id) : null

  return {
    id: task.id,
    title: task.title,
    status: task.status,
    priority: task.priority,
    dueLabel: formatDue(task.due_date),
    tenantName: tenantName(task, tenants),
    tenantColor: tenants.get(task.tenant_id)?.color ?? "#9A6A12",
    owner: owner
      ? {
          id: owner.id,
          name: owner.name,
          avatarUrl: owner.avatar_url,
        }
      : null,
    blockerReason: task.blocker_reason,
  }
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
    <section className="overflow-hidden rounded-lg border border-[#E3D7BC] bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-[#E8DEC7] bg-[#FBF7ED] px-4 py-3">
        <Icon className="w-3.5 h-3.5 text-[#9A6A12]" strokeWidth={1.75} />
        <div className="min-w-0">
          <h2 className="text-xs font-semibold text-[#171717] font-condensed uppercase tracking-wider">{title}</h2>
          <p className="text-[10px] text-[#6B6254] mt-0.5">{subtitle}</p>
        </div>
      </div>
      <div className="p-3">{children}</div>
    </section>
  )
}

function DashboardSectionHeader({
  eyebrow,
  title,
  detail,
}: {
  eyebrow: string
  title: string
  detail: string
}) {
  return (
    <div className="flex flex-col gap-1 border-l-2 border-[#B8891A] pl-3">
      <p className="text-[10px] font-condensed font-semibold uppercase tracking-widest text-[#8A610F]">{eyebrow}</p>
      <h2 className="text-base font-condensed font-bold uppercase tracking-tight text-[#171717]">{title}</h2>
      <p className="max-w-3xl text-xs leading-relaxed text-[#5F5A51]">{detail}</p>
    </div>
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
    <div className="rounded-lg border border-[#E3D7BC] bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold tracking-widest text-[#6B6254] uppercase font-condensed">{label}</p>
        <Icon className={accent} strokeWidth={1.75} />
      </div>
      <p className="mt-3 text-3xl font-bold text-[#171717] font-condensed tabular-nums leading-none">{value}</p>
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
    <div className="rounded-lg border border-[#E3D7BC] bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-[#9A6A12]" strokeWidth={1.75} />
        <p className="text-[10px] font-condensed font-semibold uppercase tracking-widest text-[#6B6254]">
          {label}
        </p>
      </div>
      <p className="text-sm font-semibold leading-snug text-[#171717] line-clamp-2">{value}</p>
      <p className="mt-2 text-[11px] leading-relaxed text-[#5F5A51]">{detail}</p>
    </div>
  )
}

function OperatingOrderCard({
  label,
  task,
  fallback,
  detail,
  icon: Icon,
  tone = "default",
  tenants,
}: {
  label: string
  task?: ByredTask | null
  fallback: string
  detail: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  tone?: "default" | "danger" | "proof"
  tenants: Map<string, { name: string; color?: string | null }>
}) {
  const content = task ? (
    <Link href={`/os/tasks/${task.id}`} className="block text-sm font-semibold leading-snug text-[#171717] line-clamp-2 hover:text-[#8A610F]">
      {task.title}
    </Link>
  ) : (
    <p className="text-sm font-semibold leading-snug text-[#171717] line-clamp-2">{fallback}</p>
  )

  return (
    <div className="rounded-lg border border-[#E3D7BC] bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon
            className={
              tone === "danger"
                ? "h-4 w-4 text-amber-600"
                : tone === "proof"
                  ? "h-4 w-4 text-[#171717]"
                  : "h-4 w-4 text-[#9A6A12]"
            }
            strokeWidth={1.75}
          />
          <p className="text-[10px] font-condensed font-semibold uppercase tracking-widest text-[#6B6254]">{label}</p>
        </div>
        {task && <ArrowRight className="h-3.5 w-3.5 text-[#8A610F]" strokeWidth={1.75} />}
      </div>
      <div className="min-h-10">{content}</div>
      <p className="mt-2 text-[11px] leading-relaxed text-[#5F5A51]">
        {task ? `${tenantName(task, tenants)} / ${formatDue(task.due_date)}` : detail}
      </p>
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
    <div className="rounded-lg border border-[#E3D7BC] bg-white px-4 py-3 shadow-sm">
      <p className="text-[10px] font-condensed font-semibold uppercase tracking-widest text-[#6B6254]">{label}</p>
      <p className="mt-2 text-xl font-condensed font-bold uppercase leading-none text-[#171717]">{value}</p>
      <p className="mt-1 text-[11px] leading-relaxed text-[#5F5A51]">{detail}</p>
    </div>
  )
}

function EmptyState({ label }: { label: string }) {
  return <p className="px-2 py-6 text-center text-xs text-[#6B6254]">{label}</p>
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
  const color = tenants.get(task.tenant_id)?.color ?? "#9A6A12"

  return (
    <div className="rounded-md border border-[#E8DEC7] bg-[#FCFAF5] px-3 py-3 transition-colors hover:border-[#C8A951] hover:bg-white">
      <div className="flex items-start gap-3">
        <span className="mt-1 h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <Link href={`/os/tasks/${task.id}`} className="text-xs font-medium text-[#171717] leading-snug line-clamp-2 hover:text-[#8A610F]">
              {task.title}
            </Link>
            <Link href={`/os/tasks/${task.id}`} aria-label="Open task">
              <ArrowRight className="w-3.5 h-3.5 text-[#8A610F] shrink-0 mt-0.5 hover:text-[#171717]" strokeWidth={1.75} />
            </Link>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] text-[#5F5A51]">{tenantName(task, tenants)}</span>
            <span className="text-[10px] text-[#B8AA8E]">/</span>
            <span className="text-[10px] text-[#6B6254]">{formatDue(task.due_date)}</span>
            <OSPriorityBadge priority={task.priority} className="text-[9px] py-0 px-1.5" />
            <OSStatusBadge status={task.status} className="text-[9px] py-0 px-1.5" />
            {owner && (
              <span className="inline-flex items-center gap-1 text-[10px] text-[#5F5A51]">
                <OSAvatar userId={owner.id} fallbackName={owner.name} size="xs" />
                {owner.name}
              </span>
            )}
          </div>
          {!compact && task.blocker_reason && (
            <p className="mt-2 text-[10px] text-[#8A610F] line-clamp-2">Blocker: {task.blocker_reason}</p>
          )}
          {showActions && (
            <div className="mt-3 border-t border-[#E8DEC7] pt-2">
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
  const now = new Date()
  const today = dateKey(now)
  const monthWindow = currentMonthWindow(now)

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

  const focusProjectCards: DashboardProjectSummary[] = focusProjects.map((project) => {
    const projectTasks = tasks.filter((task) => isFocusProjectTask(task, tenantMap, project)).sort(sortForAction(today))
    const attentionTasks = projectTasks.filter((task) => isOverdue(task, today) || task.blocker_flag || task.status === "blocked")
    const attentionIds = new Set(attentionTasks.map((task) => task.id))
    const monthTasks = projectTasks.filter((task) => !attentionIds.has(task.id) && isDueInRange(task, monthWindow.start, monthWindow.end))
    const unscheduledTasks = projectTasks.filter((task) => !attentionIds.has(task.id) && !dateOnly(task.due_date))
    const blockedCount = projectTasks.filter((task) => task.blocker_flag || task.status === "blocked").length
    const monthCount = projectTasks.filter((task) => isDueInRange(task, monthWindow.start, monthWindow.end)).length

    return {
      id: project.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      title: project.title,
      sector: project.sector,
      status: project.status,
      detail: project.detail,
      accent: project.accent,
      openCount: projectTasks.length,
      blockedCount,
      monthCount,
      attentionTasks: attentionTasks.map((task) => toDashboardProjectTask(task, tenantMap, teamById)),
      monthTasks: monthTasks.map((task) => toDashboardProjectTask(task, tenantMap, teamById)),
      unscheduledTasks: unscheduledTasks.map((task) => toDashboardProjectTask(task, tenantMap, teamById)),
    }
  })

  const projectLanes = Array.from(
    myTasks.reduce((map, task) => {
      const list = map.get(task.tenant_id) ?? []
      list.push(task)
      map.set(task.tenant_id, list)
      return map
    }, new Map<string, ByredTask[]>())
  ).sort((a, b) => b[1].length - a[1].length).slice(0, 4)

  const primaryMove = doFirst[0]
  const nextMove = doFirst[1]
  const delegateMove = teamWatchlist[0] ?? unassigned[0]
  const verifyMove = myBlocked[0] ?? decisionQueue[0]
  const proofRule = receipts[0]
  const visibleTaskRows = doFirst.length + decisionQueue.length + teamWatchlist.length + unassigned.length + projectLanes.reduce((count, [, laneTasks]) => count + Math.min(laneTasks.length, 2), 0)

  return (
    <div className="-m-6 min-h-[calc(100vh-3.5rem)] bg-[#F7F3EA] px-4 py-5 text-[#171717] sm:px-6 lg:px-8">
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="rounded-lg border border-[#E3D7BC] bg-white p-5 shadow-sm lg:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-lg border border-[#D7B85E] bg-[#FBF7ED] p-1.5 shadow-sm sm:h-32 sm:w-32 lg:h-36 lg:w-36">
            <Image
              src="/brand/pe-compass-logo.png"
              alt="Penn Enterprises compass logo"
              width={836}
              height={838}
              className="h-full w-full object-contain drop-shadow-[0_6px_14px_rgba(154,106,18,0.24)]"
              priority
            />
          </div>
          <div className="min-w-0">
          <p className="text-[10px] font-condensed font-semibold tracking-widest text-[#8A610F] uppercase mb-1">
            Daily Workflow
          </p>
          <h1 className="text-3xl font-bold text-[#171717] font-condensed tracking-tight sm:text-4xl">
            Salam Alaikum, Keymon.
          </h1>
          <p className="mt-2 max-w-2xl text-sm font-semibold text-[#2B2925]">
            This is your workflow and the things you need to handle.
          </p>
          <p className="mt-1 max-w-2xl text-sm text-[#5F5A51]">
            Your personal lane for active projects, proof-backed PM decisions, and the few tasks that need attention now.
          </p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-md border border-[#E3D7BC] bg-[#FBF7ED] px-3 py-2 text-xs font-medium text-[#5F5A51]">
          <ShieldCheck className="w-4 h-4 text-[#8A610F]" strokeWidth={1.75} />
          Receipt-gated work only
        </div>
        </div>
      </div>

      <div className="rounded-lg border border-[#D7B85E] bg-[#FBF7ED] p-3 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3 px-1">
          <div>
            <p className="text-[10px] font-condensed font-semibold uppercase tracking-widest text-[#8A610F]">Operating Order</p>
            <h2 className="mt-1 text-lg font-condensed font-bold uppercase tracking-tight text-[#171717]">Run this sequence first</h2>
          </div>
          <span className="rounded-full border border-[#E3D7BC] bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#5F5A51]">
            {today}
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <OperatingOrderCard
            label="Now"
            task={primaryMove}
            fallback="No urgent KP-owned task."
            detail="Review team risk before creating new work."
            icon={Target}
            tenants={tenantMap}
          />
          <OperatingOrderCard
            label="Next"
            task={nextMove}
            fallback="No second move queued."
            detail="The dashboard is clean after the primary move."
            icon={ListChecks}
            tenants={tenantMap}
          />
          <OperatingOrderCard
            label="Delegate"
            task={delegateMove}
            fallback="No delegation pressure."
            detail="No blocked, critical, overdue, or unassigned item is asking for routing."
            icon={Users}
            tone="danger"
            tenants={tenantMap}
          />
          <OperatingOrderCard
            label="Verify"
            task={verifyMove}
            fallback={proofRule ? "Verified receipt trail exists." : "No receipt trail yet."}
            detail={proofRule ? "Keep execution tied to receipts." : "Create a receipt before turning this into reusable truth."}
            icon={ShieldCheck}
            tone="proof"
            tenants={tenantMap}
          />
        </div>
      </div>

      <div className="space-y-3">
        <DashboardSectionHeader
          eyebrow="Dashboard Signals"
          title="What the OS is showing you first"
          detail="A quick read on visible workload, hidden noise, active focus, and proof coverage before you enter the task lists."
        />
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <SignalStrip label="Visible task load" value={visibleTaskRows} detail="Dashboard rows shown after priority trimming." />
          <SignalStrip label="Hidden for calm" value={Math.max(tasks.length - visibleTaskRows, 0)} detail="Still searchable in Tasks, not dumped here." />
          <SignalStrip label="Active focus" value="3 projects" detail="Authentic Hadith, Amina, and BeautyByRed LLC." />
          <SignalStrip label="Proof trail" value={receipts.length} detail="Verified receipts available for agent learning." />
        </div>
      </div>

      <div className="space-y-3">
        <DashboardSectionHeader
          eyebrow="Personal Load"
          title="KP-owned pressure"
          detail="These numbers are your direct operating pressure, separated from broader team and project context."
        />
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
          <StatCard label="My Open" value={myTasks.length} icon={UserRoundCheck} accent="w-4 h-4 text-[#171717]" />
          <StatCard label="Due / Overdue" value={myDueOrOverdue.length} icon={Clock3} accent="w-4 h-4 text-[#8A610F]" />
          <StatCard label="Blocked" value={myBlocked.length} icon={AlertTriangle} accent="w-4 h-4 text-amber-600" />
          <StatCard label="Critical" value={myCritical.length} icon={Flame} accent="w-4 h-4 text-[#9A6A12]" />
          <StatCard label="Money Impact" value={myHighRevenue.length} icon={WalletCards} accent="w-4 h-4 text-[#171717]" />
        </div>
      </div>

      <div className="space-y-3">
        <DashboardSectionHeader
          eyebrow="Project Sectors"
          title="Separate businesses and product lanes"
          detail="Click a project to see the tasks due this month, the work that needs attention, and the backlog that still needs a date."
        />
        <ProjectMonthDrilldown projects={focusProjectCards} monthLabel={monthWindow.label} />
      </div>

      <div className="space-y-3">
        <DashboardSectionHeader
          eyebrow="Command Summary"
          title="What to decide before doing more work"
          detail="This separates the next action, clearance pressure, PM decisions, and learning rules from the task rows below."
        />
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
      </div>

      <div className="space-y-3">
        <DashboardSectionHeader
          eyebrow="Execution Queues"
          title="Task rows separated by purpose"
          detail="Do First is your execution lane, Project Lanes group your owned work, Decision Queue is PM judgment, and Agent Learning is reusable proof."
        />
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
                  <div key={tenantId} className="rounded-md border border-[#E8DEC7] bg-[#FCFAF5] p-3">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: tenantMap.get(tenantId)?.color ?? "#9A6A12" }}
                        />
                        <h3 className="truncate text-sm font-semibold text-[#171717]">{tenantMap.get(tenantId)?.name ?? tenantId}</h3>
                      </div>
                      <span className="text-[10px] text-[#6B6254]">{laneTasks.length} open</span>
                    </div>
                    <div className="space-y-2">
                      {laneTasks.slice(0, 2).map((task) => (
                        <TaskRow key={task.id} task={task} owner={teamById.get(task.owner_user_id ?? "")} tenants={tenantMap} compact showActions={false} />
                      ))}
                      {laneTasks.length > 2 && (
                        <Link href="/os/tasks" className="block rounded-md border border-[#E3D7BC] bg-white px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-[#5F5A51] hover:border-[#C8A951] hover:text-[#171717]">
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
                  <div key={receipt.id} className="rounded-md border border-[#E8DEC7] bg-[#FCFAF5] p-3">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8A610F]">
                        {receipt.agent_family} / {receipt.framework_scope}
                      </span>
                      <span className="text-[9px] text-[#8A610F] uppercase">{receipt.verification_status}</span>
                    </div>
                    <p className="text-xs font-medium text-[#171717] line-clamp-2">{receipt.summary}</p>
                    <p className="mt-1 text-[11px] text-[#5F5A51] line-clamp-3">{receipt.lesson}</p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState label="No verified OS receipts yet." />
            )}
          </Section>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <DashboardSectionHeader
          eyebrow="Team Routing"
          title="Risks and intake outside your immediate lane"
          detail="These sections separate team-owned risk from unassigned work that needs routing."
        />
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
    </div>
    </div>
  )
}
