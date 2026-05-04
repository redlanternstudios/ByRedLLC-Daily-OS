"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import { MoreHorizontal, ExternalLink, Copy, Archive, Edit } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { TenantPill } from "./tenant-pill"
import { StatusBadge } from "./status-badge"
import { PriorityFlag } from "./priority-flag"
import { DueDateCell } from "./due-date-cell"
import { AiModeChip } from "./ai-mode-chip"
import { useUser } from "@/lib/context/user-context"
import type { Task } from "@/types/db"

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

interface TaskTableProps {
  tasks: Task[]
}

export function TaskTable({ tasks }: TaskTableProps) {
  const currentUser = useUser()
  const displayName =
    currentUser?.profile?.name ?? currentUser?.authUser?.email ?? "User"
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm font-medium text-zinc-500">No tasks.</p>
        <p className="text-xs text-zinc-400 mt-1">Create one to start.</p>
      </div>
    )
  }

  return (
    <div className="rounded-md border border-zinc-200 overflow-hidden bg-white">
      <table className="w-full text-sm" role="grid">
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-50">
            <th className="text-left px-4 py-2.5 text-xs font-medium text-zinc-400 w-8" />
            <th className="text-left px-4 py-2.5 text-xs font-medium text-zinc-400">
              Title
            </th>
            <th className="text-left px-4 py-2.5 text-xs font-medium text-zinc-400 hidden md:table-cell">
              Tenant
            </th>
            <th className="text-left px-4 py-2.5 text-xs font-medium text-zinc-400">
              Due
            </th>
            <th className="text-left px-4 py-2.5 text-xs font-medium text-zinc-400 hidden lg:table-cell">
              Pri
            </th>
            <th className="text-left px-4 py-2.5 text-xs font-medium text-zinc-400 hidden lg:table-cell">
              Est
            </th>
            <th className="text-left px-4 py-2.5 text-xs font-medium text-zinc-400 hidden xl:table-cell">
              Owner
            </th>
            <th className="text-left px-4 py-2.5 text-xs font-medium text-zinc-400 hidden xl:table-cell">
              AI
            </th>
            <th className="text-left px-4 py-2.5 text-xs font-medium text-zinc-400">
              Status
            </th>
            <th className="px-2 py-2.5 w-10" />
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr
              key={task.id}
              className={cn(
                "border-b border-zinc-100 hover:bg-zinc-50 transition-colors h-12 relative",
                task.blocker_flag && "border-l-2 border-byred-red"
              )}
              style={{ height: "48px" }}
            >
              {/* Status dot */}
              <td className="px-4 py-2">
                <StatusBadge status={task.status} taskId={task.id} />
              </td>

              {/* Title */}
              <td className="px-4 py-2 max-w-xs">
                <Link
                  href={`/tasks/${task.id}`}
                  className="text-zinc-700 hover:text-zinc-900 font-medium truncate block focus-visible:ring-2 focus-visible:ring-byred-red focus-visible:outline-none rounded"
                >
                  {task.title}
                </Link>
              </td>

              {/* Tenant */}
              <td className="px-4 py-2 hidden md:table-cell">
                <TenantPill tenantId={task.tenant_id} />
              </td>

              {/* Due date */}
              <td className="px-4 py-2">
                <DueDateCell dueDate={task.due_date} />
              </td>

              {/* Priority */}
              <td className="px-4 py-2 hidden lg:table-cell">
                <PriorityFlag priority={task.priority} showLabel />
              </td>

              {/* Estimated minutes */}
              <td className="px-4 py-2 hidden lg:table-cell">
                <span className="text-xs text-zinc-400 font-mono">
                  {formatMinutes(task.estimated_minutes)}
                </span>
              </td>

              {/* Owner */}
              <td className="px-4 py-2 hidden xl:table-cell">
                {task.owner_user_id ? (
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-byred-red/10 border border-byred-red/20 flex items-center justify-center shrink-0">
                      <span className="text-[9px] font-semibold text-byred-red font-condensed">
                        {initials}
                      </span>
                    </div>
                    <span className="text-xs text-zinc-500">
                      {displayName.split(" ")[0]}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-zinc-400">—</span>
                )}
              </td>

              {/* AI mode */}
              <td className="px-4 py-2 hidden xl:table-cell">
                <AiModeChip mode={task.ai_mode} />
              </td>

              {/* Status */}
              <td className="px-4 py-2">
                <StatusBadge status={task.status} taskId={task.id} />
              </td>

              {/* Actions */}
              <td className="px-2 py-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-7 h-7 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
                      aria-label="Task actions"
                    >
                      <MoreHorizontal
                        className="w-3.5 h-3.5"
                        strokeWidth={1.75}
                      />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="bg-white border-zinc-200 shadow-md"
                  >
                    <DropdownMenuItem
                      asChild
                      className="text-zinc-600 focus:text-zinc-900 focus:bg-zinc-100 gap-2 text-xs cursor-pointer"
                    >
                      <Link href={`/tasks/${task.id}`}>
                        <Edit className="w-3.5 h-3.5" strokeWidth={1.75} />
                        Edit
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      asChild
                      className="text-zinc-600 focus:text-zinc-900 focus:bg-zinc-100 gap-2 text-xs cursor-pointer"
                    >
                      <Link href={`/tasks/${task.id}`}>
                        <ExternalLink
                          className="w-3.5 h-3.5"
                          strokeWidth={1.75}
                        />
                        Open
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-zinc-600 focus:text-zinc-900 focus:bg-zinc-100 gap-2 text-xs cursor-pointer"
                      onClick={() =>
                        navigator.clipboard.writeText(
                          `${window.location.origin}/tasks/${task.id}`
                        )
                      }
                    >
                      <Copy className="w-3.5 h-3.5" strokeWidth={1.75} />
                      Copy link
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-zinc-400 focus:text-zinc-600 focus:bg-zinc-100 gap-2 text-xs cursor-pointer">
                      <Archive className="w-3.5 h-3.5" strokeWidth={1.75} />
                      Archive
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
