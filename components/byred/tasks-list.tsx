"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { TaskTable } from "@/components/byred/task-table"
import { TENANT_NAMES } from "@/lib/tenant-colors"
import type { Task } from "@/types/db"

const TENANT_OPTIONS = Object.entries(TENANT_NAMES).map(([id, name]) => ({
  id,
  name,
}))
const STATUS_OPTIONS = ["not_started", "in_progress", "overdue", "done", "blocked"]
const AI_MODE_OPTIONS = ["HUMAN_ONLY", "AI_ASSIST", "AI_DRAFT", "AI_EXECUTE"]
const PRIORITY_OPTIONS = ["critical", "high", "medium", "low"]

interface TasksListProps {
  initialTasks: Task[]
}

export function TasksList({ initialTasks }: TasksListProps) {
  const [search, setSearch] = useState("")
  const [tenantFilter, setTenantFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [aiModeFilter, setAiModeFilter] = useState<string>("all")
  const [priorityFilter, setPriorityFilter] = useState<string>("all")
  const [showOverdue, setShowOverdue] = useState(false)
  const [showBlockers, setShowBlockers] = useState(false)

  function clearFilters() {
    setSearch("")
    setTenantFilter("all")
    setStatusFilter("all")
    setAiModeFilter("all")
    setPriorityFilter("all")
    setShowOverdue(false)
    setShowBlockers(false)
  }

  const filtered = useMemo(() => {
    let tasks = [...initialTasks]
    if (search) {
      const q = search.toLowerCase()
      tasks = tasks.filter((t) => t.title.toLowerCase().includes(q))
    }
    if (tenantFilter !== "all")
      tasks = tasks.filter((t) => t.tenant_id === tenantFilter)
    if (statusFilter !== "all")
      tasks = tasks.filter((t) => t.status === statusFilter)
    if (aiModeFilter !== "all")
      tasks = tasks.filter((t) => t.ai_mode === aiModeFilter)
    if (priorityFilter !== "all")
      tasks = tasks.filter((t) => t.priority === priorityFilter)
    if (showOverdue) tasks = tasks.filter((t) => t.status === "overdue")
    if (showBlockers) tasks = tasks.filter((t) => t.blocker_flag)
    return tasks
  }, [
    initialTasks,
    search,
    tenantFilter,
    statusFilter,
    aiModeFilter,
    priorityFilter,
    showOverdue,
    showBlockers,
  ])

  const hasFilters =
    search ||
    tenantFilter !== "all" ||
    statusFilter !== "all" ||
    aiModeFilter !== "all" ||
    priorityFilter !== "all" ||
    showOverdue ||
    showBlockers

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-condensed font-bold text-zinc-900 tracking-tight">
            Tasks
          </h1>
          <p className="text-sm text-[#9CA3AF] mt-1">
            {filtered.length} {filtered.length === 1 ? "task" : "tasks"}
          </p>
        </div>
        <Button
          asChild
          className="bg-byred-red hover:bg-byred-red-hot text-white gap-2"
        >
          <Link href="/tasks/new">
            <Plus className="w-4 h-4" strokeWidth={1.75} />
            Create task
          </Link>
        </Button>
      </div>

      {/* Filter bar */}
      <div className="sticky top-14 z-20 bg-[#f7f6f4] pb-3 pt-1">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks..."
            className="h-8 w-48 bg-white border-zinc-300 text-[#6B7280] placeholder:text-[#9CA3AF] text-xs focus-visible:ring-byred-red"
          />

          {/* Tenant */}
          <Select value={tenantFilter} onValueChange={setTenantFilter}>
            <SelectTrigger className="h-8 w-44 bg-white border-zinc-300 text-xs text-[#6B7280]">
              <SelectValue placeholder="Tenant" />
            </SelectTrigger>
            <SelectContent className="bg-white border-zinc-200 shadow-md">
              <SelectItem value="all" className="text-xs text-[#6B7280]">
                All tenants
              </SelectItem>
              {TENANT_OPTIONS.map((t) => (
                <SelectItem
                  key={t.id}
                  value={t.id}
                  className="text-xs text-[#6B7280]"
                >
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 w-36 bg-white border-zinc-300 text-xs text-[#6B7280]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-white border-zinc-200 shadow-md">
              <SelectItem value="all" className="text-xs text-[#6B7280]">
                All statuses
              </SelectItem>
              {STATUS_OPTIONS.map((s) => (
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

          {/* AI Mode */}
          <Select value={aiModeFilter} onValueChange={setAiModeFilter}>
            <SelectTrigger className="h-8 w-36 bg-white border-zinc-300 text-xs text-[#6B7280]">
              <SelectValue placeholder="AI Mode" />
            </SelectTrigger>
            <SelectContent className="bg-white border-zinc-200 shadow-md">
              <SelectItem value="all" className="text-xs text-[#6B7280]">
                All modes
              </SelectItem>
              {AI_MODE_OPTIONS.map((m) => (
                <SelectItem key={m} value={m} className="text-xs text-[#6B7280]">
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Priority */}
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="h-8 w-32 bg-white border-zinc-300 text-xs text-[#6B7280]">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent className="bg-white border-zinc-200 shadow-md">
              <SelectItem value="all" className="text-xs text-[#6B7280]">
                All priorities
              </SelectItem>
              {PRIORITY_OPTIONS.map((p) => (
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

          {/* Toggles */}
          <div className="flex items-center gap-2">
            <Switch
              id="overdue"
              checked={showOverdue}
              onCheckedChange={setShowOverdue}
              className="data-[state=checked]:bg-byred-red"
            />
            <Label
              htmlFor="overdue"
              className="text-xs text-[#9CA3AF] cursor-pointer"
            >
              Overdue only
            </Label>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="blockers"
              checked={showBlockers}
              onCheckedChange={setShowBlockers}
              className="data-[state=checked]:bg-byred-red"
            />
            <Label
              htmlFor="blockers"
              className="text-xs text-[#9CA3AF] cursor-pointer"
            >
              Blockers only
            </Label>
          </div>

          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-8 text-xs text-[#9CA3AF] hover:text-[#6B7280] gap-1.5"
            >
              <X className="w-3 h-3" strokeWidth={1.75} />
              Clear filters
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <TaskTable tasks={filtered} />

      {/* Footer */}
      <p className="text-xs text-[#9CA3AF] text-right font-mono">
        Showing {filtered.length} of {initialTasks.length} tasks
      </p>
    </div>
  )
}
