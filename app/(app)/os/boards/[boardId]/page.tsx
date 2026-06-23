"use client"

import { use, useRef, useState } from "react"
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

// Street light: gray → yellow → red → green
const KANBAN_COLUMNS = [
  { id: "not_started", label: "Not Started", border: "border-[#2A2D35]",   count_color: "text-[#9CA3AF]",   drop_bg: "bg-[#1A1D24]/50",   drop_border: "border-[#2A2D35]" },
  { id: "in_progress", label: "In Progress", border: "border-yellow-700", count_color: "text-yellow-400", drop_bg: "bg-yellow-950/30", drop_border: "border-yellow-600" },
  { id: "blocked",     label: "Blocked",     border: "border-red-700",    count_color: "text-red-400",    drop_bg: "bg-red-950/30",    drop_border: "border-red-600" },
  { id: "done",        label: "Done",        border: "border-green-700",  count_color: "text-green-400",  drop_bg: "bg-green-950/30",  drop_border: "border-green-600" },
]

function tenantColor(color: string | null): string {
  if (!color || color === "amber") return "#F59E0B"
  if (color === "blue") return "#0EA5E9"
  if (color === "violet") return "#8B5CF6"
  return color
}

function TaskCard({
  task,
  onDragStart,
  isDragging,
}: {
  task: Task
  onDragStart: (id: string) => void
  isDragging: boolean
}) {
  const today = new Date().toISOString().split("T")[0]
  const isOverdue = task.due_date && task.due_date < today && task.status !== "done"

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move"
        onDragStart(task.id)
      }}
      className={cn(
        "p-3.5 rounded-lg bg-[#1A1D24] border border-[#2A2D35]/60 transition-all cursor-grab active:cursor-grabbing select-none",
        task.blocker_flag && "border-red-800/60 bg-red-950/20",
        isDragging && "opacity-40 scale-95"
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

      <Link
        href={`/os/tasks/${task.id}`}
        className="block text-xs font-medium text-white hover:text-white leading-relaxed mb-2.5"
        onClick={(e) => e.stopPropagation()}
      >
        {task.title}
      </Link>

      <div className="flex items-center gap-1.5 flex-wrap mb-3">
        <OSPriorityBadge priority={task.priority} />
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[10px] text-[#6B7280]">
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
    </div>
  )
}

export default function OSBoardDetailPage({
  params,
}: {
  params: Promise<{ boardId: string }>
}) {
  const { boardId } = use(params)

  const { data: allTasks, isLoading: tasksLoading, error: tasksError, mutate } = useSWR<Task[]>("/api/tasks", fetcher)
  const { data: tenantData } = useSWR<{ tenants: Tenant[] }>("/api/os/tenants", fetcher)

  // Drag state
  const draggingId = useRef<string | null>(null)
  const [dragOverCol, setDragOverCol] = useState<string | null>(null)

  const tenant = (tenantData?.tenants ?? []).find((t) => t.id === boardId)
  const tasks = (allTasks ?? []).filter((t) => t.tenant_id === boardId && t.status !== "cancelled")
  const color = tenantColor(tenant?.color ?? null)

  async function handleDrop(targetStatus: string) {
    const id = draggingId.current
    draggingId.current = null
    setDragOverCol(null)
    if (!id) return

    const task = (allTasks ?? []).find((t) => t.id === id)
    if (!task || task.status === targetStatus) return

    // Optimistic update
    mutate(
      (prev) => (prev ?? []).map((t) => t.id === id ? { ...t, status: targetStatus } : t),
      false
    )

    const res = await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: targetStatus }),
    })

    if (!res.ok) {
      // Revert on failure
      mutate()
    }
  }

  if (tasksLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-5 h-5 text-[#6B7280] animate-spin" strokeWidth={1.75} />
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
          className="w-7 h-7 rounded-lg bg-[#1A1D24] border border-[#2A2D35] flex items-center justify-center hover:border-[#2A2D35] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-[#9CA3AF]" strokeWidth={1.75} />
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
          <p className="text-xs text-[#9CA3AF] mt-0.5">{tasks.length} tasks · drag cards between columns to update status</p>
        </div>
        <Link
          href={`/os/tasks/new?tenant=${boardId}`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1A1D24] border border-[#2A2D35] text-xs text-[#9CA3AF] hover:border-[#2A2D35] hover:text-white transition-colors"
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={2} />
          Add Task
        </Link>
      </div>

      {/* Kanban columns */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {KANBAN_COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.id)
          const isOver = dragOverCol === col.id
          return (
            <div
              key={col.id}
              className="flex-shrink-0 w-72"
              onDragOver={(e) => { e.preventDefault(); setDragOverCol(col.id) }}
              onDragLeave={(e) => {
                // Only clear if leaving the column entirely (not entering a child)
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setDragOverCol(null)
                }
              }}
              onDrop={() => handleDrop(col.id)}
            >
              {/* Column header */}
              <div className={cn("flex items-center justify-between mb-3 pb-2 border-b", col.border)}>
                <span className="text-xs font-semibold text-[#9CA3AF]">{col.label}</span>
                <span className={cn("text-xs font-mono font-bold", col.count_color)}>{colTasks.length}</span>
              </div>

              {/* Drop zone */}
              <div
                className={cn(
                  "min-h-[80px] rounded-lg space-y-2 p-1 transition-all",
                  isOver && `${col.drop_bg} border-2 border-dashed ${col.drop_border}`
                )}
              >
                {colTasks.length === 0 && !isOver ? (
                  <div className="h-20 rounded-lg border border-dashed border-[#2A2D35] flex items-center justify-center">
                    <span className="text-[10px] text-[#6B7280]">Drop here</span>
                  </div>
                ) : (
                  colTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onDragStart={(id) => { draggingId.current = id }}
                      isDragging={draggingId.current === task.id}
                    />
                  ))
                )}
                {isOver && colTasks.length === 0 && (
                  <div className="h-14 rounded-lg flex items-center justify-center">
                    <span className="text-[10px] text-[#9CA3AF]">Release to move here</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
