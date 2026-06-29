"use client"

import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { CheckCircle2, Loader2, Play, ShieldAlert } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type Action = "start" | "clear" | "block"

function actionCopy(action: Action) {
  if (action === "start") return { label: "Start", icon: Play }
  if (action === "clear") return { label: "Clear", icon: CheckCircle2 }
  return { label: "Block", icon: ShieldAlert }
}

export function MyDashboardTaskActions({
  taskId,
  status,
  blockerFlag,
}: {
  taskId: string
  status: string
  blockerFlag?: boolean | null
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  async function updateTask(action: Action) {
    if (action === "clear") {
      const confirmed = window.confirm("Clear this task as done? Only clear it when proof exists.")
      if (!confirmed) return
    }

    const now = new Date().toISOString()
    const patch =
      action === "start"
        ? { status: "in_progress", completed_at: null }
        : action === "clear"
          ? { status: "done", completed_at: now, blocker_flag: false, blocker_reason: null }
          : { status: "blocked", blocker_flag: true, completed_at: null }

    startTransition(async () => {
      try {
        const res = await fetch(`/api/tasks/${taskId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        })

        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error ?? "Task update failed")
        }

        toast.success(
          action === "start"
            ? "Task moved to In Progress."
            : action === "clear"
              ? "Task cleared."
              : "Task marked blocked."
        )
        router.refresh()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Task update failed")
      }
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {(["start", "clear", "block"] as const).map((action) => {
        const { label, icon: Icon } = actionCopy(action)
        const disabled =
          isPending
          || (action === "start" && status === "in_progress")
          || (action === "clear" && status === "done")
          || (action === "block" && (status === "blocked" || !!blockerFlag))

        return (
          <button
            key={action}
            type="button"
            onClick={() => void updateTask(action)}
            disabled={disabled}
            className={cn(
              "inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-[10px] font-semibold transition-colors",
              "border-[#2A2D35] bg-[#111318] text-[#9CA3AF] hover:border-[#3A3D46] hover:text-white",
              action === "clear" && "hover:border-green-700/60 hover:text-green-300",
              action === "block" && "hover:border-red-800/60 hover:text-red-300",
              disabled && "cursor-not-allowed opacity-45 hover:border-[#2A2D35] hover:text-[#9CA3AF]"
            )}
            aria-label={`${label} task`}
          >
            {isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.75} />
            ) : (
              <Icon className="h-3 w-3" strokeWidth={1.75} />
            )}
            {label}
          </button>
        )
      })}
    </div>
  )
}
