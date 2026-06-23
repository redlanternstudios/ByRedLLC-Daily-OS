"use client"

import { use, useState, useRef } from "react"
import Link from "next/link"
import useSWR from "swr"
import {
  ArrowLeft, AlertTriangle, CheckCircle2, Clock,
  Send, Tag, Users, Calendar, FileText, Activity, Loader2,
  Pencil, Check, X, Link2, Lightbulb, ShieldAlert, Brain,
  HelpCircle, Timer, ChevronDown, ChevronUp, Plus, Trash2,
  GitBranch, ListChecks,
} from "lucide-react"
import { OSStatusBadge, OSPriorityBadge, OSBlockerBadge } from "@/components/byred/os/os-badge"
import { OSAvatar } from "@/components/byred/os/os-avatar"
import { MentionTextarea, renderMentions } from "@/components/byred/mention-textarea"
import { useTeamMembers } from "@/lib/hooks/use-team-members"
import { useUser } from "@/lib/context/user-context"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import type { ByredTask, ByredTaskComment } from "@/types/database"

const STATUS_OPTIONS = ["not_started", "in_progress", "blocked", "done"] as const
const PRIORITY_OPTIONS = ["critical", "high", "medium", "low"] as const

const fetcher = (url: string) => fetch(url).then((r) => r.json())

// Extended task type with fields not yet in generated types
type TaskFull = ByredTask & {
  definition_of_done?: string | null
  acceptance_criteria?: string | null
  is_low_hanging_fruit?: boolean | null
  is_ready_for_ai?: boolean | null
  is_ready_for_human?: boolean | null
  needs_decision?: boolean | null
  waiting_on_external?: boolean | null
  support_user_ids?: string[]
  source_group_name?: string | null
  parent_task_id?: string | null
  start_date?: string | null
}

type DependencyTask = {
  id: string
  title: string
  status: string
  priority: string
  byred_users?: { id: string; name: string } | null
}

type Subtask = {
  id: string
  title: string
  status: string
  priority: string
  due_date: string | null
  owner_user_id: string | null
  byred_users?: { id: string; name: string } | null
}

type ParentTask = {
  id: string
  title: string
  status: string
}

type DepsData = {
  blocked_by: DependencyTask[]
  blocking: DependencyTask[]
}

type CommentRow = ByredTaskComment & {
  byred_users: { id: string; name: string; avatar_url: string | null } | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function MetaRow({
  icon: Icon, label, children,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-[#2A2D35]/60 last:border-0">
      <div className="flex items-center gap-2 w-28 shrink-0">
        <Icon className="w-3.5 h-3.5 text-[#6B7280]" strokeWidth={1.75} />
        <span className="text-xs text-[#6B7280]">{label}</span>
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}

function IntelFlag({
  label, active, icon: Icon, onToggle, saving,
}: {
  label: string
  active: boolean
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  onToggle: () => void
  saving: boolean
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={saving}
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-colors",
        active
          ? "bg-[#D7261E]/15 border-[#D7261E]/30 text-red-300"
          : "bg-[#1A1D24]/60 border-[#2A2D35]/50 text-[#9CA3AF] hover:text-[#9CA3AF] hover:border-[#2A2D35]"
      )}
    >
      {saving ? <Loader2 className="w-3 h-3 animate-spin" strokeWidth={1.75} /> : <Icon className="w-3 h-3" strokeWidth={1.75} />}
      {label}
    </button>
  )
}

// ─── Inline text editor ───────────────────────────────────────────────────────

function InlineTextField({
  label, value, onSave, placeholder, multiline = false, users = [],
}: {
  label: string
  value: string | null | undefined
  onSave: (v: string | null) => Promise<void>
  placeholder: string
  multiline?: boolean
  users?: { id: string; name: string }[]
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? "")
  const [saving, setSaving] = useState(false)

  async function save() {
    if (draft === (value ?? "")) { setEditing(false); return }
    setSaving(true)
    try {
      await onSave(draft || null)
      setEditing(false)
    } catch {
      toast.error(`Failed to save ${label.toLowerCase()}`)
    } finally {
      setSaving(false)
    }
  }

  if (!editing) {
    return (
      <div
        className="group/field cursor-pointer"
        onClick={() => { setDraft(value ?? ""); setEditing(true) }}
      >
        {value ? (
          <p className="text-sm text-[#9CA3AF] leading-relaxed group-hover/field:text-white transition-colors">
            {multiline ? value : value}
          </p>
        ) : (
          <p className="text-sm text-[#6B7280] italic flex items-center gap-1.5 group-hover/field:text-[#9CA3AF] transition-colors">
            <Pencil className="w-3 h-3" strokeWidth={1.5} />
            {placeholder}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {multiline ? (
        <MentionTextarea
          value={draft}
          onChange={setDraft}
          onSubmit={() => void save()}
          onKeyDown={(e) => { if (e.key === "Escape") setEditing(false) }}
          users={users}
          autoFocus
          autoResize
          maxHeight={200}
          className="w-full text-sm bg-[#1A1D24] border border-[#2A2D35] rounded-lg px-3 py-2 text-white placeholder-[#6B7280] outline-none focus:border-[#9CA3AF] leading-relaxed"
          placeholder={placeholder}
        />
      ) : (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void save()
            if (e.key === "Escape") setEditing(false)
          }}
          className="w-full text-sm bg-[#1A1D24] border border-[#2A2D35] rounded-lg px-3 py-2 text-white placeholder-[#6B7280] outline-none focus:border-[#9CA3AF]"
          placeholder={placeholder}
        />
      )}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1A1D24] text-xs text-white hover:bg-zinc-600 transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" strokeWidth={2} />}
          Save
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="text-xs text-[#6B7280] hover:text-[#9CA3AF] px-2 py-1"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ─── Subtasks Section ─────────────────────────────────────────────────────────

function SubtasksSection({ taskId }: { taskId: string }) {
  const { data: subtasks, mutate, isLoading } = useSWR<Subtask[]>(
    `/api/tasks/${taskId}/subtasks`, fetcher
  )
  const [newTitle, setNewTitle] = useState("")
  const [adding, setAdding] = useState(false)
  const [creating, setCreating] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const progressBarRef = useRef<HTMLDivElement>(null)

  const list = subtasks ?? []
  const doneCount = list.filter((s) => s.status === "done").length
  const progress = list.length > 0 ? Math.round((doneCount / list.length) * 100) : 0

  // Set progress bar width imperatively to avoid inline style lint warning
  const prevProgress = useRef(0)
  if (progressBarRef.current && prevProgress.current !== progress) {
    progressBarRef.current.style.width = `${progress}%`
    prevProgress.current = progress
  }

  async function toggleStatus(subtask: Subtask) {
    const next = subtask.status === "done" ? "not_started" : "done"
    await fetch(`/api/tasks/${subtask.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    })
    mutate()
  }

  async function createSubtask() {
    if (!newTitle.trim()) return
    setCreating(true)
    try {
      const res = await fetch(`/api/tasks/${taskId}/subtasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim() }),
      })
      if (!res.ok) throw new Error()
      setNewTitle("")
      mutate()
    } catch {
      toast.error("Failed to create subtask")
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="rounded-xl bg-[#111318] border border-[#2A2D35] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#2A2D35]">
        <div className="flex items-center gap-2">
          <ListChecks className="w-4 h-4 text-[#9CA3AF]" strokeWidth={1.75} />
          <span className="text-sm font-medium text-[#9CA3AF]">Subtasks</span>
          {list.length > 0 && (
            <span className="text-[11px] text-[#6B7280]">{doneCount}/{list.length}</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => { setAdding(true); setTimeout(() => inputRef.current?.focus(), 50) }}
          className="flex items-center gap-1 text-xs text-[#6B7280] hover:text-[#9CA3AF] transition-colors"
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={2} />
          Add
        </button>
      </div>

      {list.length > 0 && (
        <div className="px-5 pt-3 pb-1">
          <div className="h-1 rounded-full bg-[#1A1D24] overflow-hidden">
            <div
              ref={progressBarRef}
              className="h-full rounded-full bg-green-500 transition-all duration-300 w-0"
            />
          </div>
          <p className="text-[10px] text-[#6B7280] mt-1">{progress}% complete</p>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-4 h-4 text-[#6B7280] animate-spin" strokeWidth={1.75} />
        </div>
      ) : list.length === 0 && !adding ? (
        <div className="px-5 py-5 text-center">
          <p className="text-xs text-[#6B7280]">No subtasks yet.</p>
          <button
            type="button"
            onClick={() => { setAdding(true); setTimeout(() => inputRef.current?.focus(), 50) }}
            className="mt-1.5 text-xs text-[#6B7280] hover:text-[#9CA3AF] underline"
          >
            Add the first one
          </button>
        </div>
      ) : (
        <div className="divide-y divide-[#2A2D35]/30">
          {list.map((subtask) => {
            const done = subtask.status === "done"
            return (
              <div key={subtask.id} className="flex items-center gap-3 px-5 py-2.5 group/sub hover:bg-white/[0.015]">
                <button
                  type="button"
                  aria-label={done ? "Mark incomplete" : "Mark complete"}
                  onClick={() => void toggleStatus(subtask)}
                  className={cn(
                    "w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                    done
                      ? "bg-green-600 border-green-600 text-white"
                      : "border-[#2A2D35] hover:border-zinc-400"
                  )}
                >
                  {done && <Check className="w-2.5 h-2.5" strokeWidth={3} />}
                </button>
                <Link
                  href={`/os/tasks/${subtask.id}`}
                  className={cn(
                    "flex-1 text-sm truncate hover:underline transition-colors",
                    done ? "line-through text-[#6B7280]" : "text-[#9CA3AF] hover:text-white"
                  )}
                >
                  {subtask.title}
                </Link>
                {!done && subtask.status !== "not_started" && (
                  <OSStatusBadge status={subtask.status} className="text-[9px] py-0 px-1.5 shrink-0" />
                )}
                {subtask.byred_users && (
                  <OSAvatar userId={subtask.owner_user_id!} fallbackName={subtask.byred_users.name} size="xs" />
                )}
              </div>
            )
          })}
        </div>
      )}

      {adding && (
        <div className="px-5 pb-4 pt-2 border-t border-[#2A2D35]/60">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border border-[#2A2D35] shrink-0" />
            <input
              ref={inputRef}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void createSubtask()
                if (e.key === "Escape") { setAdding(false); setNewTitle("") }
              }}
              placeholder="Subtask title…"
              className="flex-1 text-sm bg-transparent text-white placeholder-[#6B7280] outline-none border-b border-[#2A2D35] focus:border-[#9CA3AF]/80 pb-0.5 transition-colors"
            />
            <button
              type="button"
              onClick={() => void createSubtask()}
              disabled={!newTitle.trim() || creating}
              className="text-green-500 hover:text-green-400 disabled:opacity-40 shrink-0"
              aria-label="Create subtask"
            >
              {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" strokeWidth={2.5} />}
            </button>
            <button
              type="button"
              onClick={() => { setAdding(false); setNewTitle("") }}
              className="text-[#6B7280] hover:text-[#9CA3AF] shrink-0"
              aria-label="Cancel"
            >
              <X className="w-3.5 h-3.5" strokeWidth={2} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OSTaskDetailPage({ params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = use(params)
  const currentUser = useUser()

  const { data: taskData, mutate: mutateTask, isLoading: taskLoading } = useSWR<TaskFull>(
    `/api/tasks/${taskId}`, fetcher
  )
  const { data: commentsData, mutate: mutateComments } = useSWR<CommentRow[]>(
    `/api/tasks/${taskId}/comments`, fetcher
  )
  const { data: depsData, mutate: mutateDeps } = useSWR<DepsData>(
    `/api/tasks/${taskId}/dependencies`, fetcher
  )
  const { data: tenantData } = useSWR<{ tenants: { id: string; name: string }[] }>(
    "/api/os/tenants", fetcher
  )

  const [localTask, setLocalTask] = useState<TaskFull | null>(null)
  const task = localTask ?? taskData ?? null

  const { data: parentTask } = useSWR<ParentTask>(
    task?.parent_task_id ? `/api/tasks/${task.parent_task_id}` : null, fetcher
  )
  const comments = commentsData ?? []
  const deps = depsData ?? { blocked_by: [], blocking: [] }
  const tenants = tenantData?.tenants ?? []

  const [commentInput, setCommentInput] = useState("")
  const [submittingComment, setSubmittingComment] = useState(false)
  const [savingField, setSavingField] = useState<string | null>(null)
  const [showDod, setShowDod] = useState(false)
  const [addingDep, setAddingDep] = useState(false)
  const [depSearch, setDepSearch] = useState("")
  const commentRef = useRef<HTMLTextAreaElement>(null)
  const teamMembers = useTeamMembers()

  const today = new Date().toISOString().split("T")[0]
  const isOverdue = task?.due_date && task.due_date < today && task.status !== "done"
  const tenantName = tenants.find((t) => t.id === task?.tenant_id)?.name ?? task?.tenant_id ?? "—"
  const owner = teamMembers.find((m) => m.id === task?.owner_user_id)

  async function patchTask(field: string, value: string | boolean | number | null) {
    if (!task) return
    const prev = { ...task }
    const updated = { ...task, [field]: value } as TaskFull
    setLocalTask(updated)
    setSavingField(field)
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? "Update failed")
      }
      const fresh = await res.json()
      setLocalTask(fresh)
      mutateTask(fresh, false)
    } catch (err) {
      setLocalTask(prev)
      toast.error(err instanceof Error ? err.message : "Failed to update task.")
    } finally {
      setSavingField(null)
    }
  }

  async function submitComment() {
    const body = commentInput.trim()
    if (!body || !task) return
    setSubmittingComment(true)
    try {
      const res = await fetch(`/api/tasks/${task.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: body }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Failed to post comment")
      setCommentInput("")
      commentRef.current?.focus()
      mutateComments()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to post comment.")
    } finally {
      setSubmittingComment(false)
    }
  }

  async function removeDep(depends_on_task_id: string) {
    if (!task) return
    await fetch(`/api/tasks/${task.id}/dependencies`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ depends_on_task_id }),
    })
    mutateDeps()
  }

  if (taskLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-5 h-5 text-[#6B7280] animate-spin" strokeWidth={1.75} />
      </div>
    )
  }

  if (!task) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-[#9CA3AF] text-sm">Task not found.</p>
        <Link href="/os/tasks" className="text-xs text-[#6B7280] hover:text-[#9CA3AF] underline">Back to Tasks</Link>
      </div>
    )
  }

  const intelFlags = [
    { key: "is_low_hanging_fruit",  label: "Quick Win",         icon: CheckCircle2,   value: task.is_low_hanging_fruit },
    { key: "is_ready_for_ai",       label: "AI Ready",          icon: Brain,          value: task.is_ready_for_ai },
    { key: "is_ready_for_human",    label: "Human Ready",       icon: Users,          value: task.is_ready_for_human },
    { key: "needs_decision",        label: "Needs Decision",    icon: HelpCircle,     value: task.needs_decision },
    { key: "waiting_on_external",   label: "Waiting External",  icon: Timer,          value: task.waiting_on_external },
  ]

  return (
    <div className="max-w-4xl space-y-0">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3 mb-5">
        <Link
          href="/os/tasks"
          className="w-7 h-7 rounded-lg bg-[#1A1D24] border border-[#2A2D35] flex items-center justify-center hover:border-[#2A2D35] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-[#9CA3AF]" strokeWidth={1.75} />
        </Link>
        <div className="flex items-center gap-1.5 text-xs text-[#6B7280]">
          <Link href="/os/tasks" className="hover:text-[#9CA3AF]">Tasks</Link>
          {parentTask && (
            <>
              <span>/</span>
              <Link href={`/os/tasks/${parentTask.id}`} className="hover:text-[#9CA3AF] truncate max-w-[160px]">
                {parentTask.title}
              </Link>
            </>
          )}
          <span>/</span>
          <span className="text-[#9CA3AF] truncate max-w-[220px]">{task.title}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">

        {/* ── Main column ── */}
        <div className="space-y-5">

          {/* Title + description card */}
          <div className="rounded-xl bg-[#111318] border border-[#2A2D35] p-6">
            <div className="flex items-center gap-2 flex-wrap mb-4">
              <OSStatusBadge status={task.status} taskId={task.id} />
              <OSPriorityBadge priority={task.priority} />
              {task.blocker_flag && <OSBlockerBadge />}
              {task.source_group_name && (
                <span className="text-[10px] text-[#6B7280] border border-[#2A2D35]/50 px-2 py-0.5 rounded">
                  {task.source_group_name}
                </span>
              )}
            </div>

            <h1 className="text-xl font-semibold text-white leading-snug mb-4">{task.title}</h1>

            {/* Inline editable description */}
            <InlineTextField
              label="Description"
              value={task.description}
              onSave={(v) => patchTask("description", v)}
              placeholder="Add a description…"
              multiline
              users={teamMembers}
            />

            {/* Blocker reason */}
            {(task.blocker_flag || task.status === "blocked") && task.blocker_reason && (
              <div className="mt-4 flex items-start gap-2.5 p-3.5 rounded-lg bg-red-950/40 border border-red-800/40">
                <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" strokeWidth={2} />
                <div>
                  <p className="text-xs font-semibold text-red-300 mb-0.5">Blocker</p>
                  <p className="text-xs text-red-400/80">{task.blocker_reason}</p>
                </div>
              </div>
            )}
          </div>

          {/* Definition of Done / Acceptance Criteria */}
          <div className="rounded-xl bg-[#111318] border border-[#2A2D35] overflow-hidden">
            <button
              type="button"
              onClick={() => setShowDod((v) => !v)}
              className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-[#9CA3AF]" strokeWidth={1.75} />
                <span className="text-sm font-medium text-[#9CA3AF]">Definition of Done</span>
                {(task.definition_of_done || task.acceptance_criteria) && (
                  <span className="text-[10px] text-green-500 flex items-center gap-1">
                    <Check className="w-2.5 h-2.5" strokeWidth={2} /> Defined
                  </span>
                )}
              </div>
              {showDod
                ? <ChevronUp className="w-3.5 h-3.5 text-[#6B7280]" strokeWidth={1.75} />
                : <ChevronDown className="w-3.5 h-3.5 text-[#6B7280]" strokeWidth={1.75} />
              }
            </button>

            {showDod && (
              <div className="border-t border-[#2A2D35] px-5 py-4 space-y-4">
                <div>
                  <p className="text-[10px] text-[#6B7280] uppercase tracking-widest font-semibold mb-2">Done When</p>
                  <InlineTextField
                    label="Definition of done"
                    value={task.definition_of_done}
                    onSave={(v) => patchTask("definition_of_done", v)}
                    placeholder="Define what 'done' looks like for this task…"
                    multiline
                  />
                </div>
                <div>
                  <p className="text-[10px] text-[#6B7280] uppercase tracking-widest font-semibold mb-2">Acceptance Criteria</p>
                  <InlineTextField
                    label="Acceptance criteria"
                    value={task.acceptance_criteria}
                    onSave={(v) => patchTask("acceptance_criteria", v)}
                    placeholder="List specific criteria that must be met…"
                    multiline
                  />
                </div>
              </div>
            )}
          </div>

          {/* Subtasks */}
          <SubtasksSection taskId={taskId} />

          {/* Dependencies */}
          {(deps.blocked_by.length > 0 || deps.blocking.length > 0 || addingDep) && (
            <div className="rounded-xl bg-[#111318] border border-[#2A2D35] overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3.5 border-b border-[#2A2D35]">
                <Link2 className="w-4 h-4 text-[#9CA3AF]" strokeWidth={1.75} />
                <span className="text-sm font-medium text-[#9CA3AF]">Dependencies</span>
              </div>
              <div className="px-5 py-4 space-y-4">
                {deps.blocked_by.length > 0 && (
                  <div>
                    <p className="text-[10px] text-[#6B7280] uppercase tracking-widest font-semibold mb-2">Blocked by</p>
                    <div className="space-y-1.5">
                      {deps.blocked_by.map((dep) => (
                        <div key={dep.id} className="flex items-center gap-2 p-2.5 rounded-lg bg-[#1A1D24]/60 border border-[#2A2D35]/50">
                          <AlertTriangle className="w-3 h-3 text-red-400 shrink-0" strokeWidth={1.75} />
                          <Link href={`/os/tasks/${dep.id}`} className="text-xs text-[#9CA3AF] hover:text-white truncate flex-1">{dep.title}</Link>
                          <OSStatusBadge status={dep.status} className="text-[9px] py-0 px-1 shrink-0" />
                          <button type="button" aria-label="Remove dependency" onClick={() => void removeDep(dep.id)} className="text-[#6B7280] hover:text-red-400 shrink-0">
                            <X className="w-3 h-3" strokeWidth={2} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {deps.blocking.length > 0 && (
                  <div>
                    <p className="text-[10px] text-[#6B7280] uppercase tracking-widest font-semibold mb-2">Blocking</p>
                    <div className="space-y-1.5">
                      {deps.blocking.map((dep) => (
                        <div key={dep.id} className="flex items-center gap-2 p-2.5 rounded-lg bg-[#1A1D24]/60 border border-[#2A2D35]/50">
                          <ShieldAlert className="w-3 h-3 text-yellow-400 shrink-0" strokeWidth={1.75} />
                          <Link href={`/os/tasks/${dep.id}`} className="text-xs text-[#9CA3AF] hover:text-white truncate flex-1">{dep.title}</Link>
                          <OSStatusBadge status={dep.status} className="text-[9px] py-0 px-1 shrink-0" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Comments */}
          <div className="rounded-xl bg-[#111318] border border-[#2A2D35] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#2A2D35] flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#9CA3AF]" strokeWidth={1.75} />
              <span className="text-sm font-medium text-white">
                Comments
                {comments.length > 0 && <span className="ml-1.5 text-xs text-[#6B7280]">({comments.length})</span>}
              </span>
            </div>
            {comments.length > 0 && (
              <div className="divide-y divide-[#2A2D35]/40">
                {comments.map((c) => {
                  const userName = c.byred_users?.name ?? "Team Member"
                  return (
                    <div key={c.id} className="flex gap-3 px-5 py-4">
                      <OSAvatar userId={c.user_id} fallbackName={userName} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 mb-1.5">
                          <span className="text-xs font-semibold text-white">{userName}</span>
                          <span className="text-[10px] text-[#6B7280]">
                            {new Date(c.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            {" · "}
                            {new Date(c.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                          </span>
                        </div>
                        <p className="text-sm text-[#9CA3AF] leading-relaxed">{renderMentions(c.comment)}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            <div className="px-5 py-4 bg-black/20">
              <div className="flex items-end gap-2">
                <MentionTextarea
                  ref={commentRef}
                  value={commentInput}
                  onChange={setCommentInput}
                  onSubmit={submitComment}
                  users={teamMembers}
                  placeholder="Add a comment… (@name to mention)"
                  autoResize
                  maxHeight={120}
                  className="flex-1 px-3 py-2 text-sm bg-[#1A1D24] border border-[#2A2D35] rounded-lg text-white placeholder-[#6B7280] focus:outline-none focus:border-[#2A2D35] min-h-[36px]"
                />
                <button
                  type="button"
                  onClick={submitComment}
                  disabled={!commentInput.trim() || submittingComment}
                  className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center transition-colors shrink-0",
                    commentInput.trim() && !submittingComment
                      ? "bg-[#D7261E] text-white hover:bg-[#B51E18]"
                      : "bg-[#1A1D24] text-[#6B7280] border border-[#2A2D35]"
                  )}
                >
                  {submittingComment
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={1.75} />
                    : <Send className="w-3.5 h-3.5" strokeWidth={1.75} />
                  }
                </button>
              </div>
            </div>
          </div>

          {/* Activity placeholder */}
          <div className="rounded-xl bg-[#111318] border border-[#2A2D35] p-5">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-[#6B7280]" strokeWidth={1.75} />
              <span className="text-sm font-medium text-[#9CA3AF]">Activity</span>
              <span className="text-[10px] text-[#6B7280] bg-[#1A1D24] border border-[#2A2D35] px-2 py-0.5 rounded ml-auto">
                Coming soon
              </span>
            </div>
          </div>
        </div>

        {/* ── Sidebar ── */}
        <div className="space-y-4">

          {/* Core metadata */}
          <div className="rounded-xl bg-[#111318] border border-[#2A2D35] p-4">
            <p className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-widest mb-3">Details</p>
            <div>
              <MetaRow icon={Tag} label="Status">
                <div className="flex items-center gap-2">
                  <select
                    value={task.status}
                    onChange={(e) => void patchTask("status", e.target.value)}
                    disabled={savingField === "status"}
                    title="Task status"
                    aria-label="Task status"
                    className="bg-transparent text-xs text-[#9CA3AF] border-0 focus:outline-none cursor-pointer"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s} className="bg-[#111318]">{s.replace("_", " ")}</option>
                    ))}
                  </select>
                  {savingField === "status" && <Loader2 className="w-3 h-3 animate-spin text-[#6B7280]" strokeWidth={1.75} />}
                </div>
              </MetaRow>

              <MetaRow icon={Tag} label="Priority">
                <div className="flex items-center gap-2">
                  <select
                    value={task.priority}
                    onChange={(e) => void patchTask("priority", e.target.value)}
                    disabled={savingField === "priority"}
                    title="Task priority"
                    aria-label="Task priority"
                    className="bg-transparent text-xs text-[#9CA3AF] border-0 focus:outline-none cursor-pointer"
                  >
                    {PRIORITY_OPTIONS.map((p) => (
                      <option key={p} value={p} className="bg-[#111318]">{p}</option>
                    ))}
                  </select>
                  {savingField === "priority" && <Loader2 className="w-3 h-3 animate-spin text-[#6B7280]" strokeWidth={1.75} />}
                </div>
              </MetaRow>

              <MetaRow icon={Users} label="Owner">
                {owner ? (
                  <div className="flex items-center gap-2">
                    <OSAvatar userId={task.owner_user_id!} size="xs" />
                    <span className="text-xs text-[#9CA3AF]">{owner.name}</span>
                  </div>
                ) : (
                  <span className="text-xs text-[#6B7280]">Unassigned</span>
                )}
              </MetaRow>

              {(task.support_user_ids?.length ?? 0) > 0 && (
                <MetaRow icon={Users} label="Support">
                  <div className="flex items-center gap-1">
                    {(task.support_user_ids ?? []).map((uid) => {
                      const m = teamMembers.find((tm) => tm.id === uid)
                      return <OSAvatar key={uid} userId={uid} fallbackName={m?.name ?? "?"} size="xs" />
                    })}
                  </div>
                </MetaRow>
              )}

              <MetaRow icon={Calendar} label="Due Date">
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={task.due_date ?? ""}
                    onChange={(e) => void patchTask("due_date", e.target.value || null)}
                    disabled={savingField === "due_date"}
                    title="Due date"
                    aria-label="Due date"
                    className={cn(
                      "bg-transparent text-xs border-0 focus:outline-none cursor-pointer",
                      isOverdue ? "text-red-400" : "text-[#9CA3AF]"
                    )}
                  />
                  {savingField === "due_date" && <Loader2 className="w-3 h-3 animate-spin text-[#6B7280]" strokeWidth={1.75} />}
                </div>
              </MetaRow>

              {task.estimated_minutes && (
                <MetaRow icon={Clock} label="Estimate">
                  <span className="text-xs text-[#9CA3AF]">
                    {task.estimated_minutes >= 60
                      ? `${Math.round(task.estimated_minutes / 60)}h`
                      : `${task.estimated_minutes}m`}
                  </span>
                </MetaRow>
              )}

              <MetaRow icon={Tag} label="Project">
                <span className="text-xs text-[#9CA3AF] truncate">{tenantName}</span>
              </MetaRow>

              {parentTask && (
                <MetaRow icon={GitBranch} label="Parent">
                  <Link
                    href={`/os/tasks/${parentTask.id}`}
                    className="text-xs text-[#9CA3AF] hover:text-white truncate flex items-center gap-1 transition-colors"
                  >
                    {parentTask.title}
                  </Link>
                </MetaRow>
              )}
            </div>
          </div>

          {/* Intelligence flags */}
          <div className="rounded-xl bg-[#111318] border border-[#2A2D35] p-4">
            <p className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <Brain className="w-3 h-3" strokeWidth={1.75} />
              Intelligence Flags
            </p>
            <div className="flex flex-wrap gap-2">
              {intelFlags.map((f) => (
                <IntelFlag
                  key={f.key}
                  label={f.label}
                  active={!!f.value}
                  icon={f.icon}
                  saving={savingField === f.key}
                  onToggle={() => void patchTask(f.key, !f.value)}
                />
              ))}
            </div>
          </div>

          {/* Add dependency */}
          <div className="rounded-xl bg-[#111318] border border-[#2A2D35] p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-widest flex items-center gap-1.5">
                <Link2 className="w-3 h-3" strokeWidth={1.75} />
                Dependencies
              </p>
              <button
                type="button"
                onClick={() => setAddingDep((v) => !v)}
                className="text-[10px] text-[#6B7280] hover:text-[#9CA3AF] flex items-center gap-0.5 transition-colors"
              >
                <Plus className="w-3 h-3" strokeWidth={2} />
                Add
              </button>
            </div>
            {deps.blocked_by.length === 0 && deps.blocking.length === 0 ? (
              <p className="text-xs text-[#6B7280] italic">No dependencies linked.</p>
            ) : (
              <div className="space-y-1">
                {deps.blocked_by.map((d) => (
                  <div key={d.id} className="flex items-center gap-1.5">
                    <AlertTriangle className="w-2.5 h-2.5 text-red-400 shrink-0" strokeWidth={2} />
                    <Link href={`/os/tasks/${d.id}`} className="text-[10px] text-[#9CA3AF] hover:text-white truncate">{d.title}</Link>
                  </div>
                ))}
                {deps.blocking.map((d) => (
                  <div key={d.id} className="flex items-center gap-1.5">
                    <ShieldAlert className="w-2.5 h-2.5 text-yellow-400 shrink-0" strokeWidth={2} />
                    <Link href={`/os/tasks/${d.id}`} className="text-[10px] text-[#9CA3AF] hover:text-white truncate">{d.title}</Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Created at */}
          <div className="rounded-xl bg-[#111318] border border-[#2A2D35] p-4">
            <p className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-widest mb-2">Created</p>
            <p className="text-xs text-[#9CA3AF]">
              {new Date(task.created_at ?? "").toLocaleDateString("en-US", {
                month: "long", day: "numeric", year: "numeric",
              })}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
