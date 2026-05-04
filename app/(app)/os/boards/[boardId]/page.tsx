"use client"

import { use } from "react"
import Link from "next/link"
import useSWR from "swr"
import { ArrowLeft, Clock, AlertTriangle, GitMerge, Plus, Loader2, AlertCircle } from "lucide-react"
import { OSPriorityBadge } from "@/components/byred/os/os-badge"
import { OSAvatar } from "@/components/byred/os/os-avatar"
import { cn } from "@/lib/utils"

type Task = {
  id: string
  title: string
  status: string
  priority: string
  tenant_id: string
  owner_user_id: string | null
  due_date: string | null
  blocker_flag: boolean
  blocked_by_task_id: string | null
  estimated_minutes: number
}

type Tenant = { id: string; name: string; color: string | null }

const fetcher = (url: string) => fetch(url).then((r) => r.json())

// Status colors: gray (not started) → yellow (in progress) → red (blocked) → green (done)
const KANBAN_COLUMNS = [
  { id: "not_started", label: "Not Started", border: "border-zinc-700",   count_color: "text-zinc-400" },
  { id: "in_progress", label: "In Progress", border: "border-yellow-700", count_color: "text-yellow-400"  },
  { id: "blocked",     label: "Blocked",     border: "border-red-700",    count_color: "text-red-400"  },
  { id: "done",        label: "Done",        border: "border-green-700",  count_color: "text-green-400" },
]

function tenantColor(color: string | null): string {
  if (!color || color === "amber") return "#F59E0B"
  if (color === "blue") return "#0EA5E9"
  if (color === "violet") return "#8B5CF6"
  return color
}

function TaskCard({ task }: { task: Task }) {
  const today = new Date().toISOString().split("T")[0]
  const isOverdue = task.due_date && task.due_date < today && task.status !== "done"

  return (
    <Link
      href={`/os/tasks/${task.id}`}
      className={cn(
        "block p-3.5 rounded-lg bg-zinc-800/80 border border-zinc-700/60 hover:border-zinc-600 transition-colors group",
        task.blocker_flag && "border-red-800/60 bg-red-950/20"
      )}
    >
      {task.blocker_flag && (
        <div className="flex items-center gap-1.5 mb-2">
          <AlertTriangle className="w-3 h-3 text-red-400" strokeWidth={2} />
          <span className="text-[10px] text-red-400 font-medium">Blocker</span>
        </div>
      )}
      {task.blocked_by_task_id && !task.blocker_flag && (
        <div className="flex items-center gap-1.5 mb-2">
          <GitMerge className="w-3 h-3 text-yellow-400" strokeWidth={2} />
          <span className="text-[10px] text-yellow-400 font-medium">Has dependency</span>
        </div>
      )}

      <p className="text-xs font-medium text-zinc-200 group-hover:text-white leading-relaxed mb-2.5">
        {task.title}
      </p>

      <div className="flex items-center gap-1.5 flex-wrap mb-3">
        <OSPriorityBadge priority={task.priority} />
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[10px] text-zinc-600">
          {task.due_date && (
            <div className={cn("flex items-center gap-1", isOverdue && "text-red-400")}>
              <Clock className="w-3 h-3" strokeWidth={1.75} />
              {new Date(task.due_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </div>
          )}
        </div>
        {task.owner_user_id && (
          <OSAvatar userId={task.owner_user_id} size="xs" />
        )}
      </div>
    </Link>
  )
}

export default function OSBoardDetailPage({
  params,
}: {
  params: Promise<{ boardId: string }>
}) {
  const { boardId } = use(params)

  const { data: allTasks, isLoading: tasksLoading, error: tasksError } = useSWR<Task[]>("/api/tasks", fetcher)
  const { data: tenantData } = useSWR<{ tenants: Tenant[] }>("/api/os/tenants", fetcher)

  const tenant = (tenantData?.tenants ?? []).find((t) => t.id === boardId)
  const tasks = (allTasks ?? []).filter((t) => t.tenant_id === boardId && t.status !== "cancelled")
  const color = tenantColor(tenant?.color ?? null)

  if (tasksLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-5 h-5 text-zinc-600 animate-spin" strokeWidth={1.75} />
      </div>
    )
  }

  if (tasksError) {
    return (
      <div className="flex items-center gap-2.5 px-4 py-3 rounded-lg bg-red-950/40 border border-red-800/40 text-red-400 text-sm">
        <AlertCircle className="w-4 h-4 shrink-0" strokeWidth={1.75} />
        Failed to load board tasks. Please refresh.
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/os/boards"
          className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center hover:border-zinc-600 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.75} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="inline-flex px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide"
              style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}
            >
              Kanban
            </span>
            <h1 className="text-base font-semibold text-white">
              {tenant?.name ?? boardId}
            </h1>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">{tasks.length} tasks</p>
        </div>
        <Link
          href={`/os/tasks/new?tenant=${boardId}`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 hover:border-zinc-600 hover:text-white transition-colors"
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={2} />
          Add Task
        </Link>
      </div>

      {/* Kanban columns */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {KANBAN_COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.id)
          return (
            <div key={col.id} className="flex-shrink-0 w-72">
              <div className={cn("flex items-center justify-between mb-3 pb-2 border-b", col.border)}>
                <span className="text-xs font-semibold text-zinc-300">{col.label}</span>
                <span className={cn("text-xs font-mono font-bold", col.count_color)}>{colTasks.length}</span>
              </div>
              <div className="space-y-2">
                {colTasks.length === 0 ? (
                  <div className="h-20 rounded-lg border border-dashed border-zinc-800 flex items-center justify-center">
                    <span className="text-[10px] text-zinc-700">Empty</span>
                  </div>
                ) : (
                  colTasks.map((task) => <TaskCard key={task.id} task={task} />)
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
