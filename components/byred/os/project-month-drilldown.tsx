"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { AlertTriangle, ArrowRight, CalendarDays, CircleDashed, FolderKanban } from "lucide-react"
import { OSAvatar } from "@/components/byred/os/os-avatar"
import { OSPriorityBadge, OSStatusBadge } from "@/components/byred/os/os-badge"

export type DashboardProjectTask = {
  id: string
  title: string
  status: string
  priority: string
  dueLabel: string
  tenantName: string
  tenantColor: string
  owner: {
    id: string
    name: string
    avatarUrl: string | null
  } | null
  blockerReason: string | null
}

export type DashboardProjectSummary = {
  id: string
  title: string
  sector: string
  status: string
  detail: string
  accent: string
  openCount: number
  blockedCount: number
  monthCount: number
  attentionTasks: DashboardProjectTask[]
  monthTasks: DashboardProjectTask[]
  unscheduledTasks: DashboardProjectTask[]
}

type ProjectMonthDrilldownProps = {
  projects: DashboardProjectSummary[]
  monthLabel: string
}

function ProjectCard({
  project,
  selected,
  onSelect,
}: {
  project: DashboardProjectSummary
  selected: boolean
  onSelect: () => void
}) {
  const currentSignal = project.attentionTasks[0] ?? project.monthTasks[0] ?? project.unscheduledTasks[0]

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className="group h-full rounded-lg border border-[#E3D7BC] border-t-4 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#C8A951] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#B8891A]/35"
      style={{ borderTopColor: project.accent }}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span
              className="rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-wider"
              style={{ borderColor: `${project.accent}66`, color: project.accent }}
            >
              {project.sector}
            </span>
            <span className="text-[10px] font-condensed font-semibold uppercase tracking-widest text-[#8A610F]">
              {project.status}
            </span>
          </div>
          <h2 className="mt-1 truncate text-lg font-condensed font-bold uppercase tracking-tight text-[#171717]">
            {project.title}
          </h2>
        </div>
        <span className="rounded-full border border-[#E3D7BC] bg-[#FBF7ED] px-2 py-1 text-[10px] font-semibold text-[#5F5A51]">
          {project.openCount} open
        </span>
      </div>
      <p className="min-h-10 text-xs leading-relaxed text-[#5F5A51]">{project.detail}</p>
      <div className="mt-4 rounded-md border border-[#E8DEC7] bg-[#FBF7ED] p-3">
        <div className="flex items-center justify-between gap-3 text-[10px] uppercase tracking-wider text-[#6B6254]">
          <span>{project.monthCount} this month</span>
          <span>{project.blockedCount} blocked</span>
        </div>
        {currentSignal ? (
          <p className="mt-2 text-xs font-medium leading-snug text-[#171717] line-clamp-2">
            {currentSignal.title}
            <span className="ml-2 text-[10px] font-normal text-[#6B6254]">
              {currentSignal.tenantName} / {currentSignal.dueLabel}
            </span>
          </p>
        ) : (
          <p className="mt-2 text-xs text-[#8A610F]">No open task pressure showing.</p>
        )}
        <div className="mt-3 flex items-center justify-between border-t border-[#E8DEC7] pt-2 text-[10px] font-semibold uppercase tracking-wider">
          <span className={selected ? "text-[#171717]" : "text-[#6B6254]"}>{selected ? "Selected" : "Open month view"}</span>
          <ArrowRight className="h-3.5 w-3.5 text-[#8A610F] transition group-hover:translate-x-0.5" strokeWidth={1.75} />
        </div>
      </div>
    </button>
  )
}

function TaskItem({ task }: { task: DashboardProjectTask }) {
  return (
    <div className="rounded-md border border-[#E8DEC7] bg-[#FCFAF5] px-3 py-3 transition-colors hover:border-[#C8A951] hover:bg-white">
      <div className="flex items-start gap-3">
        <span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: task.tenantColor }} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <Link href={`/os/tasks/${task.id}`} className="text-xs font-medium leading-snug text-[#171717] line-clamp-2 hover:text-[#8A610F]">
              {task.title}
            </Link>
            <Link href={`/os/tasks/${task.id}`} aria-label={`Open ${task.title}`}>
              <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#8A610F] hover:text-[#171717]" strokeWidth={1.75} />
            </Link>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] text-[#5F5A51]">{task.tenantName}</span>
            <span className="text-[10px] text-[#B8AA8E]">/</span>
            <span className="text-[10px] text-[#6B6254]">{task.dueLabel}</span>
            <OSPriorityBadge priority={task.priority} className="px-1.5 py-0 text-[9px]" />
            <OSStatusBadge status={task.status} className="px-1.5 py-0 text-[9px]" />
            {task.owner && (
              <span className="inline-flex items-center gap-1 text-[10px] text-[#5F5A51]">
                <OSAvatar userId={task.owner.id} fallbackName={task.owner.name} avatarUrl={task.owner.avatarUrl} size="xs" />
                {task.owner.name}
              </span>
            )}
          </div>
          {task.blockerReason && (
            <p className="mt-2 text-[10px] leading-relaxed text-[#8A610F] line-clamp-2">Blocker: {task.blockerReason}</p>
          )}
        </div>
      </div>
    </div>
  )
}

function TaskBucket({
  title,
  subtitle,
  icon: Icon,
  tasks,
  empty,
}: {
  title: string
  subtitle: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  tasks: DashboardProjectTask[]
  empty: string
}) {
  return (
    <div className="rounded-lg border border-[#E3D7BC] bg-white p-3 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#9A6A12]" strokeWidth={1.75} />
          <div className="min-w-0">
            <h3 className="text-xs font-condensed font-semibold uppercase tracking-wider text-[#171717]">{title}</h3>
            <p className="mt-0.5 text-[10px] leading-relaxed text-[#6B6254]">{subtitle}</p>
          </div>
        </div>
        <span className="rounded-full border border-[#E3D7BC] bg-[#FBF7ED] px-2 py-1 text-[10px] font-semibold text-[#5F5A51]">
          {tasks.length}
        </span>
      </div>
      <div className="space-y-2">
        {tasks.length > 0 ? tasks.map((task) => <TaskItem key={task.id} task={task} />) : (
          <p className="rounded-md border border-dashed border-[#E3D7BC] bg-[#FCFAF5] px-3 py-5 text-center text-xs text-[#6B6254]">{empty}</p>
        )}
      </div>
    </div>
  )
}

export function ProjectMonthDrilldown({ projects, monthLabel }: ProjectMonthDrilldownProps) {
  const [selectedId, setSelectedId] = useState(projects[0]?.id ?? "")
  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedId) ?? projects[0],
    [projects, selectedId],
  )

  if (!selectedProject) return null

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            selected={selectedProject.id === project.id}
            onSelect={() => setSelectedId(project.id)}
          />
        ))}
      </div>

      <div className="rounded-lg border border-[#D7B85E] bg-[#FBF7ED] p-3 shadow-sm">
        <div className="mb-3 flex flex-col gap-3 px-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: selectedProject.accent }}
                aria-hidden="true"
              />
              <p className="text-[10px] font-condensed font-semibold uppercase tracking-widest text-[#8A610F]">
                Monthly Project View
              </p>
            </div>
            <h2 className="text-lg font-condensed font-bold uppercase tracking-tight text-[#171717]">
              {selectedProject.title} / {monthLabel}
            </h2>
            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-[#5F5A51]">
              Clear task visibility for this project: urgent cleanup first, current-month work second, and unscheduled backlog last.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:min-w-72">
            <div className="rounded-md border border-[#E3D7BC] bg-white px-3 py-2 text-center">
              <p className="text-[10px] uppercase tracking-wider text-[#6B6254]">Attention</p>
              <p className="mt-1 text-lg font-condensed font-bold text-[#171717]">{selectedProject.attentionTasks.length}</p>
            </div>
            <div className="rounded-md border border-[#E3D7BC] bg-white px-3 py-2 text-center">
              <p className="text-[10px] uppercase tracking-wider text-[#6B6254]">Month</p>
              <p className="mt-1 text-lg font-condensed font-bold text-[#171717]">{selectedProject.monthTasks.length}</p>
            </div>
            <div className="rounded-md border border-[#E3D7BC] bg-white px-3 py-2 text-center">
              <p className="text-[10px] uppercase tracking-wider text-[#6B6254]">Backlog</p>
              <p className="mt-1 text-lg font-condensed font-bold text-[#171717]">{selectedProject.unscheduledTasks.length}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
          <TaskBucket
            title="Needs Attention"
            subtitle="Overdue, blocked, or blocker-flagged work that should not get buried."
            icon={AlertTriangle}
            tasks={selectedProject.attentionTasks}
            empty="No overdue or blocked work showing for this project."
          />
          <TaskBucket
            title={`Due In ${monthLabel}`}
            subtitle="Open tasks with due dates inside the current calendar month."
            icon={CalendarDays}
            tasks={selectedProject.monthTasks}
            empty="No remaining open tasks due this month."
          />
          <TaskBucket
            title="Unscheduled Backlog"
            subtitle="Open tasks without due dates that need scheduling or deprioritizing."
            icon={CircleDashed}
            tasks={selectedProject.unscheduledTasks}
            empty="No unscheduled backlog showing for this project."
          />
        </div>

        <div className="mt-3 flex flex-col gap-2 rounded-md border border-[#E8DEC7] bg-white px-3 py-3 text-xs text-[#5F5A51] sm:flex-row sm:items-center sm:justify-between">
          <span className="inline-flex items-center gap-2">
            <FolderKanban className="h-3.5 w-3.5 text-[#9A6A12]" strokeWidth={1.75} />
            {selectedProject.openCount} total open tasks matched to {selectedProject.title}.
          </span>
          <Link href="/os/tasks" className="inline-flex items-center gap-1 font-semibold text-[#8A610F] hover:text-[#171717]">
            Open full Tasks board
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} />
          </Link>
        </div>
      </div>
    </div>
  )
}
