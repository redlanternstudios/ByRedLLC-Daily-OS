"use client"

import { use, useState, useRef } from "react"
import Link from "next/link"
import useSWR from "swr"
import {
  ArrowLeft, AlertTriangle, CheckCircle2, Clock,
  Send, Tag, Users, Calendar, FileText, Activity, Loader2,
} from "lucide-react"
import { OSStatusBadge, OSPriorityBadge, OSBlockerBadge } from "@/components/byred/os/os-badge"
import { OSAvatar } from "@/components/byred/os/os-avatar"
import { MentionTextarea, renderMentions } from "@/components/byred/mention-textarea"
import { useTeamMembers } from "@/lib/hooks/use-team-members"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import type { ByredTask, ByredTaskComment } from "@/types/database"

const STATUS_OPTIONS = ["not_started", "in_progress", "blocked", "done"] as const
const PRIORITY_OPTIONS = ["critical", "high", "medium", "low"] as const

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function MetaRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-zinc-800/60 last:border-0">
      <div className="flex items-center gap-2 w-28 shrink-0">
        <Icon className="w-3.5 h-3.5 text-zinc-600" strokeWidth={1.75} />
        <span className="text-xs text-zinc-600">{label}</span>
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}

// Comment shape returned from the API (joined with byred_users)
type CommentRow = ByredTaskComment & {
  byred_users: { id: string; name: string; avatar_url: string | null } | null
}

export default function OSTaskDetailPage({
  params,
}: {
  params: Promise<{ taskId: string }>
}) {
  const { taskId } = use(params)

  const { data: taskData, mutate: mutateTask, isLoading: taskLoading } = useSWR<ByredTask>(
    `/api/tasks/${taskId}`,
    fetcher
  )
  const { data: commentsData, mutate: mutateComments } = useSWR<CommentRow[]>(
    `/api/tasks/${taskId}/comments`,
    fetcher
  )

  const [localTask, setLocalTask] = useState<ByredTask | null>(null)
  const task = localTask ?? taskData ?? null
  const comments = commentsData ?? []

  const [commentInput, setCommentInput] = useState("")
  const [submittingComment, setSubmittingComment] = useState(false)
  const [savingField, setSavingField] = useState<string | null>(null)
  const commentRef = useRef<HTMLTextAreaElement>(null)
  const teamMembers = useTeamMembers()

  const today = new Date().toISOString().split("T")[0]
  const isOverdue = task?.due_date && task.due_date < today && task.status !== "done"

  async function patchTask(field: string, value: string | boolean | number | null) {
    if (!task) return
    const prev = { ...task }
    const updated = { ...task, [field]: value }
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
      const updated = await res.json()
      setLocalTask(updated)
      mutateTask(updated, false)
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
        // API expects the field named "comment" — not "body"
        body: JSON.stringify({ comment: body }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? "Failed to post comment")
      }
      setCommentInput("")
      commentRef.current?.focus()
      mutateComments()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to post comment.")
    } finally {
      setSubmittingComment(false)
    }
  }

  if (taskLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-5 h-5 text-zinc-600 animate-spin" strokeWidth={1.75} />
      </div>
    )
  }

  if (!task) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-zinc-500 text-sm">Task not found.</p>
        <Link href="/os/tasks" className="text-xs text-zinc-600 hover:text-zinc-400 underline">
          Back to Tasks
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl space-y-0">
      <div className="flex items-center gap-3 mb-5">
        <Link
          href="/os/tasks"
          className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center hover:border-zinc-600 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.75} />
        </Link>
        <div className="flex items-center gap-1.5 text-xs text-zinc-600">
          <Link href="/os/tasks" className="hover:text-zinc-400">Tasks</Link>
          <span>/</span>
          <span className="text-zinc-400 truncate">{task.title}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
        <div className="space-y-5">
          <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-6">
            <div className="flex items-center gap-2 flex-wrap mb-4">
              <OSStatusBadge status={task.status} taskId={task.id} />
              <OSPriorityBadge priority={task.priority} />
              {task.blocker_flag && <OSBlockerBadge />}
              {task.monday_item_id && (
                <span className="text-[10px] text-zinc-600 border border-zinc-800 px-2 py-0.5 rounded">
                  Monday #{task.monday_item_id}
                </span>
              )}
            </div>
            <h1 className="text-xl font-semibold text-white leading-snug mb-3">{task.title}</h1>
            {task.description && (
              <p className="text-sm text-zinc-400 leading-relaxed">{task.description}</p>
            )}
            {task.blocker_flag && task.blocker_reason && (
              <div className="mt-4 flex items-start gap-2.5 p-3.5 rounded-lg bg-red-950/40 border border-red-800/40">
                <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" strokeWidth={2} />
                <div>
                  <p className="text-xs font-semibold text-red-300 mb-0.5">Blocker</p>
                  <p className="text-xs text-red-400/80">{task.blocker_reason}</p>
                </div>
              </div>
            )}
          </div>

          {/* Comments */}
          <div className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-800 flex items-center gap-2">
              <FileText className="w-4 h-4 text-zinc-400" strokeWidth={1.75} />
              <span className="text-sm font-medium text-white">
                Comments
                {comments.length > 0 && (
                  <span className="ml-1.5 text-xs text-zinc-600">({comments.length})</span>
                )}
              </span>
            </div>

            {comments.length > 0 && (
              <div className="divide-y divide-zinc-800/60">
                {comments.map((c) => {
                  const userName = c.byred_users?.name ?? "Team Member"
                  return (
                    <div key={c.id} className="flex gap-3 px-5 py-4">
                      <OSAvatar userId={c.user_id} fallbackName={userName} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 mb-1.5">
                          <span className="text-xs font-semibold text-zinc-200">{userName}</span>
                          <span className="text-[10px] text-zinc-600">
                            {new Date(c.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            {" · "}
                            {new Date(c.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                          </span>
                        </div>
                        <p className="text-sm text-zinc-400 leading-relaxed">{renderMentions(c.comment)}</p>
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
                  className="flex-1 px-3 py-2 text-sm bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 min-h-[36px]"
                />
                <button
                  onClick={submitComment}
                  disabled={!commentInput.trim() || submittingComment}
                  className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center transition-colors shrink-0",
                    commentInput.trim() && !submittingComment
                      ? "bg-[#D7261E] text-white hover:bg-[#B51E18]"
                      : "bg-zinc-800 text-zinc-600 border border-zinc-700"
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

          <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-zinc-600" strokeWidth={1.75} />
              <span className="text-sm font-medium text-zinc-500">Activity</span>
              <span className="text-[10px] text-zinc-700 bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded ml-auto">
                Coming soon
              </span>
            </div>
          </div>
        </div>

        {/* Sidebar meta */}
        <div className="space-y-4">
          <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
            <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-3">Details</p>
            <div>
              <MetaRow icon={Tag} label="Status">
                <div className="flex items-center gap-2">
                  <select
                    value={task.status}
                    onChange={(e) => patchTask("status", e.target.value)}
                    disabled={savingField === "status"}
                    className="bg-transparent text-xs text-zinc-300 border-0 focus:outline-none cursor-pointer"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s} className="bg-zinc-900">{s.replace("_", " ")}</option>
                    ))}
                  </select>
                  {savingField === "status" && <Loader2 className="w-3 h-3 animate-spin text-zinc-600" strokeWidth={1.75} />}
                </div>
              </MetaRow>

              <MetaRow icon={Tag} label="Priority">
                <div className="flex items-center gap-2">
                  <select
                    value={task.priority}
                    onChange={(e) => patchTask("priority", e.target.value)}
                    disabled={savingField === "priority"}
                    className="bg-transparent text-xs text-zinc-300 border-0 focus:outline-none cursor-pointer"
                  >
                    {PRIORITY_OPTIONS.map((p) => (
                      <option key={p} value={p} className="bg-zinc-900">{p}</option>
                    ))}
                  </select>
                  {savingField === "priority" && <Loader2 className="w-3 h-3 animate-spin text-zinc-600" strokeWidth={1.75} />}
                </div>
              </MetaRow>

              <MetaRow icon={Users} label="Owner">
                {task.owner_user_id ? (
                  <div className="flex items-center gap-1.5">
                    <OSAvatar userId={task.owner_user_id} size="xs" />
                  </div>
                ) : (
                  <span className="text-xs text-zinc-600">Unassigned</span>
                )}
              </MetaRow>

              <MetaRow icon={Calendar} label="Due Date">
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={task.due_date ?? ""}
                    onChange={(e) => patchTask("due_date", e.target.value || null)}
                    disabled={savingField === "due_date"}
                    className={cn(
                      "bg-transparent text-xs border-0 focus:outline-none cursor-pointer",
                      isOverdue ? "text-red-400" : "text-zinc-300"
                    )}
                  />
                  {savingField === "due_date" && <Loader2 className="w-3 h-3 animate-spin text-zinc-600" strokeWidth={1.75} />}
                </div>
              </MetaRow>

              {task.estimated_minutes && (
                <MetaRow icon={Clock} label="Estimate">
                  <span className="text-xs text-zinc-300">
                    {task.estimated_minutes >= 60
                      ? `${Math.round(task.estimated_minutes / 60)}h`
                      : `${task.estimated_minutes}m`}
                  </span>
                </MetaRow>
              )}

              <MetaRow icon={Tag} label="Tenant">
                <span className="text-xs text-zinc-300 capitalize">{task.tenant_id}</span>
              </MetaRow>
            </div>
          </div>

          <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
            <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-2">Created</p>
            <p className="text-xs text-zinc-500">
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
