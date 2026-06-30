"use client"

import { useState } from "react"
import Link from "next/link"
import {
  ChevronRight,
  Sparkles,
  FileText,
  Zap,
  Copy,
  CheckCircle,
} from "lucide-react"
import { formatDistanceToNow, parseISO, format } from "date-fns"
import { toast } from "sonner"
import ReactMarkdown from "react-markdown"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { TenantPill } from "@/components/byred/tenant-pill"
import { StatusBadge } from "@/components/byred/status-badge"
import { PriorityFlag } from "@/components/byred/priority-flag"
import { DueDateCell } from "@/components/byred/due-date-cell"
import { AiModeChip } from "@/components/byred/ai-mode-chip"
import { BlockerBanner } from "@/components/byred/blocker-banner"
import { ActivityItem } from "@/components/byred/activity-item"
import { TaskComments } from "@/components/byred/task-comments"
import { useUser } from "@/lib/context/user-context"
import type { Task, Activity } from "@/types/db"

function ScoreBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-zinc-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-byred-red rounded-full transition-all"
          style={{ width: `${(value / 10) * 100}%` }}
        />
      </div>
      <span className="text-xs text-[#9CA3AF] font-mono w-4">{value}</span>
    </div>
  )
}

interface AiActionResult {
  type: "assist" | "draft"
  content: string
}

interface TaskDetailProps {
  task: Task
  activities: Activity[]
}

export function TaskDetail({ task, activities }: TaskDetailProps) {
  const currentUser = useUser()
  const displayName =
    currentUser?.profile?.name ?? currentUser?.authUser?.email ?? "User"
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  const [title, setTitle] = useState(task.title)
  const [editingTitle, setEditingTitle] = useState(false)
  const [blockerFlag, setBlockerFlag] = useState(task.blocker_flag)
  const [aiResult, setAiResult] = useState<AiActionResult | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [status, setStatus] = useState(task.status ?? "not_started")
  const [priority, setPriority] = useState(task.priority ?? "medium")
  const [aiMode, setAiMode] = useState<string>(task.ai_mode ?? "HUMAN_ONLY")
  const [blockerReason, setBlockerReason] = useState(task.blocker_reason ?? "")
  const [saving, setSaving] = useState(false)

  async function handleAiAction(type: "assist" | "draft" | "execute") {
    setAiLoading(true)
    await new Promise((r) => setTimeout(r, 1000))
    if (type === "assist") {
      setAiResult({
        type: "assist",
        content: `**Suggested actions:**\n\n1. Review task requirements and gather relevant documentation\n2. Coordinate with stakeholders to align on timeline\n3. Begin execution using the checklist in the description\n\n**Risk:** Deadline pressure may require scope reduction.\n\n**Next Action:** Block 90 minutes tomorrow morning.`,
      })
    } else if (type === "draft") {
      setAiResult({
        type: "draft",
        content: `**Subject:** Action Required: ${task.title}\n\n**Body:**\nHi team,\n\nThis task requires immediate attention. The due date is ${task.due_date ?? "TBD"} and current status is ${task.status ?? "not started"}.\n\nPlease review and take action.\n\n— ${displayName}`,
      })
    }
    setAiLoading(false)
    toast.success("AI response generated.")
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          status,
          priority,
          ai_mode: aiMode,
          blocker_flag: blockerFlag,
          blocker_reason: blockerFlag ? blockerReason : null,
        }),
      })
      if (!res.ok) {
        toast.error("Failed to save changes.")
        return
      }
      toast.success("Task updated.")
    } catch {
      toast.error("Failed to save changes.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left: main content */}
      <div className="lg:col-span-2 space-y-6">
        {/* Breadcrumb */}
        <nav
          className="flex items-center gap-1.5 text-xs text-[#9CA3AF]"
          aria-label="Breadcrumb"
        >
          <Link href="/tasks" className="hover:text-[#6B7280] transition-colors">
            Tasks
          </Link>
          <ChevronRight className="w-3 h-3" strokeWidth={1.75} />
          <span className="text-[#9CA3AF] truncate max-w-[200px]">
            {task.title.slice(0, 40)}
            {task.title.length > 40 ? "..." : ""}
          </span>
        </nav>

        {/* Title */}
        <div>
          {editingTitle ? (
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={async () => {
                setEditingTitle(false)
                const res = await fetch(`/api/tasks/${task.id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ title }),
                })
                if (res.ok) toast.success("Title updated.")
                else toast.error("Failed to update title.")
              }}
              className="w-full text-2xl font-condensed font-bold text-zinc-800 tracking-tight bg-transparent border-b border-byred-red outline-none pb-1"
            />
          ) : (
            <h1
              className="text-2xl font-condensed font-bold text-zinc-800 tracking-tight cursor-text hover:opacity-80 transition-opacity"
              onClick={() => setEditingTitle(true)}
              title="Click to edit"
            >
              {title}
            </h1>
          )}

          {/* Meta row */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <TenantPill tenantId={task.tenant_id} />
            <DueDateCell dueDate={task.due_date} />
            <PriorityFlag priority={task.priority} showLabel />
            <StatusBadge status={task.status} taskId={task.id} onStatusChange={setStatus} />
            <AiModeChip mode={task.ai_mode} />
          </div>
        </div>

        {/* Blocker banner */}
        {blockerFlag && (
          <BlockerBanner
            reason={task.blocker_reason}
            onUnblock={() => {
              setBlockerFlag(false)
              toast.success("Task unblocked.")
            }}
          />
        )}

        {/* Blocked by */}
        {task.blocked_by_task_id && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#9CA3AF]">Blocked by:</span>
            <Link
              href={`/tasks/${task.blocked_by_task_id}`}
              className="text-xs text-byred-red hover:underline underline-offset-2 font-mono"
            >
              {task.blocked_by_task_id}
            </Link>
          </div>
        )}

        {/* Description */}
        <div>
          <h3 className="text-sm font-medium text-[#9CA3AF] mb-2">Description</h3>
          <Card className="bg-white border-zinc-200">
            <CardContent className="p-4">
              {task.description ? (
                <div className="prose prose-sm max-w-none text-[#6B7280] leading-relaxed">
                  <ReactMarkdown>{task.description}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-xs text-[#9CA3AF]">No description.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Metadata */}
        <div>
          <h3 className="text-sm font-medium text-[#9CA3AF] mb-2">Metadata</h3>
          <Card className="bg-white border-zinc-200">
            <CardContent className="p-4">
              <dl className="space-y-3 text-sm">

                <div className="flex justify-between">
                  <dt className="text-[#9CA3AF]">Estimated</dt>
                  <dd className="text-[#6B7280] font-mono text-xs">
                    {(() => { const em = task.estimated_minutes ?? 0; return em < 60 ? `${em}m` : `${Math.floor(em / 60)}h ${em % 60 > 0 ? `${em % 60}m` : ""}` })()}
                  </dd>
                </div>
                <div>
                  <dt className="text-[#9CA3AF] mb-1.5">Revenue impact</dt>
                  <dd>
                    <ScoreBar value={task.revenue_impact_score ?? 0} />
                  </dd>
                </div>
                <div>
                  <dt className="text-[#9CA3AF] mb-1.5">Urgency</dt>
                  <dd>
                    <ScoreBar value={task.urgency_score ?? 0} />
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[#9CA3AF]">Owner</dt>
                  <dd>
                    {task.owner_user_id ? (
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-byred-red/10 border border-byred-red/20 flex items-center justify-center">
                          <span className="text-[9px] font-semibold text-byred-red font-condensed">
                            {initials}
                          </span>
                        </div>
                        <span className="text-xs text-[#6B7280]">
                          {displayName}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-[#9CA3AF]">Unassigned</span>
                    )}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[#9CA3AF]">Created</dt>
                  <dd
                    className="text-xs text-[#9CA3AF] font-mono"
                    title={format(parseISO(task.created_at ?? new Date().toISOString()), "PPpp")}
                  >
                    {formatDistanceToNow(parseISO(task.created_at ?? new Date().toISOString()), {
                      addSuffix: true,
                    })}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>

        {/* Comments */}
        <TaskComments taskId={task.id} />

        {/* Activity */}
        <div>
          <h3 className="text-sm font-medium text-[#9CA3AF] mb-2">Activity</h3>
          {activities.length === 0 ? (
            <p className="text-xs text-[#9CA3AF]">No activity.</p>
          ) : (
            <div className="divide-y divide-zinc-100">
              {activities.map((a) => (
                <ActivityItem key={a.id} activity={a} showObject={false} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: sticky sidebar */}
      <div className="space-y-4 lg:sticky lg:top-20 self-start">
        {/* AI Actions */}
        <Card className="bg-white border-zinc-200 shadow-sm">
          <CardHeader className="pb-3">
            <h3 className="text-sm font-condensed font-semibold text-[#6B7280] uppercase tracking-wide">
              AI Actions
            </h3>
          </CardHeader>
          <CardContent className="space-y-3">
            {aiMode === "HUMAN_ONLY" && (
              <p className="text-xs text-[#9CA3AF]">
                This task is marked human-only.
              </p>
            )}

            {(aiMode === "AI_ASSIST" ||
              aiMode === "AI_DRAFT" ||
              aiMode === "AI_EXECUTE") && (
              <Button
                className="w-full bg-byred-red hover:bg-byred-red-hot text-white text-sm gap-2"
                onClick={() => handleAiAction("assist")}
                disabled={aiLoading}
              >
                <Sparkles className="w-4 h-4" strokeWidth={1.75} />
                Suggest 3 actions
              </Button>
            )}

            {(aiMode === "AI_DRAFT" ||
              aiMode === "AI_EXECUTE") && (
              <Button
                variant="outline"
                className="w-full border-zinc-300 text-[#6B7280] hover:text-zinc-800 hover:bg-zinc-50 text-sm gap-2"
                onClick={() => handleAiAction("draft")}
                disabled={aiLoading}
              >
                <FileText className="w-4 h-4" strokeWidth={1.75} />
                Draft content
              </Button>
            )}

            {aiMode === "AI_EXECUTE" && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    className="w-full bg-byred-red hover:bg-byred-red-hot text-white text-sm gap-2"
                  >
                    <Zap className="w-4 h-4" strokeWidth={1.75} />
                    Auto-execute
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-white border-zinc-200">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-zinc-800">
                      Auto-execute this task?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-[#9CA3AF]">
                      This will run without further confirmation. Continue?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="border-zinc-300 text-[#6B7280] hover:text-zinc-800">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-byred-red hover:bg-byred-red-hot text-white"
                      onClick={() => {
                        handleAiAction("execute")
                        toast.success("Task executed.")
                      }}
                    >
                      Execute
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {/* AI Result */}
            {aiResult && (
              <div className="mt-3 rounded-md border border-zinc-200 bg-zinc-50 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-[#9CA3AF] uppercase tracking-widest">
                    {aiResult.type === "assist" ? "AI Suggestions" : "Draft"}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-6 h-6 text-[#9CA3AF] hover:text-[#6B7280]"
                    onClick={() => {
                      navigator.clipboard.writeText(aiResult.content)
                      toast.success("Copied.")
                    }}
                  >
                    <Copy className="w-3 h-3" strokeWidth={1.75} />
                  </Button>
                </div>
                <div className="prose prose-xs max-w-none text-[#6B7280] text-xs leading-relaxed overflow-y-auto max-h-48">
                  <ReactMarkdown>{aiResult.content}</ReactMarkdown>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Settings */}
        <Card className="bg-white border-zinc-200 shadow-sm">
          <CardHeader className="pb-3">
            <h3 className="text-sm font-condensed font-semibold text-[#6B7280] uppercase tracking-wide">
              Settings
            </h3>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Blocker toggle */}
            <div className="flex items-center justify-between">
              <Label
                htmlFor="blocker-toggle"
                className="text-xs text-[#9CA3AF] cursor-pointer"
              >
                Blocker
              </Label>
              <Switch
                id="blocker-toggle"
                checked={blockerFlag ?? false}
                onCheckedChange={setBlockerFlag}
                className="data-[state=checked]:bg-byred-red"
              />
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <Label className="text-xs text-[#9CA3AF]">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-8 bg-white border-zinc-300 text-xs text-[#6B7280]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-zinc-200 shadow-md">
                  {[
                    "not_started",
                    "in_progress",
                    "overdue",
                    "done",
                    "blocked",
                  ].map((s) => (
                    <SelectItem
                      key={s}
                      value={s}
                      className="text-xs text-[#6B7280] capitalize"
                    >
                      {s.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
            <div className="space-y-1.5">
              <Label className="text-xs text-[#9CA3AF]">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="h-8 bg-white border-zinc-300 text-xs text-[#6B7280]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-zinc-200 shadow-md">
                  {["critical", "high", "medium", "low"].map((p) => (
                    <SelectItem
                      key={p}
                      value={p}
                      className="text-xs text-[#6B7280] capitalize"
                    >
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* AI Mode */}
            <div className="space-y-1.5">
              <Label className="text-xs text-[#9CA3AF]">AI Mode</Label>
              <Select value={aiMode} onValueChange={setAiMode}>
                <SelectTrigger className="h-8 bg-white border-zinc-300 text-xs text-[#6B7280]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-zinc-200 shadow-md">
                  {["HUMAN_ONLY", "AI_ASSIST", "AI_DRAFT", "AI_EXECUTE"].map(
                    (m) => (
                      <SelectItem
                        key={m}
                        value={m}
                        className="text-xs text-[#6B7280]"
                      >
                        {m}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Blocker reason */}
            {blockerFlag && (
              <div className="space-y-1.5">
                <Label className="text-xs text-[#9CA3AF]">Blocker reason</Label>
                <Textarea
                  value={blockerReason}
                  onChange={(e) => setBlockerReason(e.target.value)}
                  className="text-xs bg-white border-zinc-300 text-[#6B7280] focus-visible:ring-byred-red min-h-[60px]"
                  placeholder="Describe what is blocking this task..."
                />
              </div>
            )}

            <Button
              className="w-full bg-byred-red hover:bg-byred-red-hot text-white text-sm gap-2"
              onClick={handleSave}
              disabled={saving}
            >
              <CheckCircle className="w-4 h-4" strokeWidth={1.75} />
              {saving ? "Saving…" : "Save"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
