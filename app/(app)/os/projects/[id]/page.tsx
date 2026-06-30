"use client"

import { use, useRef, useState } from "react"
import Link from "next/link"
import useSWR from "swr"
import { ArrowLeft, Clock, AlertTriangle, GitMerge, Loader2, AlertCircle, Bot, PencilLine } from "lucide-react"
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
  ai_mode: string
  epic: string | null
  order_index: number
}
type Project = { id: string; name: string; description: string | null; status: string; tenant_id: string }

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const KANBAN_COLUMNS = [
  { id: "not_started", label: "Not Started", border: "border-[#2A2D35]",   count: "text-[#9CA3AF]",  bg: "bg-[#1A1D24]/50",   db: "border-[#2A2D35]" },
  { id: "in_progress", label: "In Progress", border: "border-yellow-700", count: "text-yellow-400", bg: "bg-yellow-950/30", db: "border-yellow-600" },
  { id: "blocked",     label: "Blocked",     border: "border-red-700",    count: "text-red-400",    bg: "bg-red-950/30",    db: "border-red-600" },
  { id: "done",        label: "Done",        border: "border-green-700",  count: "text-green-400",  bg: "bg-green-950/30",  db: "border-green-600" },
]

const AI_BADGE: Record<string, { label: string; icon: typeof Bot; color: string } | undefined> = {
  AI_EXECUTE: { label: "AI does it", icon: Bot, color: "#4ADE80" },
  AI_DRAFT: { label: "AI drafts", icon: PencilLine, color: "#FBBF24" },
}

function TaskCard({ task, onDragStart, isDragging }: { task: Task; onDragStart: (id: string) => void; isDragging: boolean }) {
  const today = new Date().toISOString().split("T")[0]
  const isOverdue = task.due_date && task.due_date < today && task.status !== "done"
  const ai = AI_BADGE[task.ai_mode]
  return (
    <div
      draggable
      onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; onDragStart(task.id) }}
      className={cn(
        "p-3 rounded-lg bg-[#1A1D24] border border-[#2A2D35]/60 transition-all cursor-grab active:cursor-grabbing select-none",
        task.blocker_flag && "border-red-800/60 bg-red-950/20",
        isDragging && "opacity-40 scale-95"
      )}
    >
      {task.blocker_flag && (
        <div className="flex items-center gap-1.5 mb-2"><AlertTriangle className="w-3 h-3 text-red-400" strokeWidth={2} /><span className="text-[10px] text-red-400 font-medium">Blocker</span></div>
      )}
      {task.blocked_by_task_id && !task.blocker_flag && (
        <div className="flex items-center gap-1.5 mb-2"><GitMerge className="w-3 h-3 text-yellow-400" strokeWidth={2} /><span className="text-[10px] text-yellow-400 font-medium">Has dependency</span></div>
      )}
      <Link href={`/os/tasks/${task.id}`} className="block text-xs font-medium text-white hover:text-white leading-relaxed mb-2.5" onClick={(e) => e.stopPropagation()}>
        {task.title}
      </Link>
      <div className="flex items-center gap-1.5 flex-wrap mb-3">
        <OSPriorityBadge priority={task.priority} />
        {ai && (
          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ color: ai.color, backgroundColor: `${ai.color}1f` }}>
            <ai.icon className="w-2.5 h-2.5" /> {ai.label}
          </span>
        )}
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
        {task.owner_user_id && <OSAvatar userId={task.owner_user_id} size="xs" />}
      </div>
    </div>
  )
}

export default function ProjectBoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data, isLoading, error, mutate } = useSWR<{ project: Project; tasks: Task[] }>(`/api/os/projects/${id}`, fetcher)

  const draggingId = useRef<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)

  async function handleDrop(epic: string, targetStatus: string) {
    const tid = draggingId.current
    draggingId.current = null
    setDragOver(null)
    if (!tid) return
    const task = data?.tasks.find((t) => t.id === tid)
    if (!task || task.status === targetStatus) return
    mutate(
      (prev) => prev ? { ...prev, tasks: prev.tasks.map((t) => t.id === tid ? { ...t, status: targetStatus } : t) } : prev,
      false
    )
    const res = await fetch(`/api/tasks/${tid}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: targetStatus }),
    })
    if (!res.ok) mutate()
  }

  if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-5 h-5 text-[#6B7280] animate-spin" /></div>
  if (error || !data?.project) return (
    <div className="flex items-center gap-2.5 px-4 py-3 rounded-lg bg-red-950/40 border border-red-800/40 text-red-400 text-sm">
      <AlertCircle className="w-4 h-4 shrink-0" /> Failed to load this project.
    </div>
  )

  const { project, tasks } = data
  const total = tasks.length
  const done = tasks.filter((t) => t.status === "done").length
  const pct = total ? Math.round((done / total) * 100) : 0

  // Group tasks by epic (preserving first-seen order).
  const epics: string[] = []
  const byEpic = new Map<string, Task[]>()
  for (const t of tasks) {
    const e = t.epic ?? "General"
    if (!byEpic.has(e)) { byEpic.set(e, []); epics.push(e) }
    byEpic.get(e)!.push(t)
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link href="/os/projects" className="w-7 h-7 mt-0.5 rounded-lg bg-[#1A1D24] border border-[#2A2D35] flex items-center justify-center">
          <ArrowLeft className="w-3.5 h-3.5 text-[#9CA3AF]" strokeWidth={1.75} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold text-white">{project.name}</h1>
          {project.description && <p className="text-xs text-[#9CA3AF] mt-0.5">{project.description}</p>}
          <div className="flex items-center gap-3 mt-2">
            <div className="h-1.5 w-40 bg-[#1A1D24] rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[11px] text-[#9CA3AF] font-mono">{done}/{total} done · {pct}%</span>
          </div>
        </div>
      </div>

      {/* Epic swimlanes */}
      {epics.map((epic) => {
        const epicTasks = byEpic.get(epic)!
        return (
          <div key={epic} className="rounded-xl border border-[#2A2D35] bg-[#0E0F13]/40 p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-semibold text-white">{epic}</span>
              <span className="text-[10px] text-[#6B7280] font-mono">{epicTasks.length}</span>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {KANBAN_COLUMNS.map((col) => {
                const colTasks = epicTasks.filter((t) => t.status === col.id)
                const key = `${epic}::${col.id}`
                const isOver = dragOver === key
                return (
                  <div
                    key={col.id}
                    className="flex-shrink-0 w-64"
                    onDragOver={(e) => { e.preventDefault(); setDragOver(key) }}
                    onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(null) }}
                    onDrop={() => handleDrop(epic, col.id)}
                  >
                    <div className={cn("flex items-center justify-between mb-2 pb-1.5 border-b", col.border)}>
                      <span className="text-[11px] font-semibold text-[#9CA3AF]">{col.label}</span>
                      <span className={cn("text-[11px] font-mono font-bold", col.count)}>{colTasks.length}</span>
                    </div>
                    <div className={cn("min-h-[60px] rounded-lg space-y-2 p-1 transition-all", isOver && `${col.bg} border-2 border-dashed ${col.db}`)}>
                      {colTasks.map((task) => (
                        <TaskCard key={task.id} task={task} onDragStart={(tid) => { draggingId.current = tid }} isDragging={draggingId.current === task.id} />
                      ))}
                      {colTasks.length === 0 && (
                        <div className="h-14 rounded-lg border border-dashed border-[#2A2D35] flex items-center justify-center">
                          <span className="text-[10px] text-[#6B7280]">{isOver ? "Release" : "—"}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {total === 0 && <p className="text-sm text-[#9CA3AF]">No tasks in this project yet.</p>}
    </div>
  )
}
