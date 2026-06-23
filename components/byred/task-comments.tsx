"use client"

import { useState, useEffect, useRef } from "react"
import { formatDistanceToNow, parseISO } from "date-fns"
import { Send } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { MentionTextarea, renderMentions } from "@/components/byred/mention-textarea"
import { useUser } from "@/lib/context/user-context"
import { useTeamMembers } from "@/lib/hooks/use-team-members"

type CommentUser = {
  id: string
  name: string
  avatar_url: string | null
}

type Comment = {
  id: string
  task_id: string
  user_id: string
  comment: string
  created_at: string
  byred_users: CommentUser
}

function UserAvatar({
  name,
  avatarUrl,
  size = "sm",
}: {
  name: string
  avatarUrl: string | null
  size?: "sm" | "xs"
}) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  const sizeClass = size === "xs" ? "w-5 h-5 text-[9px]" : "w-7 h-7 text-xs"

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={name}
        className={`${sizeClass} rounded-full object-cover shrink-0`}
      />
    )
  }

  return (
    <div
      className={`${sizeClass} rounded-full bg-byred-red/10 border border-byred-red/20 flex items-center justify-center shrink-0 font-condensed font-semibold text-byred-red`}
    >
      {initials}
    </div>
  )
}

interface TaskCommentsProps {
  taskId: string
}

export function TaskComments({ taskId }: TaskCommentsProps) {
  const currentUser = useUser()
  const displayName = currentUser?.profile?.name ?? currentUser?.authUser?.email ?? "You"
  const teamMembers = useTeamMembers()

  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch(`/api/tasks/${taskId}/comments`)
      .then((r) => r.json())
      .then((data: Comment[]) => setComments(data))
      .catch(() => toast.error("Failed to load comments."))
      .finally(() => setLoading(false))
  }, [taskId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!draft.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: draft.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? "Failed to add comment.")
        return
      }
      setComments((prev) => [...prev, data as Comment])
      setDraft("")
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50)
    } catch {
      toast.error("Failed to add comment.")
    } finally {
      setSubmitting(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmit(e as unknown as React.FormEvent)
    }
  }

  return (
    <div>
      <h3 className="text-sm font-medium text-[#9CA3AF] mb-3">Comments</h3>

      {/* Feed */}
      <div className="space-y-4 mb-4">
        {loading && (
          <p className="text-xs text-[#9CA3AF]">Loading comments…</p>
        )}
        {!loading && comments.length === 0 && (
          <p className="text-xs text-[#9CA3AF]">No comments yet.</p>
        )}
        {comments.map((c) => (
          <div key={c.id} className="flex gap-3">
            <UserAvatar
              name={c.byred_users?.name ?? "Unknown"}
              avatarUrl={c.byred_users?.avatar_url ?? null}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-xs font-medium text-[#6B7280]">
                  {c.byred_users?.name ?? "Unknown"}
                </span>
                <span className="text-[10px] text-[#9CA3AF] font-mono">
                  {formatDistanceToNow(parseISO(c.created_at), {
                    addSuffix: true,
                  })}
                </span>
              </div>
              <p className="text-xs text-[#6B7280] leading-relaxed whitespace-pre-wrap break-words">
                {renderMentions(c.comment)}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <form onSubmit={handleSubmit} className="flex gap-3 items-start">
        <UserAvatar name={displayName} avatarUrl={null} />
        <div className="flex-1 space-y-2">
          <MentionTextarea
            value={draft}
            onChange={setDraft}
            users={teamMembers}
            onSubmit={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent)}
            placeholder="Add a comment… (@name to mention, ⌘↵ to send)"
            className="text-xs bg-white border border-zinc-300 rounded-md px-3 py-2 text-[#6B7280] placeholder:text-[#9CA3AF] min-h-[64px]"
            disabled={submitting}
            autoResize
            maxHeight={200}
          />
          <Button
            type="submit"
            size="sm"
            disabled={submitting || !draft.trim()}
            className="bg-byred-red hover:bg-byred-red-hot text-white gap-1.5"
          >
            <Send className="w-3 h-3" strokeWidth={1.75} />
            {submitting ? "Sending…" : "Send"}
          </Button>
        </div>
      </form>
    </div>
  )
}
