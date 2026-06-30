"use client"

import { use, useRef, useState } from "react"
import Link from "next/link"
import useSWR from "swr"
import ReactMarkdown from "react-markdown"
import { ArrowLeft, Clock, AlertTriangle, GitMerge, Loader2, AlertCircle, Bot, PencilLine, LayoutGrid, Table2, GanttChartSquare, FileText, Check, X, Rocket, Plus } from "lucide-react"
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

  if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-5 h-5 text-[#6B7280] animate-spin" /></div>
  if (error || !data?.project) return <div className="flex items-center gap-2.5 px-4 py-3 rounded-lg bg-red-950/40 border border-red-800/40 text-red-400 text-sm"><AlertCircle className="w-4 h-4 shrink-0" /> Failed to load this project.</div>

  const { project, tasks, sprints } = data
  const total = tasks.length
  const done = tasks.filter((t) => t.status === "done").length
  const pct = total ? Math.round((done / total) * 100) : 0
  const points = tasks.reduce((s, t) => s + (t.story_points ?? 0), 0)

  // Group by epic (first-seen order)
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
        <Link href="/os/projects" className="w-7 h-7 mt-0.5 rounded-lg bg-[#1A1D24] border border-[#2A2D35] flex items-center justify-center"><ArrowLeft className="w-3.5 h-3.5 text-[#9CA3AF]" strokeWidth={1.75} /></Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold text-white">{project.name}</h1>
          {project.description && <p className="text-xs text-[#9CA3AF] mt-0.5">{project.description}</p>}
          <div className="flex items-center gap-3 mt-2">
            <div className="h-1.5 w-40 bg-[#1A1D24] rounded-full overflow-hidden"><div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${pct}%` }} /></div>
            <span className="text-[11px] text-[#9CA3AF] font-mono">{done}/{total} done · {pct}% · {points} pts</span>
          </div>
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
              {tasks.map((t) => (
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
      {tab === "timeline" && <Timeline tasks={tasks} epics={epics} byEpic={byEpic} />}

      {total === 0 && tab !== "overview" && <p className="text-sm text-[#9CA3AF]">No tasks in this project yet.</p>}
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
