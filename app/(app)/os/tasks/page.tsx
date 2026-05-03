"use client"

import { useState } from "react"
import Link from "next/link"
import useSWR from "swr"
import { ListTodo, Search, MessageSquare, Clock, AlertTriangle, Loader2 } from "lucide-react"
import { OSStatusBadge, OSPriorityBadge } from "@/components/byred/os/os-badge"
import { OSAvatar } from "@/components/byred/os/os-avatar"
import { OSEmpty } from "@/components/byred/os/os-empty"
import { cn } from "@/lib/utils"
import type { ByredTask } from "@/types/database"

const STATUS_OPTIONS = ["all", "not_started", "in_progress", "blocked", "done"]
const PRIORITY_OPTIONS = ["all", "critical", "high", "medium", "low"]

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function OSTasksPage() {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")

  const { data: tasks, isLoading, error } = useSWR<ByredTask[]>("/api/tasks", fetcher)

  const today = new Date().toISOString().split("T")[0]

  const filtered = (tasks ?? []).filter((t) => {
    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === "all" || t.status === statusFilter
    const matchesPriority = priorityFilter === "all" || t.priority === priorityFilter
    return matchesSearch && matchesStatus && matchesPriority
  })

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white font-condensed tracking-tight">Tasks</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {isLoading ? "Loading..." : `${tasks?.length ?? 0} total tasks`}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" strokeWidth={1.75} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks..."
            className="w-full pl-8 pr-3 py-2 text-sm bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "px-2.5 py-1.5 rounded-lg text-[11px] font-medium capitalize transition-colors",
                statusFilter === s
                  ? "bg-white/10 text-white border border-white/15"
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              {s === "all" ? "All" : s.replace("_", " ")}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {PRIORITY_OPTIONS.map((p) => (
            <button
              key={p}
              onClick={() => setPriorityFilter(p)}
              className={cn(
                "px-2.5 py-1.5 rounded-lg text-[11px] font-medium capitalize transition-colors",
                priorityFilter === p
                  ? "bg-white/10 text-white border border-white/15"
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              {p === "all" ? "Priority" : p}
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
        <div className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
          <div className="hidden md:grid grid-cols-[1fr_120px_100px_80px_80px] gap-4 px-5 py-2.5 border-b border-zinc-800 text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">
            <span>Task</span>
            <span>Status</span>
            <span>Priority</span>
            <span>Owner</span>
            <span>Due</span>
          </div>
          <div className="divide-y divide-zinc-800/60">
            {filtered.map((task) => {
              const isOverdue = task.due_date && task.due_date < today && task.status !== "done"
              return (
                <Link
                  key={task.id}
                  href={`/os/tasks/${task.id}`}
                  className="flex md:grid md:grid-cols-[1fr_120px_100px_80px_80px] gap-2 md:gap-4 items-center px-5 py-3.5 hover:bg-white/[0.03] transition-colors group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {task.blocker_flag && (
                      <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" strokeWidth={2} />
                    )}
                    <span className="text-sm text-zinc-200 group-hover:text-white truncate">
                      {task.title}
                    </span>
                  </div>
                  <div className="hidden md:block">
                    <OSStatusBadge status={task.status} />
                  </div>
                  <div className="hidden md:block">
                    <OSPriorityBadge priority={task.priority} />
                  </div>
                  <div className="hidden md:flex items-center">
                    {task.owner_user_id ? (
                      <OSAvatar userId={task.owner_user_id} size="xs" />
                    ) : (
                      <span className="text-zinc-700 text-xs">—</span>
                    )}
                  </div>
                  <div className="hidden md:flex items-center gap-1">
                    {task.due_date ? (
                      <span className={cn("text-xs flex items-center gap-1", isOverdue ? "text-red-400" : "text-zinc-600")}>
                        {isOverdue && <Clock className="w-3 h-3" strokeWidth={2} />}
                        {new Date(task.due_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    ) : (
                      <span className="text-zinc-700 text-xs">—</span>
                    )}
                  </div>
                  <div className="md:hidden flex items-center gap-1.5 ml-auto">
                    <OSPriorityBadge priority={task.priority} />
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
