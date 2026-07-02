"use client"

import { use, useRef, useState, useEffect } from "react"
import Link from "next/link"
import useSWR from "swr"
import ReactMarkdown from "react-markdown"
import { createClient } from "@/lib/supabase/client"
import { ArrowLeft, Clock, AlertTriangle, GitMerge, Loader2, AlertCircle, Bot, PencilLine, LayoutGrid, Table2, GanttChartSquare, FileText, Check, X, Rocket, Plus, CalendarDays, BarChart3, BookOpen } from "lucide-react"
import { OSPriorityBadge } from "@/components/byred/os/os-badge"
import { OSAvatar } from "@/components/byred/os/os-avatar"
import { cn } from "@/lib/utils"

type Task = {
  id: string; title: string; status: string; priority: string; tenant_id: string
  owner_user_id: string | null; due_date: string | null; start_date: string | null
  blocker_flag: boolean; blocked_by_task_id: string | null; estimated_minutes: number
  ai_mode: string; epic: string | null; order_index: number
  issue_type: string | null; story_points: number | null; labels: string[] | null
  sprint_id: string | null
}
type Project = { id: string; name: string; description: string | null; overview: string | null; status: string; tenant_id: string }
type Member = { id: string; name: string }
type Sprint = { id: string; name: string; goal: string | null; status: string; start_date: string | null; end_date: string | null }

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const KANBAN_COLUMNS = [
  { id: "not_started", label: "Not Started", border: "border-[#2A2D35]",   count: "text-[#9CA3AF]",  bg: "bg-[#1A1D24]/50",   db: "border-[#2A2D35]" },
  { id: "in_progress", label: "In Progress", border: "border-yellow-700", count: "text-yellow-400", bg: "bg-yellow-950/30", db: "border-yellow-600" },
  { id: "blocked",     label: "Blocked",     border: "border-red-700",    count: "text-red-400",    bg: "bg-red-950/30",    db: "border-red-600" },
  { id: "done",        label: "Done",        border: "border-green-700",  count: "text-green-400",  bg: "bg-green-950/30",  db: "border-green-600" },
]
const STATUS_LABEL: Record<string, string> = { not_started: "Not Started", in_progress: "In Progress", blocked: "Blocked", done: "Done" }
const PRIORITIES = ["critical", "high", "medium", "low"]
const TYPE: Record<string, { label: string; color: string }> = {
  epic: { label: "Epic", color: "#A78BFA" }, story: { label: "Story", color: "#4ADE80" },
  task: { label: "Task", color: "#60A5FA" }, subtask: { label: "Subtask", color: "#9CA3AF" }, bug: { label: "Bug", color: "#F87171" },
}
const AI_BADGE: Record<string, { label: string; icon: typeof Bot; color: string } | undefined> = {
  AI_EXECUTE: { label: "AI does it", icon: Bot, color: "#4ADE80" },
  AI_DRAFT: { label: "AI drafts", icon: PencilLine, color: "#FBBF24" },
}
const TABS = [
  { id: "overview", label: "Overview", icon: FileText },
  { id: "board", label: "Board", icon: LayoutGrid },
  { id: "table", label: "Table", icon: Table2 },
  { id: "sprints", label: "Sprints", icon: Rocket },
  { id: "timeline", label: "Timeline", icon: GanttChartSquare },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "dashboard", label: "Dashboard", icon: BarChart3 },
  { id: "docs", label: "Docs", icon: BookOpen },
] as const
type TabId = (typeof TABS)[number]["id"]

function TypeBadge({ type }: { type: string | null }) {
  const t = TYPE[type ?? "task"] ?? TYPE.task
  return <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ color: t.color, backgroundColor: `${t.color}1f` }}>{t.label}</span>
}

function TaskCard({ task, onDragStart, isDragging }: { task: Task; onDragStart: (id: string) => void; isDragging: boolean }) {
  const today = new Date().toISOString().split("T")[0]
  const isOverdue = task.due_date && task.due_date < today && task.status !== "done"
  const ai = AI_BADGE[task.ai_mode]
  return (
    <div
      draggable
      onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; onDragStart(task.id) }}
      className={cn("p-3 rounded-lg bg-[#1A1D24] border border-[#2A2D35]/60 transition-all cursor-grab active:cursor-grabbing select-none",
        task.blocker_flag && "border-red-800/60 bg-red-950/20", isDragging && "opacity-40 scale-95")}
    >
      {task.blocker_flag && <div className="flex items-center gap-1.5 mb-2"><AlertTriangle className="w-3 h-3 text-red-400" strokeWidth={2} /><span className="text-[10px] text-red-400 font-medium">Blocker</span></div>}
      {task.blocked_by_task_id && !task.blocker_flag && <div className="flex items-center gap-1.5 mb-2"><GitMerge className="w-3 h-3 text-yellow-400" strokeWidth={2} /><span className="text-[10px] text-yellow-400 font-medium">Has dependency</span></div>}
      <Link href={`/os/tasks/${task.id}`} className="block text-xs font-medium text-white hover:text-white leading-relaxed mb-2.5" onClick={(e) => e.stopPropagation()}>{task.title}</Link>
      <div className="flex items-center gap-1.5 flex-wrap mb-3">
        <TypeBadge type={task.issue_type} />
        <OSPriorityBadge priority={task.priority} />
        {task.story_points != null && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#2A2D35] text-[#D1D5DB] font-mono">{task.story_points} pt</span>}
        {ai && <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ color: ai.color, backgroundColor: `${ai.color}1f` }}><ai.icon className="w-2.5 h-2.5" /> {ai.label}</span>}
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[10px] text-[#6B7280]">
          {task.due_date && <div className={cn("flex items-center gap-1", isOverdue && "text-red-400")}><Clock className="w-3 h-3" strokeWidth={1.75} />{new Date(task.due_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>}
        </div>
        {task.owner_user_id && <OSAvatar userId={task.owner_user_id} size="xs" />}
      </div>
    </div>
  )
}

export default function ProjectBoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data, isLoading, error, mutate } = useSWR<{ project: Project; tasks: Task[]; sprints: Sprint[] }>(`/api/os/projects/${id}`, fetcher)
  const { data: memberData } = useSWR<{ members: Member[] }>("/api/os/members", fetcher)
  const members = memberData?.members ?? []

  const [tab, setTab] = useState<TabId>("overview")
  const [editingOverview, setEditingOverview] = useState(false)
  const [overviewDraft, setOverviewDraft] = useState("")
  const draggingId = useRef<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const [filters, setFilters] = useState<{ owner: string; status: string; epic: string; type: string; sprint: string; q: string }>({ owner: "", status: "", epic: "", type: "", sprint: "", q: "" })

  async function patchTask(taskId: string, fields: Record<string, unknown>) {
    mutate((prev) => prev ? { ...prev, tasks: prev.tasks.map((t) => t.id === taskId ? { ...t, ...fields } : t) } : prev, false)
    const res = await fetch(`/api/tasks/${taskId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(fields) })
    if (!res.ok) mutate()
  }
  async function handleDrop(targetStatus: string) {
    const tid = draggingId.current; draggingId.current = null; setDragOver(null)
    if (!tid) return
    const task = data?.tasks.find((t) => t.id === tid)
    if (!task || task.status === targetStatus) return
    await patchTask(tid, { status: targetStatus })
  }
  async function createSprint() {
    const n = (data?.sprints.length ?? 0) + 1
    const start = new Date(); const end = new Date(Date.now() + 14 * 86400000)
    const iso = (d: Date) => d.toISOString().slice(0, 10)
    await fetch("/api/os/sprints", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_id: id, name: `Sprint ${n}`, start_date: iso(start), end_date: iso(end) }),
    })
    mutate()
  }
  async function patchSprint(sprintId: string, fields: Record<string, unknown>) {
    mutate((prev) => prev ? { ...prev, sprints: prev.sprints.map((s) => s.id === sprintId ? { ...s, ...fields } : s) } : prev, false)
    await fetch(`/api/os/sprints/${sprintId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(fields) })
    mutate()
  }
  async function saveOverview() {
    mutate((prev) => prev ? { ...prev, project: { ...prev.project, overview: overviewDraft } } : prev, false)
    setEditingOverview(false)
    await fetch(`/api/os/projects/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ overview: overviewDraft }) })
  }
  const [savedTemplate, setSavedTemplate] = useState(false)
  async function saveAsTemplate() {
    const res = await fetch("/api/os/templates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ from_project_id: id }) })
    if (res.ok) { setSavedTemplate(true); setTimeout(() => setSavedTemplate(false), 2500) }
  }
  const [statusGen, setStatusGen] = useState<"idle" | "loading" | "done">("idle")
  async function generateStatus() {
    setStatusGen("loading")
    const res = await fetch(`/api/os/projects/${id}/status`, { method: "POST" })
    setStatusGen(res.ok ? "done" : "idle")
    if (res.ok) { mutate(); setTab("docs"); setTimeout(() => setStatusGen("idle"), 2500) }
  }

  // Live board — refetch when anyone changes a task in this project.
  useEffect(() => {
    const supabase = createClient()
    const ch = supabase
      .channel(`project:${id}`)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "byred_tasks", filter: `project_id=eq.${id}` }, () => mutate())
      .subscribe()
    return () => { void supabase.removeChannel(ch) }
  }, [id, mutate])

  if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-5 h-5 text-[#6B7280] animate-spin" /></div>
  if (error || !data?.project) return <div className="flex items-center gap-2.5 px-4 py-3 rounded-lg bg-red-950/40 border border-red-800/40 text-red-400 text-sm"><AlertCircle className="w-4 h-4 shrink-0" /> Failed to load this project.</div>

  const { project, tasks, sprints } = data
  const total = tasks.length
  const done = tasks.filter((t) => t.status === "done").length
  const pct = total ? Math.round((done / total) * 100) : 0
  const points = tasks.reduce((s, t) => s + (t.story_points ?? 0), 0)

  // Apply filters (Board/Table/Timeline/Calendar respect them; Dashboard uses all).
  const filtered = tasks.filter((t) =>
    (!filters.owner || t.owner_user_id === filters.owner) &&
    (!filters.status || t.status === filters.status) &&
    (!filters.epic || (t.epic ?? "General") === filters.epic) &&
    (!filters.type || (t.issue_type ?? "task") === filters.type) &&
    (!filters.sprint || (filters.sprint === "__backlog__" ? !t.sprint_id : t.sprint_id === filters.sprint)) &&
    (!filters.q || t.title.toLowerCase().includes(filters.q.toLowerCase()))
  )
  const allEpics = Array.from(new Set(tasks.map((t) => t.epic ?? "General")))
  const filtersActive = !!(filters.owner || filters.status || filters.epic || filters.type || filters.sprint || filters.q)

  // Group filtered by epic (first-seen order)
  const epics: string[] = []
  const byEpic = new Map<string, Task[]>()
  for (const t of filtered) {
    const e = t.epic ?? "General"
    if (!byEpic.has(e)) { byEpic.set(e, []); epics.push(e) }
    byEpic.get(e)!.push(t)
  }
  const selCls = "bg-[#111318] border border-[#2A2D35] rounded px-2 py-1 text-[11px] text-[#9CA3AF]"
  const showFilters = tab === "board" || tab === "table" || tab === "timeline" || tab === "calendar"

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link href="/os/projects" className="w-7 h-7 mt-0.5 rounded-lg bg-[#1A1D24] border border-[#2A2D35] flex items-center justify-center"><ArrowLeft className="w-3.5 h-3.5 text-[#9CA3AF]" strokeWidth={1.75} /></Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold text-white">{project.name}</h1>
          {project.description && <p className="text-xs text-[#9CA3AF] mt-0.5">{project.description}</p>}
          <div className="flex items-center gap-3 mt-2">
            <div className="h-1.5 w-40 bg-[#1A1D24] rounded-full overflow-hidden"><div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${pct}%` }} /></div>
            <span className="text-[11px] text-[#9CA3AF] font-mono">{done}/{total} done · {pct}% · {points} pts</span>
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <button onClick={generateStatus} disabled={statusGen === "loading"} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#1A1D24] border border-[#2A2D35] text-[11px] text-[#9CA3AF] hover:text-white disabled:opacity-50">
            {statusGen === "loading" ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating…</> : statusGen === "done" ? <><Check className="w-3.5 h-3.5 text-green-400" /> Added to Docs</> : <><FileText className="w-3.5 h-3.5" /> Status update</>}
          </button>
          <button onClick={saveAsTemplate} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#1A1D24] border border-[#2A2D35] text-[11px] text-[#9CA3AF] hover:text-white">
            {savedTemplate ? <><Check className="w-3.5 h-3.5 text-green-400" /> Saved</> : <><BookOpen className="w-3.5 h-3.5" /> Save as template</>}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-[#2A2D35]">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn("flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors",
              tab === t.id ? "border-[#D92532] text-white" : "border-transparent text-[#9CA3AF] hover:text-white")}>
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {/* Filter bar */}
      {showFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          <input value={filters.q} onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))} placeholder="Search…" className={selCls + " w-40"} />
          <select value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))} className={selCls}>
            <option value="">All status</option>{Object.keys(STATUS_LABEL).map((k) => <option key={k} value={k} className="bg-[#1A1D24]">{STATUS_LABEL[k]}</option>)}
          </select>
          <select value={filters.owner} onChange={(e) => setFilters((f) => ({ ...f, owner: e.target.value }))} className={selCls}>
            <option value="">All owners</option>{members.map((m) => <option key={m.id} value={m.id} className="bg-[#1A1D24]">{m.name}</option>)}
          </select>
          <select value={filters.epic} onChange={(e) => setFilters((f) => ({ ...f, epic: e.target.value }))} className={selCls}>
            <option value="">All epics</option>{allEpics.map((e) => <option key={e} value={e} className="bg-[#1A1D24]">{e}</option>)}
          </select>
          <select value={filters.type} onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))} className={selCls}>
            <option value="">All types</option>{Object.keys(TYPE).map((k) => <option key={k} value={k} className="bg-[#1A1D24]">{TYPE[k].label}</option>)}
          </select>
          <select value={filters.sprint} onChange={(e) => setFilters((f) => ({ ...f, sprint: e.target.value }))} className={selCls}>
            <option value="">All sprints</option><option value="__backlog__" className="bg-[#1A1D24]">Backlog</option>
            {sprints.map((s) => <option key={s.id} value={s.id} className="bg-[#1A1D24]">{s.name}</option>)}
          </select>
          {filtersActive && <button onClick={() => setFilters({ owner: "", status: "", epic: "", type: "", sprint: "", q: "" })} className="text-[11px] text-[#D92532] px-2 py-1">Clear</button>}
          <span className="text-[10px] text-[#6B7280] font-mono ml-auto">{filtered.length}/{total}</span>
        </div>
      )}

      {/* OVERVIEW */}
      {tab === "overview" && (
        <div className="rounded-xl border border-[#2A2D35] bg-[#0E0F13]/40 p-5">
          {editingOverview ? (
            <div className="space-y-3">
              <textarea value={overviewDraft} onChange={(e) => setOverviewDraft(e.target.value)} rows={20}
                className="w-full rounded-lg bg-[#0E0F13] border border-[#2A2D35] px-3 py-2.5 text-sm text-white font-mono leading-relaxed" />
              <div className="flex gap-2">
                <button onClick={saveOverview} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D92532] text-white text-xs font-medium"><Check className="w-3.5 h-3.5" /> Save</button>
                <button onClick={() => setEditingOverview(false)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1A1D24] border border-[#2A2D35] text-xs text-[#9CA3AF]"><X className="w-3.5 h-3.5" /> Cancel</button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex justify-end mb-2">
                <button onClick={() => { setOverviewDraft(project.overview ?? ""); setEditingOverview(true) }} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1A1D24] border border-[#2A2D35] text-[11px] text-[#9CA3AF] hover:text-white"><PencilLine className="w-3 h-3" /> Edit</button>
              </div>
              {project.overview
                ? <div className="prose prose-invert prose-sm max-w-none text-[#D1D5DB] [&_h2]:text-white [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mt-4 [&_h1]:text-white [&_li]:my-0.5"><ReactMarkdown>{project.overview}</ReactMarkdown></div>
                : <p className="text-sm text-[#6B7280]">No overview yet. Click Edit to write the project brief.</p>}
            </div>
          )}
        </div>
      )}

      {/* BOARD — epic swimlanes × status kanban */}
      {tab === "board" && epics.map((epic) => {
        const epicTasks = byEpic.get(epic)!
        return (
          <div key={epic} className="rounded-xl border border-[#2A2D35] bg-[#0E0F13]/40 p-4">
            <div className="flex items-center gap-2 mb-3"><span className="text-sm font-semibold text-white">{epic}</span><span className="text-[10px] text-[#6B7280] font-mono">{epicTasks.length}</span></div>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {KANBAN_COLUMNS.map((col) => {
                const colTasks = epicTasks.filter((t) => t.status === col.id)
                const key = `${epic}::${col.id}`; const isOver = dragOver === key
                return (
                  <div key={col.id} className="flex-shrink-0 w-64"
                    onDragOver={(e) => { e.preventDefault(); setDragOver(key) }}
                    onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(null) }}
                    onDrop={() => handleDrop(col.id)}>
                    <div className={cn("flex items-center justify-between mb-2 pb-1.5 border-b", col.border)}><span className="text-[11px] font-semibold text-[#9CA3AF]">{col.label}</span><span className={cn("text-[11px] font-mono font-bold", col.count)}>{colTasks.length}</span></div>
                    <div className={cn("min-h-[60px] rounded-lg space-y-2 p-1 transition-all", isOver && `${col.bg} border-2 border-dashed ${col.db}`)}>
                      {colTasks.map((task) => <TaskCard key={task.id} task={task} onDragStart={(tid) => { draggingId.current = tid }} isDragging={draggingId.current === task.id} />)}
                      {colTasks.length === 0 && <div className="h-14 rounded-lg border border-dashed border-[#2A2D35] flex items-center justify-center"><span className="text-[10px] text-[#6B7280]">{isOver ? "Release" : "—"}</span></div>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* TABLE — Monday-style inline-editable grid */}
      {tab === "table" && (
        <div className="overflow-x-auto rounded-xl border border-[#2A2D35]">
          <table className="w-full text-xs">
            <thead className="bg-[#111318] text-[#9CA3AF]">
              <tr className="text-left [&_th]:px-3 [&_th]:py-2 [&_th]:font-medium [&_th]:whitespace-nowrap">
                <th>Task</th><th>Epic</th><th>Type</th><th>Status</th><th>Owner</th><th>Priority</th><th>Pts</th><th>Start</th><th>Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A2D35]">
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-[#111318]/60 [&_td]:px-3 [&_td]:py-1.5 [&_td]:align-middle">
                  <td className="max-w-[260px]"><Link href={`/os/tasks/${t.id}`} className="text-white hover:underline line-clamp-1">{t.title}</Link></td>
                  <td className="text-[#9CA3AF] whitespace-nowrap">{t.epic ?? "—"}</td>
                  <td>
                    <select value={t.issue_type ?? "task"} onChange={(e) => patchTask(t.id, { issue_type: e.target.value })} className="bg-transparent border border-[#2A2D35] rounded px-1.5 py-1 text-white">
                      {Object.keys(TYPE).map((k) => <option key={k} value={k} className="bg-[#1A1D24]">{TYPE[k].label}</option>)}
                    </select>
                  </td>
                  <td>
                    <select value={t.status} onChange={(e) => patchTask(t.id, { status: e.target.value })} className="bg-transparent border border-[#2A2D35] rounded px-1.5 py-1 text-white">
                      {Object.keys(STATUS_LABEL).map((k) => <option key={k} value={k} className="bg-[#1A1D24]">{STATUS_LABEL[k]}</option>)}
                    </select>
                  </td>
                  <td>
                    <select value={t.owner_user_id ?? ""} onChange={(e) => patchTask(t.id, { owner_user_id: e.target.value || null })} className="bg-transparent border border-[#2A2D35] rounded px-1.5 py-1 text-white max-w-[120px]">
                      <option value="" className="bg-[#1A1D24]">Unassigned</option>
                      {members.map((m) => <option key={m.id} value={m.id} className="bg-[#1A1D24]">{m.name}</option>)}
                    </select>
                  </td>
                  <td>
                    <select value={t.priority} onChange={(e) => patchTask(t.id, { priority: e.target.value })} className="bg-transparent border border-[#2A2D35] rounded px-1.5 py-1 text-white">
                      {PRIORITIES.map((p) => <option key={p} value={p} className="bg-[#1A1D24]">{p}</option>)}
                    </select>
                  </td>
                  <td><input type="number" value={t.story_points ?? ""} onChange={(e) => patchTask(t.id, { story_points: e.target.value === "" ? null : Number(e.target.value) })} className="w-12 bg-transparent border border-[#2A2D35] rounded px-1.5 py-1 text-white" /></td>
                  <td><input type="date" value={t.start_date ?? ""} onChange={(e) => patchTask(t.id, { start_date: e.target.value || null })} className="bg-transparent border border-[#2A2D35] rounded px-1.5 py-1 text-[#D1D5DB]" /></td>
                  <td><input type="date" value={t.due_date ?? ""} onChange={(e) => patchTask(t.id, { due_date: e.target.value || null })} className="bg-transparent border border-[#2A2D35] rounded px-1.5 py-1 text-[#D1D5DB]" /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {total === 0 && <p className="text-sm text-[#9CA3AF] p-4">No tasks yet.</p>}
        </div>
      )}

      {/* SPRINTS — backlog + sprints with assign, velocity, burndown */}
      {tab === "sprints" && (
        <SprintsView tasks={tasks} sprints={sprints} onCreate={createSprint}
          onAssign={(taskId, sprintId) => patchTask(taskId, { sprint_id: sprintId })}
          onSprintStatus={(sid, status) => patchSprint(sid, { status })} />
      )}

      {/* TIMELINE — lightweight bars from start_date → due_date */}
      {tab === "timeline" && <Timeline tasks={filtered} epics={epics} byEpic={byEpic} />}

      {/* CALENDAR — month grid by due date */}
      {tab === "calendar" && <CalendarView tasks={filtered} />}

      {/* DASHBOARD — project KPIs (always whole project, ignores filters) */}
      {tab === "dashboard" && <Dashboard tasks={tasks} members={members} />}

      {/* DOCS — Confluence-style project wiki */}
      {tab === "docs" && <DocsView projectId={project.id} tasks={tasks} />}

      {total === 0 && tab !== "overview" && tab !== "dashboard" && <p className="text-sm text-[#9CA3AF]">No tasks in this project yet.</p>}
    </div>
  )
}

function SprintRows({ rows, sprints, onAssign }: { rows: Task[]; sprints: Sprint[]; onAssign: (taskId: string, sprintId: string | null) => void }) {
  if (rows.length === 0) return <p className="text-[11px] text-[#6B7280] px-1 py-2">No tasks here.</p>
  return (
    <div className="space-y-1">
      {rows.map((t) => (
        <div key={t.id} className="flex items-center gap-2 px-2 py-1.5 rounded bg-[#1A1D24] border border-[#2A2D35]/60">
          <TypeBadge type={t.issue_type} />
          <Link href={`/os/tasks/${t.id}`} className="flex-1 min-w-0 text-xs text-white truncate hover:underline">{t.title}</Link>
          {t.story_points != null && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#2A2D35] text-[#D1D5DB] font-mono">{t.story_points}</span>}
          {t.owner_user_id && <OSAvatar userId={t.owner_user_id} size="xs" />}
          <select value={t.sprint_id ?? ""} onChange={(e) => onAssign(t.id, e.target.value || null)} className="bg-transparent border border-[#2A2D35] rounded px-1.5 py-1 text-[10px] text-[#9CA3AF] max-w-[110px]">
            <option value="" className="bg-[#1A1D24]">Backlog</option>
            {sprints.map((s) => <option key={s.id} value={s.id} className="bg-[#1A1D24]">{s.name}</option>)}
          </select>
        </div>
      ))}
    </div>
  )
}

function SprintsView({ tasks, sprints, onCreate, onAssign, onSprintStatus }: {
  tasks: Task[]; sprints: Sprint[]
  onCreate: () => void
  onAssign: (taskId: string, sprintId: string | null) => void
  onSprintStatus: (sprintId: string, status: string) => void
}) {
  const backlog = tasks.filter((t) => !t.sprint_id)
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={onCreate} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1A1D24] border border-[#2A2D35] text-xs text-[#9CA3AF] hover:text-white"><Plus className="w-3.5 h-3.5" /> New sprint</button>
      </div>

      {sprints.map((sprint) => {
        const st = tasks.filter((t) => t.sprint_id === sprint.id)
        const totalPts = st.reduce((s, t) => s + (t.story_points ?? 0), 0)
        const donePts = st.filter((t) => t.status === "done").reduce((s, t) => s + (t.story_points ?? 0), 0)
        const pct = totalPts ? Math.round((donePts / totalPts) * 100) : 0
        const statusColor = sprint.status === "active" ? "#4ADE80" : sprint.status === "completed" ? "#9CA3AF" : "#FBBF24"
        return (
          <div key={sprint.id} className="rounded-xl border border-[#2A2D35] bg-[#0E0F13]/40 p-4">
            <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Rocket className="w-4 h-4 text-[#D92532]" />
                <span className="text-sm font-semibold text-white">{sprint.name}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium uppercase" style={{ color: statusColor, backgroundColor: `${statusColor}1f` }}>{sprint.status}</span>
                {sprint.start_date && <span className="text-[10px] text-[#6B7280]">{sprint.start_date} → {sprint.end_date ?? "?"}</span>}
              </div>
              <div className="flex items-center gap-2">
                {sprint.status === "planned" && <button onClick={() => onSprintStatus(sprint.id, "active")} className="px-2 py-1 rounded bg-green-900/40 border border-green-700/50 text-[10px] text-green-300">Start</button>}
                {sprint.status === "active" && <button onClick={() => onSprintStatus(sprint.id, "completed")} className="px-2 py-1 rounded bg-[#1A1D24] border border-[#2A2D35] text-[10px] text-[#9CA3AF]">Complete</button>}
              </div>
            </div>
            {/* velocity + burndown */}
            <div className="flex items-center gap-3 mb-3">
              <div className="h-1.5 flex-1 max-w-xs bg-[#1A1D24] rounded-full overflow-hidden"><div className="h-full bg-green-500 rounded-full" style={{ width: `${pct}%` }} /></div>
              <span className="text-[10px] text-[#9CA3AF] font-mono">{donePts}/{totalPts} pts done · {st.length} tasks · {totalPts - donePts} pts left</span>
            </div>
            <SprintRows rows={st} sprints={sprints} onAssign={onAssign} />
          </div>
        )
      })}

      <div className="rounded-xl border border-dashed border-[#2A2D35] bg-transparent p-4">
        <div className="flex items-center gap-2 mb-2"><span className="text-sm font-semibold text-[#9CA3AF]">Backlog</span><span className="text-[10px] text-[#6B7280] font-mono">{backlog.length}</span></div>
        <SprintRows rows={backlog} sprints={sprints} onAssign={onAssign} />
      </div>
    </div>
  )
}

function Timeline({ tasks, epics, byEpic }: { tasks: Task[]; epics: string[]; byEpic: Map<string, Task[]> }) {
  const dated = tasks.filter((t) => t.start_date || t.due_date)
  if (dated.length === 0) return <p className="text-sm text-[#6B7280]">No tasks have dates yet. Set start/due dates in the Table view to populate the timeline.</p>

  const times = dated.flatMap((t) => [t.start_date, t.due_date].filter(Boolean).map((d) => new Date(d + "T00:00:00").getTime()))
  const min = Math.min(...times)
  const max = Math.max(...times)
  const span = Math.max(1, max - min)
  const fmt = (ms: number) => new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric" })

  const bar = (t: Task) => {
    const s = t.start_date ? new Date(t.start_date + "T00:00:00").getTime() : (t.due_date ? new Date(t.due_date + "T00:00:00").getTime() : min)
    const e = t.due_date ? new Date(t.due_date + "T00:00:00").getTime() : s
    const left = ((s - min) / span) * 100
    const width = Math.max(2, ((Math.max(e, s) - s) / span) * 100)
    const color = t.status === "done" ? "#22C55E" : t.blocker_flag ? "#EF4444" : "#D92532"
    return { left, width, color }
  }

  return (
    <div className="rounded-xl border border-[#2A2D35] bg-[#0E0F13]/40 p-4 space-y-4">
      <div className="flex justify-between text-[10px] text-[#6B7280] font-mono"><span>{fmt(min)}</span><span>{fmt(max)}</span></div>
      {epics.map((epic) => {
        const rows = byEpic.get(epic)!.filter((t) => t.start_date || t.due_date)
        if (rows.length === 0) return null
        return (
          <div key={epic} className="space-y-1.5">
            <span className="text-[11px] font-semibold text-[#9CA3AF]">{epic}</span>
            {rows.map((t) => {
              const b = bar(t)
              return (
                <div key={t.id} className="flex items-center gap-3">
                  <Link href={`/os/tasks/${t.id}`} className="w-44 shrink-0 text-[11px] text-[#D1D5DB] truncate hover:underline">{t.title}</Link>
                  <div className="relative flex-1 h-5 bg-[#1A1D24] rounded">
                    <div className="absolute h-5 rounded flex items-center px-1.5" style={{ left: `${b.left}%`, width: `${b.width}%`, background: b.color }} title={`${t.start_date ?? "?"} → ${t.due_date ?? "?"}`}>
                      {t.story_points != null && <span className="text-[9px] text-white/90 font-mono">{t.story_points}</span>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

const STATUS_DOT: Record<string, string> = { done: "#22C55E", blocked: "#EF4444", in_progress: "#FBBF24", not_started: "#6B7280" }

function CalendarView({ tasks }: { tasks: Task[] }) {
  const [offset, setOffset] = useState(0)
  const base = new Date(); base.setDate(1); base.setMonth(base.getMonth() + offset)
  const year = base.getFullYear(); const month = base.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const label = base.toLocaleDateString("en-US", { month: "long", year: "numeric" })
  const byDay = new Map<number, Task[]>()
  for (const t of tasks) {
    if (!t.due_date) continue
    const d = new Date(t.due_date + "T00:00:00")
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate(); if (!byDay.has(day)) byDay.set(day, []); byDay.get(day)!.push(t)
    }
  }
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
  const undated = tasks.filter((t) => !t.due_date).length
  return (
    <div className="rounded-xl border border-[#2A2D35] bg-[#0E0F13]/40 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-white">{label}</span>
        <div className="flex items-center gap-2">
          {undated > 0 && <span className="text-[10px] text-[#6B7280]">{undated} undated</span>}
          <button onClick={() => setOffset((o) => o - 1)} className="px-2 py-1 rounded bg-[#1A1D24] border border-[#2A2D35] text-[11px] text-[#9CA3AF]">‹</button>
          <button onClick={() => setOffset(0)} className="px-2 py-1 rounded bg-[#1A1D24] border border-[#2A2D35] text-[11px] text-[#9CA3AF]">Today</button>
          <button onClick={() => setOffset((o) => o + 1)} className="px-2 py-1 rounded bg-[#1A1D24] border border-[#2A2D35] text-[11px] text-[#9CA3AF]">›</button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-[10px] text-[#6B7280] mb-1">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d} className="px-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => (
          <div key={i} className={cn("min-h-[72px] rounded-lg p-1", day ? "bg-[#111318] border border-[#2A2D35]/60" : "")}>
            {day && <div className="text-[10px] text-[#6B7280] mb-1">{day}</div>}
            <div className="space-y-0.5">
              {(byDay.get(day ?? -1) ?? []).slice(0, 4).map((t) => (
                <Link key={t.id} href={`/os/tasks/${t.id}`} className="flex items-center gap-1 text-[9px] text-[#D1D5DB] truncate hover:underline">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: STATUS_DOT[t.status] ?? "#6B7280" }} />
                  <span className="truncate">{t.title}</span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Dashboard({ tasks, members }: { tasks: Task[]; members: Member[] }) {
  const nameOf = (id: string | null) => (id ? members.find((m) => m.id === id)?.name ?? "Unknown" : "Unassigned")
  const total = tasks.length
  const done = tasks.filter((t) => t.status === "done").length
  const inProg = tasks.filter((t) => t.status === "in_progress").length
  const blocked = tasks.filter((t) => t.blocker_flag).length
  const pts = tasks.reduce((s, t) => s + (t.story_points ?? 0), 0)
  const donePts = tasks.filter((t) => t.status === "done").reduce((s, t) => s + (t.story_points ?? 0), 0)

  const owners = new Map<string, { count: number; done: number; pts: number }>()
  for (const t of tasks) {
    const k = t.owner_user_id ?? "__none__"
    const o = owners.get(k) ?? { count: 0, done: 0, pts: 0 }
    o.count++; if (t.status === "done") o.done++; o.pts += t.story_points ?? 0
    owners.set(k, o)
  }
  const epicRows = Array.from(new Set(tasks.map((t) => t.epic ?? "General"))).map((e) => {
    const et = tasks.filter((t) => (t.epic ?? "General") === e)
    return { epic: e, total: et.length, done: et.filter((t) => t.status === "done").length }
  })
  const blockers = tasks.filter((t) => t.blocker_flag)

  const Stat = ({ label, value, color }: { label: string; value: string | number; color?: string }) => (
    <div className="rounded-xl border border-[#2A2D35] bg-[#111318] p-4">
      <div className="text-2xl font-bold" style={{ color: color ?? "#fff" }}>{value}</div>
      <div className="text-[11px] text-[#9CA3AF] mt-0.5">{label}</div>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Total tasks" value={total} />
        <Stat label="Done" value={`${done}/${total}`} color="#22C55E" />
        <Stat label="In progress" value={inProg} color="#FBBF24" />
        <Stat label="Blocked" value={blocked} color={blocked ? "#EF4444" : "#fff"} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-[#2A2D35] bg-[#0E0F13]/40 p-4">
          <h3 className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-widest mb-3">Points · {donePts}/{pts} done</h3>
          <div className="h-2 bg-[#1A1D24] rounded-full overflow-hidden mb-4"><div className="h-full bg-green-500 rounded-full" style={{ width: `${pts ? (donePts / pts) * 100 : 0}%` }} /></div>
          <h3 className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-widest mb-2">Team load</h3>
          <div className="space-y-2">
            {Array.from(owners.entries()).sort((a, b) => b[1].count - a[1].count).map(([k, o]) => (
              <div key={k} className="flex items-center gap-2">
                {k !== "__none__" ? <OSAvatar userId={k} size="xs" /> : <div className="w-5 h-5 rounded-full bg-[#1A1D24] border border-[#2A2D35]" />}
                <span className="text-xs text-[#D1D5DB] flex-1 truncate">{nameOf(k === "__none__" ? null : k)}</span>
                <span className="text-[10px] text-[#9CA3AF] font-mono">{o.done}/{o.count} · {o.pts}pt</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-[#2A2D35] bg-[#0E0F13]/40 p-4">
          <h3 className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-widest mb-3">Epic progress</h3>
          <div className="space-y-2.5">
            {epicRows.map((r) => {
              const p = r.total ? Math.round((r.done / r.total) * 100) : 0
              return (
                <div key={r.epic}>
                  <div className="flex justify-between text-[11px] mb-0.5"><span className="text-[#D1D5DB] truncate">{r.epic}</span><span className="text-[#9CA3AF] font-mono">{r.done}/{r.total}</span></div>
                  <div className="h-1.5 bg-[#1A1D24] rounded-full overflow-hidden"><div className="h-full bg-[#D92532] rounded-full" style={{ width: `${p}%` }} /></div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
      {blockers.length > 0 && (
        <div className="rounded-xl border border-red-800/40 bg-red-950/20 p-4">
          <h3 className="text-xs font-semibold text-red-400 uppercase tracking-widest mb-2">Blockers ({blockers.length})</h3>
          <div className="space-y-1">
            {blockers.map((t) => (
              <Link key={t.id} href={`/os/tasks/${t.id}`} className="flex items-center gap-2 text-xs text-[#D1D5DB] hover:underline">
                <AlertTriangle className="w-3 h-3 text-red-400 shrink-0" /><span className="truncate">{t.title}</span>
                {t.owner_user_id && <span className="text-[10px] text-[#6B7280] ml-auto">{nameOf(t.owner_user_id)}</span>}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

type Doc = { id: string; title: string; content: string | null; doc_type: string; status: string; linked_task_id: string | null; updated_at: string }
const DOC_TYPES = ["note", "decision", "spec", "prd", "meeting", "wiki"]

function DocsView({ projectId, tasks }: { projectId: string; tasks: Task[] }) {
  const { data, mutate } = useSWR<{ docs: Doc[] }>(`/api/os/projects/${projectId}/docs`, (u: string) => fetch(u).then((r) => r.json()))
  const docs = data?.docs ?? []
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<{ title: string; content: string; doc_type: string; linked_task_id: string | null }>({ title: "", content: "", doc_type: "note", linked_task_id: null })

  const selected = docs.find((d) => d.id === selectedId) ?? null

  async function createDoc() {
    const res = await fetch(`/api/os/projects/${projectId}/docs`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Untitled doc", content: "", doc_type: "note" }),
    })
    const created = await res.json()
    await mutate()
    if (created?.id) { setSelectedId(created.id); setDraft({ title: created.title, content: created.content ?? "", doc_type: created.doc_type, linked_task_id: created.linked_task_id }); setEditing(true) }
  }
  async function saveDoc() {
    if (!selected) return
    await fetch(`/api/os/docs/${selected.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) })
    setEditing(false)
    mutate()
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4">
      {/* Doc list */}
      <div className="space-y-2">
        <button onClick={createDoc} className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1A1D24] border border-[#2A2D35] text-xs text-[#9CA3AF] hover:text-white"><Plus className="w-3.5 h-3.5" /> New doc</button>
        {docs.length === 0 && <p className="text-[11px] text-[#6B7280] px-1">No docs yet.</p>}
        {docs.map((d) => (
          <button key={d.id} onClick={() => { setSelectedId(d.id); setEditing(false) }}
            className={cn("w-full text-left px-3 py-2 rounded-lg border", selectedId === d.id ? "bg-[#1A1D24] border-[#D92532]/50" : "bg-[#111318] border-[#2A2D35]/60 hover:border-[#2A2D35]")}>
            <div className="flex items-center gap-1.5"><span className="text-[9px] uppercase tracking-wide text-[#6B7280]">{d.doc_type}</span></div>
            <div className="text-xs text-white truncate">{d.title}</div>
          </button>
        ))}
      </div>

      {/* Doc viewer / editor */}
      <div className="rounded-xl border border-[#2A2D35] bg-[#0E0F13]/40 p-5 min-h-[400px]">
        {!selected ? (
          <p className="text-sm text-[#6B7280]">Select a doc, or create one. Decisions, specs, PRDs, meeting notes — the project's living knowledge base.</p>
        ) : editing ? (
          <div className="space-y-3">
            <input value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} className="w-full bg-[#0E0F13] border border-[#2A2D35] rounded px-3 py-2 text-sm text-white font-semibold" />
            <div className="flex gap-2">
              <select value={draft.doc_type} onChange={(e) => setDraft((d) => ({ ...d, doc_type: e.target.value }))} className="bg-[#0E0F13] border border-[#2A2D35] rounded px-2 py-1 text-[11px] text-[#9CA3AF]">
                {DOC_TYPES.map((t) => <option key={t} value={t} className="bg-[#1A1D24]">{t}</option>)}
              </select>
              <select value={draft.linked_task_id ?? ""} onChange={(e) => setDraft((d) => ({ ...d, linked_task_id: e.target.value || null }))} className="bg-[#0E0F13] border border-[#2A2D35] rounded px-2 py-1 text-[11px] text-[#9CA3AF] max-w-[200px]">
                <option value="" className="bg-[#1A1D24]">No linked task</option>
                {tasks.map((t) => <option key={t.id} value={t.id} className="bg-[#1A1D24]">{t.title}</option>)}
              </select>
            </div>
            <textarea value={draft.content} onChange={(e) => setDraft((d) => ({ ...d, content: e.target.value }))} rows={18} placeholder="Write in markdown…" className="w-full bg-[#0E0F13] border border-[#2A2D35] rounded-lg px-3 py-2.5 text-sm text-white font-mono leading-relaxed" />
            <div className="flex gap-2">
              <button onClick={saveDoc} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D92532] text-white text-xs font-medium"><Check className="w-3.5 h-3.5" /> Save</button>
              <button onClick={() => setEditing(false)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1A1D24] border border-[#2A2D35] text-xs text-[#9CA3AF]"><X className="w-3.5 h-3.5" /> Cancel</button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div>
                <span className="text-[9px] uppercase tracking-wide text-[#6B7280]">{selected.doc_type}</span>
                <h2 className="text-base font-semibold text-white">{selected.title}</h2>
                {selected.linked_task_id && <Link href={`/os/tasks/${selected.linked_task_id}`} className="text-[10px] text-[#D92532] hover:underline">↳ linked task</Link>}
              </div>
              <button onClick={() => { setDraft({ title: selected.title, content: selected.content ?? "", doc_type: selected.doc_type, linked_task_id: selected.linked_task_id }); setEditing(true) }} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1A1D24] border border-[#2A2D35] text-[11px] text-[#9CA3AF] hover:text-white shrink-0"><PencilLine className="w-3 h-3" /> Edit</button>
            </div>
            {selected.content
              ? <div className="prose prose-invert prose-sm max-w-none text-[#D1D5DB] [&_h2]:text-white [&_h1]:text-white [&_li]:my-0.5"><ReactMarkdown>{selected.content}</ReactMarkdown></div>
              : <p className="text-sm text-[#6B7280]">Empty doc. Click Edit to write.</p>}
          </div>
        )}
      </div>
    </div>
  )
}
