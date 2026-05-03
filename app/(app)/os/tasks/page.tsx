"use client"

import { useState, useRef, useMemo } from "react"
import Link from "next/link"
import useSWR from "swr"
import {
  ListTodo, Search, Clock, AlertTriangle, Loader2, Pencil, X, Check,
  GitMerge, ChevronDown, ChevronRight, FolderKanban,
} from "lucide-react"
import { OSStatusBadge, OSPriorityBadge } from "@/components/byred/os/os-badge"
import { OSAvatar } from "@/components/byred/os/os-avatar"
import { OSEmpty } from "@/components/byred/os/os-empty"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

const STATUS_OPTIONS = ["all", "not_started", "in_progress", "blocked", "done"]
const PRIORITY_OPTIONS = ["all", "critical", "high", "medium", "low"]

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

const fetcher = (url: string) => fetch(url).then((r) => r.json())

async function patchTask(id: string, patch: Partial<Pick<Task, "description" | "status" | "priority">>) {
  const res = await fetch(`/api/tasks/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  })
  if (!res.ok) throw new Error("Failed to save")
}

function tenantColor(color: string | null): string {
  if (!color || color === "amber") return "#F59E0B"
  if (color === "blue") return "#0EA5E9"
  if (color === "violet") return "#8B5CF6"
  return color
}

function shortName(name: string) {
  return name.replace(/^[^\w\s]*\s*/, "").split(" — ")[0].split(" - ")[0]
}

function NotesCell({ task, onSaved }: { task: Task; onSaved: () => void }) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState(task.description ?? "")
  const [saving, setSaving] = useState(false)
  const textRef = useRef<HTMLTextAreaElement>(null)

  async function save() {
    if (value === (task.description ?? "")) { setOpen(false); return }
    setSaving(true)
    try {
      await patchTask(task.id, { description: value || null })
      onSaved()
      toast.success("Notes saved")
    } catch {
      toast.error("Failed to save notes")
    } finally {
      setSaving(false)
      setOpen(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); setOpen(true); setTimeout(() => textRef.current?.focus(), 50) }}
        className="group/notes flex items-center gap-1.5 max-w-[160px] text-left"
      >
        {task.description ? (
          <span className="text-xs text-zinc-400 truncate group-hover/notes:text-zinc-200 transition-colors">
            {task.description.slice(0, 40)}{task.description.length > 40 ? "…" : ""}
          </span>
        ) : (
          <span className="text-xs text-zinc-700 group-hover/notes:text-zinc-500 transition-colors flex items-center gap-1">
            <Pencil className="w-3 h-3" strokeWidth={1.5} /> Add notes
          </span>
        )}
      </button>
    )
  }

  return (
    <div className="flex items-start gap-1.5" onClick={(e) => e.preventDefault()}>
      <textarea
        ref={textRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={2}
        className="flex-1 min-w-[180px] text-xs bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-zinc-200 placeholder-zinc-600 resize-none outline-none focus:border-zinc-400"
        placeholder="Add notes…"
        onKeyDown={(e) => { if (e.key === "Escape") { setOpen(false); setValue(task.description ?? "") } }}
      />
      <button type="button" onClick={save} disabled={saving} aria-label="Save notes" className="text-emerald-400 hover:text-emerald-300 mt-0.5 shrink-0">
        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" strokeWidth={2} />}
      </button>
      <button type="button" onClick={() => { setOpen(false); setValue(task.description ?? "") }} aria-label="Cancel" className="text-zinc-500 hover:text-zinc-300 mt-0.5 shrink-0">
        <X className="w-3.5 h-3.5" strokeWidth={2} />
      </button>
    </div>
  )
}

type RowProps = {
  task: Task
  tenantMap: Map<string, Tenant>
  today: string
  expandedId: string | null
  setExpandedId: (id: string | null) => void
  onSaved: () => void
  fmtDate: (d: string | null) => string | null
  showProject: boolean
  cols: string
  minW: string
}

function TaskRow({ task, tenantMap, today, expandedId, setExpandedId, onSaved, fmtDate, showProject, cols, minW }: RowProps) {
  const isOverdue = task.due_date && task.due_date < today && task.status !== "done"
  const tenant = tenantMap.get(task.tenant_id)
  const color = tenantColor(tenant?.color ?? null)
  const isExpanded = expandedId === task.id

  return (
    <div>
      <div className={cn("grid gap-0 items-center px-4 py-3 hover:bg-white/[0.02] transition-colors group", cols, minW)}>
        <button
          type="button"
          onClick={() => setExpandedId(isExpanded ? null : task.id)}
          className="text-zinc-700 hover:text-zinc-400 transition-colors"
        >
          {isExpanded
            ? <ChevronDown className="w-3.5 h-3.5" strokeWidth={2} />
            : <ChevronRight className="w-3.5 h-3.5" strokeWidth={2} />}
        </button>

        <div className="flex items-center gap-2 min-w-0 pl-2">
          {task.blocker_flag && <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" strokeWidth={2} />}
          {task.blocked_by_task_id && <GitMerge className="w-3.5 h-3.5 text-amber-500 shrink-0" strokeWidth={2} aria-label="Has dependency" />}
          <Link href={`/os/tasks/${task.id}`} className="text-sm text-zinc-200 group-hover:text-white truncate hover:underline">
            {task.title}
          </Link>
        </div>

        {showProject && (
          <div className="min-w-0 pr-2">
            {tenant ? (
              <span
                className="inline-block text-[10px] font-medium px-1.5 py-0.5 rounded truncate max-w-full"
                style={{ background: `${color}15`, color, border: `1px solid ${color}25` }}
                title={tenant.name}
              >
                {shortName(tenant.name)}
              </span>
            ) : (
              <span className="text-zinc-700 text-xs">—</span>
            )}
          </div>
        )}

        <div><OSStatusBadge status={task.status} /></div>
        <div><OSPriorityBadge priority={task.priority} /></div>

        <div className="flex items-center gap-1">
          {task.owner_user_id
            ? <OSAvatar userId={task.owner_user_id} size="xs" />
            : <span className="text-zinc-700 text-xs">—</span>}
          {(task.support_user_ids ?? []).slice(0, 2).map((uid) => (
            <OSAvatar key={uid} userId={uid} size="xs" />
          ))}
        </div>

        <div>
          {task.start_date
            ? <span className="text-xs text-zinc-500">{fmtDate(task.start_date)}</span>
            : <span className="text-zinc-700 text-xs">—</span>}
        </div>

        <div>
          {task.due_date ? (
            <span className={cn("text-xs flex items-center gap-1", isOverdue ? "text-red-400" : "text-zinc-500")}>
              {isOverdue && <Clock className="w-3 h-3" strokeWidth={2} />}
              {fmtDate(task.due_date)}
            </span>
          ) : (
            <span className="text-zinc-700 text-xs">—</span>
          )}
        </div>

        <div onClick={(e) => e.preventDefault()}>
          <NotesCell task={task} onSaved={onSaved} />
        </div>
      </div>

      {isExpanded && (
        <div className="px-10 py-3 bg-zinc-950/60 border-t border-zinc-800/60">
          <div className="grid grid-cols-3 gap-6 text-xs text-zinc-400">
            <div>
              <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-1">Description / Notes</p>
              <p className="whitespace-pre-wrap leading-relaxed">{task.description || <span className="text-zinc-700 italic">No description yet.</span>}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-1">Details</p>
              <div className="space-y-1 text-zinc-500">
                <p>Est. time: {task.estimated_minutes}m</p>
                {task.blocked_by_task_id && <p className="text-amber-500">Blocked by: {task.blocked_by_task_id.slice(0, 8)}…</p>}
                {task.blocker_flag && <p className="text-red-400">⚠ This is a blocker</p>}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-1">Actions</p>
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

export default function OSTasksPage() {
  const [search, setSearch] = useState("")
  const [tenantFilter, setTenantFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  const { data: tasks, isLoading, error, mutate: mutateTasks } = useSWR<Task[]>("/api/tasks", fetcher)
  const { data: tenantData } = useSWR<{ tenants: Tenant[] }>("/api/os/tenants", fetcher)

  const tenantMap = useMemo(
    () => new Map<string, Tenant>((tenantData?.tenants ?? []).map((t) => [t.id, t])),
    [tenantData]
  )

  const today = new Date().toISOString().split("T")[0]

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

  const filtered = useMemo(() => (tasks ?? []).filter((t) => {
    const tenant = tenantMap.get(t.tenant_id)
    const tenantName = tenant?.name ?? ""
    return (
      (tenantFilter === "all" || t.tenant_id === tenantFilter) &&
      (t.title.toLowerCase().includes(search.toLowerCase()) || tenantName.toLowerCase().includes(search.toLowerCase())) &&
      (statusFilter === "all" || t.status === statusFilter) &&
      (priorityFilter === "all" || t.priority?.toLowerCase() === priorityFilter)
    )
  }), [tasks, tenantMap, tenantFilter, search, statusFilter, priorityFilter])

  const groups = useMemo(() => {
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

  function fmtDate(d: string | null) {
    if (!d) return null
    const dateStr = d.includes("T") ? d : d + "T00:00:00"
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  function toggleGroup(id: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const showProject = tenantFilter === "all"
  const COLS = showProject
    ? "grid-cols-[28px_1fr_130px_100px_90px_100px_80px_80px_180px]"
    : "grid-cols-[28px_1fr_100px_90px_100px_80px_80px_180px]"
  const MIN_W = showProject ? "min-w-[1100px]" : "min-w-[960px]"
  const onSaved = () => mutateTasks()

  return (
    <div className="space-y-5 max-w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white font-condensed tracking-tight">Tasks</h1>
          <p className="text-sm text-zinc-500 mt-1">
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

      {/* Project pills */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setTenantFilter("all")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
            tenantFilter === "all"
              ? "bg-white/10 text-white border-white/15"
              : "text-zinc-500 border-zinc-800 hover:text-zinc-300 hover:border-zinc-700"
          )}
        >
          <FolderKanban className="w-3 h-3" strokeWidth={1.75} />
          All Projects
          <span className="text-[10px] text-zinc-600 ml-0.5">{tasks?.length ?? 0}</span>
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
                  : "text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-zinc-200"
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

      {/* Status + Priority + Search */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" strokeWidth={1.75} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks…"
            className="w-full pl-8 pr-3 py-2 text-sm bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
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
                statusFilter === s ? "bg-white/10 text-white border border-white/15" : "text-zinc-500 hover:text-zinc-300"
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
                priorityFilter === p ? "bg-white/10 text-white border border-white/15" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              {p === "all" ? "All Priority" : p}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-5 h-5 text-zinc-600 animate-spin" strokeWidth={1.75} />
        </div>
      ) : error ? (
        <div className="px-4 py-3 rounded-lg bg-red-950/40 border border-red-800/40 text-sm text-red-400">
          Failed to load tasks. Please refresh.
        </div>
      ) : filtered.length === 0 ? (
        <OSEmpty icon={ListTodo} title="No tasks found" description="Adjust your filters or create your first task." />
      ) : (
        <div className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-x-auto">
          {/* Column header */}
          <div className={cn("grid gap-0 px-4 py-2.5 border-b border-zinc-800 text-[10px] font-semibold text-zinc-600 uppercase tracking-widest", COLS, MIN_W)}>
            <span />
            <span className="pl-2">Task</span>
            {showProject && <span>Project</span>}
            <span>Status</span>
            <span>Priority</span>
            <span>Owner / Support</span>
            <span>Start</span>
            <span>Due</span>
            <span>Notes</span>
          </div>

          <div className={cn("divide-y divide-zinc-800/60", MIN_W)}>
            {groups ? (
              groups.map(({ tenantId, taskList }) => {
                const tenant = tenantMap.get(tenantId)
                const color = tenantColor(tenant?.color ?? null)
                const isCollapsed = collapsedGroups.has(tenantId)
                const openCount = taskList.filter((t) => t.status !== "done" && t.status !== "cancelled").length
                const doneCount = taskList.filter((t) => t.status === "done").length
                const blockerCount = taskList.filter((t) => t.blocker_flag).length
                const display = tenant ? shortName(tenant.name) : tenantId

                return (
                  <div key={tenantId} className="border-b border-zinc-800/60 last:border-0">
                    <button
                      type="button"
                      onClick={() => toggleGroup(tenantId)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.02] transition-colors text-left"
                      style={{ borderLeft: `2px solid ${color}` }}
                    >
                      {isCollapsed
                        ? <ChevronRight className="w-3 h-3 text-zinc-600" strokeWidth={2} />
                        : <ChevronDown className="w-3 h-3 text-zinc-600" strokeWidth={2} />}
                      <span className="text-xs font-semibold" style={{ color }}>{display}</span>
                      <span className="text-[10px] text-zinc-600">{taskList.length} tasks</span>
                      {openCount > 0 && (
                        <span className="text-[10px] text-zinc-500">{openCount} open</span>
                      )}
                      {doneCount > 0 && (
                        <span className="text-[10px] text-emerald-700">{doneCount} done</span>
                      )}
                      {blockerCount > 0 && (
                        <span className="text-[10px] text-red-600 flex items-center gap-0.5">
                          <AlertTriangle className="w-2.5 h-2.5" strokeWidth={2} />
                          {blockerCount} blocked
                        </span>
                      )}
                    </button>

                    {!isCollapsed && (
                      <div className="divide-y divide-zinc-800/40">
                        {taskList.map((task) => (
                          <TaskRow
                            key={task.id}
                            task={task}
                            tenantMap={tenantMap}
                            today={today}
                            expandedId={expandedId}
                            setExpandedId={setExpandedId}
                            onSaved={onSaved}
                            fmtDate={fmtDate}
                            showProject={false}
                            cols={COLS}
                            minW={MIN_W}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })
            ) : (
              filtered.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  tenantMap={tenantMap}
                  today={today}
                  expandedId={expandedId}
                  setExpandedId={setExpandedId}
                  onSaved={onSaved}
                  fmtDate={fmtDate}
                  showProject={false}
                  cols={COLS}
                  minW={MIN_W}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
