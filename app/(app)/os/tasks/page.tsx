"use client"

import React, { useState, useRef, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import {
  ListTodo, Search, Clock, AlertTriangle, Loader2, Pencil, X, Check,
  GitMerge, ChevronDown, ChevronRight, FolderKanban, Users, ShieldAlert,
  CalendarClock, CalendarCheck, User, List, Kanban,
} from "lucide-react"
import { OSStatusBadge, OSPriorityBadge } from "@/components/byred/os/os-badge"
import { OSAvatar } from "@/components/byred/os/os-avatar"
import { OSEmpty } from "@/components/byred/os/os-empty"
import { MentionTextarea } from "@/components/byred/mention-textarea"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useUser } from "@/lib/context/user-context"

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = ["all", "not_started", "in_progress", "blocked", "done"]
const PRIORITY_OPTIONS = ["all", "critical", "high", "medium", "low"]

type QuickFilter = "" | "mine" | "due_today" | "overdue" | "blocked"

// ─── Types ────────────────────────────────────────────────────────────────────

type Task = {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  tenant_id: string
  owner_user_id: string | null
  support_user_ids: string[]
  due_date: string | null
  start_date: string | null
  blocker_flag: boolean
  blocked_by_task_id: string | null
  estimated_minutes: number
  created_at: string
}

type Tenant = { id: string; name: string; color: string | null }
type Member = { id: string; name: string; role: string; avatar_url: string | null }

type GroupMode = "owner" | "project"

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function tenantColor(color: string | null): string {
  if (!color || color === "amber") return "#F59E0B"
  if (color === "blue") return "#0EA5E9"
  if (color === "violet") return "#8B5CF6"
  return color
}

function shortName(name: string) {
  return name.replace(/^[^\w\s]*\s*/, "").split(" — ")[0].split(" - ")[0]
}

function daysOverdue(dueDate: string | null, today: string): number {
  if (!dueDate) return 0
  const d = dueDate.includes("T") ? dueDate.split("T")[0] : dueDate
  if (d >= today) return 0
  return Math.floor((new Date(today).getTime() - new Date(d).getTime()) / 86400000)
}

function fmtDate(d: string | null) {
  if (!d) return null
  const str = d.includes("T") ? d : d + "T00:00:00"
  return new Date(str).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

async function patchTask(id: string, patch: Partial<Pick<Task, "description" | "status" | "priority">>) {
  const res = await fetch(`/api/tasks/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  })
  if (!res.ok) throw new Error("Failed to save")
}

// ─── Notes Cell ───────────────────────────────────────────────────────────────

function NotesCell({ task, onSaved }: { task: Task; onSaved: () => void }) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState(task.description ?? "")
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const textRef = useRef<HTMLTextAreaElement>(null)
  const { data: memberData } = useSWR<{ members: Member[] }>("/api/os/members", fetcher)
  const mentionUsers = (memberData?.members ?? []).map((m) => ({ id: m.id, name: m.name }))

  async function save() {
    if (value === (task.description ?? "")) { setOpen(false); return }
    setSaving(true)
    try {
      await patchTask(task.id, { description: value || null })
      onSaved()
      toast.success("Notes saved")
    } catch { toast.error("Failed to save notes") }
    finally { setSaving(false); setOpen(false) }
  }

  async function clearNote() {
    if (!task.description) return
    setDeleting(true)
    try {
      await patchTask(task.id, { description: null })
      setValue("")
      onSaved()
      toast.success("Notes cleared")
    } catch { toast.error("Failed to clear notes") }
    finally { setDeleting(false) }
  }

  if (!open) {
    return (
      <div className="flex items-center gap-1 group/notes">
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); setOpen(true); setTimeout(() => textRef.current?.focus(), 50) }}
          className="flex items-center gap-1.5 max-w-[140px] text-left"
        >
          {task.description ? (
            <span className="text-xs text-[#9CA3AF] truncate group-hover/notes:text-white transition-colors">
              {task.description.slice(0, 35)}{task.description.length > 35 ? "…" : ""}
            </span>
          ) : (
            <span className="text-xs text-[#6B7280] group-hover/notes:text-[#9CA3AF] transition-colors flex items-center gap-1">
              <Pencil className="w-3 h-3" strokeWidth={1.5} /> Add notes
            </span>
          )}
        </button>
        {task.description && (
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); void clearNote() }}
            disabled={deleting}
            aria-label="Delete note"
            className="opacity-0 group-hover/notes:opacity-100 text-[#6B7280] hover:text-red-400 transition-all shrink-0"
          >
            {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" strokeWidth={2} />}
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="flex items-start gap-1.5" onClick={(e) => e.preventDefault()}>
      <MentionTextarea
        ref={textRef}
        value={value}
        onChange={setValue}
        onSubmit={() => void save()}
        onKeyDown={(e) => {
          if (e.key === "Escape") { setOpen(false); setValue(task.description ?? "") }
        }}
        users={mentionUsers}
        autoResize
        maxHeight={80}
        placeholder="Add notes…"
        className="flex-1 min-w-[180px] text-xs bg-[#1A1D24] border border-[#2A2D35] rounded px-2 py-1 text-white placeholder-[#6B7280] outline-none focus:border-[#9CA3AF]"
      />
      <button type="button" onClick={() => void save()} disabled={saving} aria-label="Save notes" className="text-green-400 hover:text-green-300 mt-0.5 shrink-0">
        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" strokeWidth={2} />}
      </button>
      <button type="button" onClick={() => { setOpen(false); setValue(task.description ?? "") }} aria-label="Cancel" className="text-[#9CA3AF] hover:text-[#9CA3AF] mt-0.5 shrink-0">
        <X className="w-3.5 h-3.5" strokeWidth={2} />
      </button>
    </div>
  )
}

// ─── Task Row ─────────────────────────────────────────────────────────────────

const COLS = "grid-cols-[28px_1fr_100px_90px_80px_80px_180px]"
const MIN_W = "min-w-[900px]"

const COL_HEADER = (
  <div className={cn("grid gap-0 px-4 py-2 border-b border-[#2A2D35]/60 text-[10px] font-semibold text-[#6B7280] uppercase tracking-widest bg-[#111318]/60", COLS, MIN_W)}>
    <span />
    <span className="pl-2">Task</span>
    <span>Status</span>
    <span>Priority</span>
    <span>Start</span>
    <span>Due</span>
    <span>Notes</span>
  </div>
)

function TaskRow({
  task, today, expandedId, setExpandedId, onSaved,
}: {
  task: Task
  today: string
  expandedId: string | null
  setExpandedId: (id: string | null) => void
  onSaved: () => void
}) {
  const overdue = daysOverdue(task.due_date, today)
  const isExpanded = expandedId === task.id

  return (
    <div>
      <div className={cn("grid gap-0 items-center px-4 py-3 hover:bg-white/[0.02] transition-colors group", COLS, MIN_W)}>
        <button
          type="button"
          onClick={() => setExpandedId(isExpanded ? null : task.id)}
          className="text-[#6B7280] hover:text-[#9CA3AF] transition-colors"
        >
          {isExpanded
            ? <ChevronDown className="w-3.5 h-3.5" strokeWidth={2} />
            : <ChevronRight className="w-3.5 h-3.5" strokeWidth={2} />}
        </button>

        <div className="flex items-center gap-2 min-w-0 pl-2">
          {task.blocker_flag && <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" strokeWidth={2} />}
          {task.blocked_by_task_id && <GitMerge className="w-3.5 h-3.5 text-yellow-400 shrink-0" strokeWidth={2} aria-label="Has dependency" />}
          <Link href={`/os/tasks/${task.id}`} className="text-sm text-white group-hover:text-white truncate hover:underline">
            {task.title}
          </Link>
        </div>

        <div><OSStatusBadge status={task.status} taskId={task.id} /></div>
        <div><OSPriorityBadge priority={task.priority} /></div>

        <div>
          {task.start_date
            ? <span className="text-xs text-[#9CA3AF]">{fmtDate(task.start_date)}</span>
            : <span className="text-[#6B7280] text-xs">—</span>}
        </div>

        <div>
          {task.due_date ? (
            <div className="flex flex-col">
              <span className={cn("text-xs flex items-center gap-1", overdue > 0 ? "text-red-400" : "text-[#9CA3AF]")}>
                {overdue > 0 && <Clock className="w-3 h-3" strokeWidth={2} />}
                {fmtDate(task.due_date)}
              </span>
              {overdue > 0 && (
                <span className="text-[9px] text-red-500 font-mono">{overdue}d overdue</span>
              )}
            </div>
          ) : (
            <span className="text-[#6B7280] text-xs">—</span>
          )}
        </div>

        <div onClick={(e) => e.preventDefault()}>
          <NotesCell task={task} onSaved={onSaved} />
        </div>
      </div>

      {isExpanded && (
        <div className="px-10 py-3 bg-[#111318]/80 border-t border-[#2A2D35]/60">
          <div className="grid grid-cols-3 gap-6 text-xs text-[#9CA3AF]">
            <div>
              <p className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-2">Notes</p>
              <NotesCell task={task} onSaved={onSaved} />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Details</p>
              <div className="space-y-1 text-[#9CA3AF]">
                <p>Est. time: {task.estimated_minutes}m</p>
                {task.blocked_by_task_id && <p className="text-yellow-400">Blocked by: {task.blocked_by_task_id.slice(0, 8)}…</p>}
                {task.blocker_flag && <p className="text-red-400">This is a blocker</p>}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">Actions</p>
              <Link href={`/os/tasks/${task.id}`} className="text-[#D7261E] hover:text-red-300 text-xs">
                Open full detail →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Project Section (used inside both owner and project modes) ───────────────

function ProjectSection({
  tenantId, taskList, tenant, collapsedGroups, toggleGroup, today, expandedId, setExpandedId, onSaved, indent,
}: {
  tenantId: string
  taskList: Task[]
  tenant: Tenant | undefined
  collapsedGroups: Set<string>
  toggleGroup: (id: string) => void
  today: string
  expandedId: string | null
  setExpandedId: (id: string | null) => void
  onSaved: () => void
  indent?: boolean
}) {
  const color = tenantColor(tenant?.color ?? null)
  const isCollapsed = collapsedGroups.has(tenantId)
  const openCount = taskList.filter((t) => t.status !== "done" && t.status !== "cancelled").length
  const doneCount = taskList.filter((t) => t.status === "done").length
  const blockerCount = taskList.filter((t) => t.blocker_flag).length
  const overdueCount = taskList.filter((t) => daysOverdue(t.due_date, today) > 0).length
  const display = tenant ? shortName(tenant.name) : "Unassigned Project"

  return (
    <div className="border-b border-[#2A2D35]/40 last:border-0">
      <button
        type="button"
        onClick={() => toggleGroup(tenantId)}
        className={cn(
          "w-full flex items-center gap-3 py-2 hover:bg-white/[0.02] transition-colors text-left",
          indent ? "px-8" : "px-4"
        )}
        style={{ borderLeft: `2px solid ${color}` }}
      >
        {isCollapsed
          ? <ChevronRight className="w-3 h-3 text-[#6B7280]" strokeWidth={2} />
          : <ChevronDown className="w-3 h-3 text-[#6B7280]" strokeWidth={2} />}
        <span className="text-xs font-semibold" style={{ color }}>{display}</span>
        <span className="text-[10px] text-[#6B7280]">{taskList.length} tasks</span>
        {openCount > 0 && <span className="text-[10px] text-[#9CA3AF]">{openCount} open</span>}
        {overdueCount > 0 && (
          <span className="text-[10px] text-red-500 flex items-center gap-0.5">
            <Clock className="w-2.5 h-2.5" strokeWidth={2} />
            {overdueCount} overdue
          </span>
        )}
        {doneCount > 0 && <span className="text-[10px] text-green-600">{doneCount} done</span>}
        {blockerCount > 0 && (
          <span className="text-[10px] text-red-600 flex items-center gap-0.5">
            <AlertTriangle className="w-2.5 h-2.5" strokeWidth={2} />
            {blockerCount} blocked
          </span>
        )}
      </button>

      {!isCollapsed && (
        <div className="divide-y divide-[#2A2D35]/20">
          {taskList.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              today={today}
              expandedId={expandedId}
              setExpandedId={setExpandedId}
              onSaved={onSaved}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Kanban ───────────────────────────────────────────────────────────────────

const KANBAN_COLS: { id: string; label: string; dot: string; bg: string; border: string }[] = [
  { id: "not_started", label: "Backlog",     dot: "bg-zinc-500",   bg: "bg-[#111318]",     border: "border-[#2A2D35]" },
  { id: "in_progress", label: "In Progress", dot: "bg-sky-500",    bg: "bg-sky-950/20",      border: "border-sky-900/50" },
  { id: "blocked",     label: "Blocked",     dot: "bg-red-500",    bg: "bg-red-950/20",      border: "border-red-900/50" },
  { id: "done",        label: "Done",        dot: "bg-green-500",  bg: "bg-green-950/20",    border: "border-green-900/50" },
]

const PRIORITY_DOT: Record<string, string> = {
  critical: "bg-red-500",
  high:     "bg-orange-400",
  medium:   "bg-amber-400",
  low:      "bg-zinc-500",
}

function KanbanCard({
  task, today, tenantColor: tColor, onDragStart,
}: {
  task: Task
  today: string
  tenantColor: string
  onDragStart: (id: string) => void
}) {
  const overdue = daysOverdue(task.due_date, today)

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move"
        onDragStart(task.id)
      }}
      className="group/card rounded-lg bg-[#1A1D24] border border-[#2A2D35]/60 p-3 cursor-grab active:cursor-grabbing hover:border-[#2A2D35] transition-colors select-none"
    >
      {/* Top row: priority dot + project dot + blocker */}
      <div className="flex items-center gap-1.5 mb-2">
        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", PRIORITY_DOT[task.priority] ?? "bg-[#1A1D24]")} title={task.priority} />
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: tColor }} />
        {task.blocker_flag && <AlertTriangle className="w-3 h-3 text-red-400 shrink-0" strokeWidth={2} />}
        {task.blocked_by_task_id && <GitMerge className="w-3 h-3 text-yellow-400 shrink-0" strokeWidth={2} />}
        <div className="ml-auto flex items-center gap-1">
          {task.owner_user_id && <OSAvatar userId={task.owner_user_id} size="xs" />}
        </div>
      </div>

      {/* Title */}
      <Link
        href={`/os/tasks/${task.id}`}
        className="block text-xs font-medium text-white leading-snug hover:text-white line-clamp-2 mb-2"
        onClick={(e) => e.stopPropagation()}
      >
        {task.title}
      </Link>

      {/* Due date */}
      {task.due_date && (
        <div className={cn("flex items-center gap-1 text-[10px]", overdue > 0 ? "text-red-400" : "text-[#6B7280]")}>
          <Clock className="w-2.5 h-2.5" strokeWidth={2} />
          {fmtDate(task.due_date)}
          {overdue > 0 && <span className="font-mono">· {overdue}d late</span>}
        </div>
      )}
    </div>
  )
}

function KanbanBoard({
  tasks, today, tenantMap, onStatusChange,
}: {
  tasks: Task[]
  today: string
  tenantMap: Map<string, Tenant>
  onStatusChange: (taskId: string, status: string) => Promise<void>
}) {
  const dragId = useRef<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)

  function handleDragOver(e: React.DragEvent, colId: string) {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setDragOver(colId)
  }

  function handleDrop(e: React.DragEvent, colId: string) {
    e.preventDefault()
    setDragOver(null)
    if (dragId.current && dragId.current !== colId) {
      void onStatusChange(dragId.current, colId)
    }
    dragId.current = null
  }

  return (
    <div className="grid grid-cols-4 gap-3 min-w-[900px]">
      {KANBAN_COLS.map((col) => {
        const colTasks = tasks.filter((t) => t.status === col.id)
        const isDragTarget = dragOver === col.id

        return (
          <div
            key={col.id}
            onDragOver={(e) => handleDragOver(e, col.id)}
            onDragLeave={() => setDragOver(null)}
            onDrop={(e) => handleDrop(e, col.id)}
            className={cn(
              "rounded-xl border flex flex-col transition-colors min-h-[300px]",
              col.bg, col.border,
              isDragTarget && "ring-2 ring-white/20"
            )}
          >
            {/* Column header */}
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/5">
              <span className={cn("w-2 h-2 rounded-full shrink-0", col.dot)} />
              <span className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider">{col.label}</span>
              <span className="ml-auto text-[10px] text-[#6B7280] tabular-nums">{colTasks.length}</span>
            </div>

            {/* Cards */}
            <div className="flex-1 p-2.5 space-y-2 overflow-y-auto">
              {colTasks.length === 0 ? (
                <div className={cn(
                  "h-16 rounded-lg border border-dashed flex items-center justify-center transition-colors",
                  isDragTarget ? "border-white/20 bg-white/5" : "border-[#2A2D35]"
                )}>
                  <span className="text-[10px] text-[#6B7280]">
                    {isDragTarget ? "Drop here" : "Empty"}
                  </span>
                </div>
              ) : (
                colTasks.map((task) => (
                  <KanbanCard
                    key={task.id}
                    task={task}
                    today={today}
                    tenantColor={tenantColor(tenantMap.get(task.tenant_id)?.color ?? null)}
                    onDragStart={(id) => { dragId.current = id }}
                  />
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OSTasksPage() {
  const currentUser = useUser()
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [tenantFilter, setTenantFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("")
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list")
  const [groupMode, setGroupMode] = useState<GroupMode>("owner")
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [collapsedOwners, setCollapsedOwners] = useState<Set<string>>(new Set())

  const { data: tasks, isLoading, error, mutate: mutateTasks } = useSWR<Task[]>("/api/tasks", fetcher)
  const { data: tenantData } = useSWR<{ tenants: Tenant[] }>("/api/os/tenants", fetcher)
  const { data: memberData } = useSWR<{ members: Member[] }>("/api/os/members", fetcher)

  const tenantMap = useMemo(
    () => new Map<string, Tenant>((tenantData?.tenants ?? []).map((t) => [t.id, t])),
    [tenantData]
  )
  const memberMap = useMemo(
    () => new Map<string, Member>((memberData?.members ?? []).map((m) => [m.id, m])),
    [memberData]
  )

  const today = new Date().toISOString().split("T")[0]
  const onSaved = () => mutateTasks()

  async function onStatusChange(taskId: string, newStatus: string) {
    const task = (tasks ?? []).find((t) => t.id === taskId)
    const prevStatus = task?.status

    // Build patch — set start_date automatically when entering In Progress
    const patch: Record<string, unknown> = { status: newStatus }
    if (newStatus === "in_progress" && !task?.start_date) {
      patch.start_date = today
    }

    // Optimistic update
    mutateTasks(
      (prev) => (prev ?? []).map((t) => t.id === taskId ? { ...t, ...patch } : t),
      false
    )

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      })
      if (!res.ok) throw new Error()

      // ── Post-transition logic ──────────────────────────────────────────────

      if (newStatus === "done" && prevStatus !== "done") {
        // 1. Warn about open subtasks
        const subRes = await fetch(`/api/tasks/${taskId}/subtasks`)
        if (subRes.ok) {
          const subtasks: { status: string }[] = await subRes.json()
          const openCount = subtasks.filter((s) => s.status !== "done").length
          if (openCount > 0) {
            toast.warning(`${openCount} subtask${openCount > 1 ? "s" : ""} still open`, {
              description: "Mark them done or they'll stay in the backlog.",
            })
          }
        }

        // 2. Surface tasks this task was blocking
        const depRes = await fetch(`/api/tasks/${taskId}/dependencies`)
        if (depRes.ok) {
          const deps: { blocking: { id: string; title: string }[] } = await depRes.json()
          if (deps.blocking.length > 0) {
            const n = deps.blocking.length
            toast.success(`${n} task${n > 1 ? "s" : ""} may now be unblocked`, {
              description: deps.blocking.map((d) => d.title).join(", ").slice(0, 80),
              action: {
                label: "Review blockers",
                onClick: () => router.push("/os/blockers"),
              },
            })
          }
        }
      }

      if (newStatus === "blocked" && prevStatus !== "blocked") {
        toast.warning("Task marked blocked — it will appear on the Blockers board.", {
          action: {
            label: "View",
            onClick: () => router.push("/os/blockers"),
          },
        })
      }
    } catch {
      toast.error("Failed to update status")
      mutateTasks()
    }
  }

  // Filtered task list
  const filtered = useMemo(() => (tasks ?? []).filter((t) => {
    const tenant = tenantMap.get(t.tenant_id)
    const tenantName = tenant?.name ?? ""

    if (tenantFilter !== "all" && t.tenant_id !== tenantFilter) return false
    if (!t.title.toLowerCase().includes(search.toLowerCase()) && !tenantName.toLowerCase().includes(search.toLowerCase())) return false
    if (statusFilter !== "all" && t.status !== statusFilter) return false
    if (priorityFilter !== "all" && (t.priority?.toLowerCase() ?? "") !== priorityFilter) return false

    if (quickFilter === "mine") {
      const myId = currentUser?.profile?.id
      if (!myId) return false
      if (t.owner_user_id !== myId && !(t.support_user_ids ?? []).includes(myId)) return false
    }
    if (quickFilter === "due_today") {
      if (!t.due_date) return false
      const d = t.due_date.includes("T") ? t.due_date.split("T")[0] : t.due_date
      if (d !== today) return false
    }
    if (quickFilter === "overdue") {
      if (t.status === "done" || t.status === "cancelled") return false
      if (daysOverdue(t.due_date, today) <= 0) return false
    }
    if (quickFilter === "blocked") {
      if (t.status !== "blocked" && !t.blocker_flag) return false
    }

    return true
  }), [tasks, tenantMap, tenantFilter, search, statusFilter, priorityFilter, quickFilter, currentUser?.profile?.id, today])

  // Project pills
  const tenantsWithTasks = useMemo(() => {
    const seen = new Map<string, { tenant: Tenant; total: number }>()
    for (const task of tasks ?? []) {
      const tenant = tenantMap.get(task.tenant_id)
      if (!tenant) continue
      const ex = seen.get(task.tenant_id)
      if (ex) ex.total++
      else seen.set(task.tenant_id, { tenant, total: 1 })
    }
    return Array.from(seen.values()).sort((a, b) => b.total - a.total)
  }, [tasks, tenantMap])

  // Owner → Project grouping
  const ownerGroups = useMemo(() => {
    const map = new Map<string | null, Map<string, Task[]>>()

    for (const task of filtered) {
      const ownerId = task.owner_user_id
      if (!map.has(ownerId)) map.set(ownerId, new Map())
      const projects = map.get(ownerId)!
      const arr = projects.get(task.tenant_id) ?? []
      arr.push(task)
      projects.set(task.tenant_id, arr)
    }

    // Build sorted array — assigned owners first (sorted by name), unassigned last
    const result: {
      ownerId: string | null
      member: Member | null
      projects: { tenantId: string; taskList: Task[] }[]
      totalCount: number
      overdueCount: number
    }[] = []

    for (const [ownerId, projectMap] of map.entries()) {
      const member = ownerId ? (memberMap.get(ownerId) ?? null) : null
      const projects = Array.from(projectMap.entries())
        .map(([tenantId, taskList]) => ({ tenantId, taskList }))
        .sort((a, b) => b.taskList.length - a.taskList.length)
      const totalCount = projects.reduce((acc, p) => acc + p.taskList.length, 0)
      const overdueCount = projects.reduce(
        (acc, p) => acc + p.taskList.filter((t) => daysOverdue(t.due_date, today) > 0).length,
        0
      )
      result.push({ ownerId, member, projects, totalCount, overdueCount })
    }

    return result.sort((a, b) => {
      if (!a.ownerId) return 1
      if (!b.ownerId) return -1
      return (a.member?.name ?? "").localeCompare(b.member?.name ?? "")
    })
  }, [filtered, memberMap, today])

  // Project-only grouping (original mode)
  const projectGroups = useMemo(() => {
    if (tenantFilter !== "all") return null
    const map = new Map<string, Task[]>()
    for (const task of filtered) {
      const arr = map.get(task.tenant_id) ?? []
      arr.push(task)
      map.set(task.tenant_id, arr)
    }
    return Array.from(map.entries())
      .map(([tenantId, taskList]) => ({ tenantId, taskList }))
      .sort((a, b) => b.taskList.length - a.taskList.length)
  }, [filtered, tenantFilter])

  function toggleGroup(id: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return next
    })
  }

  function toggleOwner(id: string) {
    setCollapsedOwners((prev) => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return next
    })
  }

  return (
    <div className="space-y-5 max-w-full">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white font-condensed tracking-tight">Tasks</h1>
          <p className="text-sm text-[#9CA3AF] mt-1">
            {isLoading ? "Loading…" : `${tasks?.length ?? 0} total · ${filtered.length} shown`}
          </p>
        </div>
        <Link
          href="/os/tasks/new"
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#D7261E] text-white text-sm font-medium hover:bg-[#B51E18] transition-colors"
        >
          + New Task
        </Link>
      </div>

      {/* Project filter pills */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setTenantFilter("all")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
            tenantFilter === "all"
              ? "bg-white/10 text-white border-white/15"
              : "text-[#9CA3AF] border-[#2A2D35] hover:text-[#9CA3AF] hover:border-[#2A2D35]"
          )}
        >
          <FolderKanban className="w-3 h-3" strokeWidth={1.75} />
          All Projects
          <span className="text-[10px] text-[#6B7280] ml-0.5">{tasks?.length ?? 0}</span>
        </button>

        {tenantsWithTasks.map(({ tenant, total }) => {
          const color = tenantColor(tenant.color)
          const isActive = tenantFilter === tenant.id
          return (
            <button
              key={tenant.id}
              type="button"
              onClick={() => setTenantFilter(isActive ? "all" : tenant.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                isActive
                  ? "text-white border-transparent"
                  : "text-[#9CA3AF] border-[#2A2D35] hover:border-[#2A2D35] hover:text-white"
              )}
              style={isActive ? { borderColor: `${color}40`, background: `${color}15`, color } : {}}
            >
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
              {shortName(tenant.name)}
              <span className="text-[10px] ml-0.5" style={{ opacity: 0.6 }}>{total}</span>
            </button>
          )
        })}
      </div>

      {/* Quick filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {([
          { id: "mine",      label: "My Tasks",  icon: User,         color: "text-blue-400 border-blue-800 bg-blue-950/40" },
          { id: "due_today", label: "Due Today",  icon: CalendarCheck, color: "text-amber-400 border-amber-800 bg-amber-950/40" },
          { id: "overdue",   label: "Overdue",    icon: CalendarClock, color: "text-red-400 border-red-800 bg-red-950/40" },
          { id: "blocked",   label: "Blocked",    icon: ShieldAlert,   color: "text-orange-400 border-orange-800 bg-orange-950/40" },
        ] as { id: QuickFilter; label: string; icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; color: string }[]).map(({ id, label, icon: Icon, color }) => {
          const active = quickFilter === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => setQuickFilter(active ? "" : id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                active
                  ? color
                  : "text-[#9CA3AF] border-[#2A2D35] hover:text-[#9CA3AF] hover:border-[#2A2D35]"
              )}
            >
              <Icon className="w-3 h-3" strokeWidth={1.75} />
              {label}
            </button>
          )
        })}
        {quickFilter && (
          <button
            type="button"
            onClick={() => setQuickFilter("")}
            className="flex items-center gap-1 text-[11px] text-[#6B7280] hover:text-[#9CA3AF] transition-colors"
          >
            <X className="w-3 h-3" strokeWidth={2} /> Clear
          </button>
        )}
      </div>

      {/* Filter + Group Mode bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#6B7280]" strokeWidth={1.75} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks…"
            className="w-full pl-8 pr-3 py-2 text-sm bg-[#111318] border border-[#2A2D35] rounded-lg text-white placeholder-[#6B7280] focus:outline-none focus:border-[#2A2D35]"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={cn(
                "px-2.5 py-1.5 rounded-lg text-[11px] font-medium capitalize transition-colors",
                statusFilter === s ? "bg-white/10 text-white border border-white/15" : "text-[#9CA3AF] hover:text-[#9CA3AF]"
              )}
            >
              {s === "all" ? "All Status" : s.replace("_", " ")}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {PRIORITY_OPTIONS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPriorityFilter(p)}
              className={cn(
                "px-2.5 py-1.5 rounded-lg text-[11px] font-medium capitalize transition-colors",
                priorityFilter === p ? "bg-white/10 text-white border border-white/15" : "text-[#9CA3AF] hover:text-[#9CA3AF]"
              )}
            >
              {p === "all" ? "All Priority" : p}
            </button>
          ))}
        </div>

        {/* View + Group mode toggles */}
        <div className="ml-auto flex items-center gap-2">
          {/* View mode: List / Kanban */}
          <div className="flex items-center gap-1 rounded-lg bg-[#111318] border border-[#2A2D35] p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors",
                viewMode === "list" ? "bg-white/10 text-white" : "text-[#9CA3AF] hover:text-[#9CA3AF]"
              )}
            >
              <List className="w-3 h-3" strokeWidth={1.75} />
              List
            </button>
            <button
              type="button"
              onClick={() => setViewMode("kanban")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors",
                viewMode === "kanban" ? "bg-white/10 text-white" : "text-[#9CA3AF] hover:text-[#9CA3AF]"
              )}
            >
              <Kanban className="w-3 h-3" strokeWidth={1.75} />
              Kanban
            </button>
          </div>

          {/* Group mode — only in list view, all projects */}
          {viewMode === "list" && tenantFilter === "all" && (
            <div className="flex items-center gap-1 rounded-lg bg-[#111318] border border-[#2A2D35] p-0.5">
              <button
                type="button"
                onClick={() => setGroupMode("owner")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors",
                  groupMode === "owner" ? "bg-white/10 text-white" : "text-[#9CA3AF] hover:text-[#9CA3AF]"
                )}
              >
                <Users className="w-3 h-3" strokeWidth={1.75} />
                By Owner
              </button>
              <button
                type="button"
                onClick={() => setGroupMode("project")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors",
                  groupMode === "project" ? "bg-white/10 text-white" : "text-[#9CA3AF] hover:text-[#9CA3AF]"
                )}
              >
                <FolderKanban className="w-3 h-3" strokeWidth={1.75} />
                By Project
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Task board */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-5 h-5 text-[#6B7280] animate-spin" strokeWidth={1.75} />
        </div>
      ) : error ? (
        <div className="px-4 py-3 rounded-lg bg-red-950/40 border border-red-800/40 text-sm text-red-400">
          Failed to load tasks. Please refresh.
        </div>
      ) : filtered.length === 0 ? (
        <OSEmpty icon={ListTodo} title="No tasks found" description="Adjust your filters or create your first task." />
      ) : viewMode === "kanban" ? (
        <div className="overflow-x-auto pb-4">
          <KanbanBoard
            tasks={filtered}
            today={today}
            tenantMap={tenantMap}
            onStatusChange={onStatusChange}
          />
        </div>
      ) : tenantFilter !== "all" ? (
        // Single project selected — flat list
        <div className="rounded-xl bg-[#111318] border border-[#2A2D35] overflow-x-auto">
          {COL_HEADER}
          <div className={cn("divide-y divide-[#2A2D35]/40", MIN_W)}>
            {filtered.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                today={today}
                expandedId={expandedId}
                setExpandedId={setExpandedId}
                onSaved={onSaved}
              />
            ))}
          </div>
        </div>
      ) : groupMode === "owner" ? (
        // Owner → Project grouping
        <div className="space-y-3">
          {ownerGroups.map(({ ownerId, member, projects, totalCount, overdueCount }) => {
            const ownerKey = ownerId ?? "__unassigned__"
            const isCollapsed = collapsedOwners.has(ownerKey)
            const displayName = member?.name ?? "Unassigned"

            return (
              <div key={ownerKey} className="rounded-xl bg-[#111318] border border-[#2A2D35] overflow-x-auto">
                {/* Owner header */}
                <button
                  type="button"
                  onClick={() => toggleOwner(ownerKey)}
                  className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-white/[0.02] transition-colors text-left border-b border-[#2A2D35]"
                >
                  {isCollapsed
                    ? <ChevronRight className="w-4 h-4 text-[#6B7280] shrink-0" strokeWidth={2} />
                    : <ChevronDown className="w-4 h-4 text-[#6B7280] shrink-0" strokeWidth={2} />}

                  {ownerId
                    ? <OSAvatar userId={ownerId} size="sm" />
                    : <div className="w-6 h-6 rounded-full bg-[#1A1D24] border border-[#2A2D35] flex items-center justify-center shrink-0">
                        <Users className="w-3 h-3 text-[#9CA3AF]" strokeWidth={1.75} />
                      </div>
                  }

                  <span className="text-sm font-semibold text-white">{displayName}</span>
                  {member?.role && (
                    <span className="text-[10px] text-[#6B7280] capitalize">{member.role}</span>
                  )}

                  <div className="flex items-center gap-3 ml-auto">
                    <span className="text-xs text-[#9CA3AF]">{totalCount} tasks</span>
                    {overdueCount > 0 && (
                      <span className="flex items-center gap-1 text-xs font-semibold text-red-400">
                        <Clock className="w-3.5 h-3.5" strokeWidth={2} />
                        {overdueCount} overdue
                      </span>
                    )}
                  </div>
                </button>

                {/* Project sections within owner */}
                {!isCollapsed && (
                  <div className={cn("divide-y divide-[#2A2D35]/40", MIN_W)}>
                    {COL_HEADER}
                    {projects.map(({ tenantId, taskList }) => (
                      <ProjectSection
                        key={tenantId}
                        tenantId={tenantId}
                        taskList={taskList}
                        tenant={tenantMap.get(tenantId)}
                        collapsedGroups={collapsedGroups}
                        toggleGroup={toggleGroup}
                        today={today}
                        expandedId={expandedId}
                        setExpandedId={setExpandedId}
                        onSaved={onSaved}
                        indent
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        // Project-only grouping (original mode)
        <div className="rounded-xl bg-[#111318] border border-[#2A2D35] overflow-x-auto">
          {COL_HEADER}
          <div className={cn("divide-y divide-[#2A2D35]/40", MIN_W)}>
            {(projectGroups ?? []).map(({ tenantId, taskList }) => (
              <ProjectSection
                key={tenantId}
                tenantId={tenantId}
                taskList={taskList}
                tenant={tenantMap.get(tenantId)}
                collapsedGroups={collapsedGroups}
                toggleGroup={toggleGroup}
                today={today}
                expandedId={expandedId}
                setExpandedId={setExpandedId}
                onSaved={onSaved}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
