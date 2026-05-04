"use client"

import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { ChevronDown } from "lucide-react"

// Status options available for task mutations
const TASK_STATUSES = ["not_started", "in_progress", "blocked", "done", "cancelled"] as const

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  not_started:  { label: "Not Started",  className: "bg-zinc-800 text-zinc-300 border border-zinc-700" },
  in_progress:  { label: "In Progress",  className: "bg-yellow-950 text-yellow-300 border border-yellow-800" },
  blocked:      { label: "Blocked",      className: "bg-red-950 text-red-300 border border-red-800" },
  done:         { label: "Done",         className: "bg-green-950 text-green-300 border border-green-800" },
  active:       { label: "Active",       className: "bg-green-950 text-green-300 border border-green-800" },
  paused:       { label: "Paused",       className: "bg-yellow-950 text-yellow-300 border border-yellow-800" },
  completed:    { label: "Completed",    className: "bg-green-950 text-green-300 border border-green-800" },
  archived:     { label: "Archived",     className: "bg-zinc-900 text-zinc-500 border border-zinc-800" },
  upcoming:     { label: "Upcoming",     className: "bg-zinc-800 text-zinc-300 border border-zinc-700" },
  cancelled:    { label: "Cancelled",    className: "bg-zinc-900 text-zinc-500 border border-zinc-800" },
  pending:      { label: "Pending",      className: "bg-yellow-950 text-yellow-300 border border-yellow-800" },
  processing:   { label: "Processing",   className: "bg-yellow-950 text-yellow-300 border border-yellow-800" },
  failed:       { label: "Failed",       className: "bg-red-950 text-red-300 border border-red-800" },
  overdue:      { label: "Overdue",      className: "bg-red-950 text-red-300 border border-red-800" },
}

type StatusBadgeProps = {
  status: string
  className?: string
  taskId?: string
  onStatusChange?: (status: string) => void
}

export function OSStatusBadge({ status, className, taskId, onStatusChange }: StatusBadgeProps) {
  const [current, setCurrent] = useState(status)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => { setCurrent(status) }, [status])

  useEffect(() => {
    if (!open) return
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onOutside)
    return () => document.removeEventListener("mousedown", onOutside)
  }, [open])

  const config = STATUS_MAP[current] ?? { label: current, className: "bg-zinc-800 text-zinc-400 border border-zinc-700" }

  if (!taskId) {
    return (
      <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium tracking-wide", config.className, className)}>
        {config.label}
      </span>
    )
  }

  async function pick(next: string) {
    if (next === current || saving) return
    setOpen(false)
    const prev = current
    setCurrent(next)
    setSaving(true)
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      })
      if (!res.ok) throw new Error("api error")
      onStatusChange?.(next)
    } catch {
      setCurrent(prev)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={cn(
          "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium tracking-wide cursor-pointer transition-opacity select-none",
          config.className,
          saving && "opacity-60 pointer-events-none",
          className,
        )}
      >
        {config.label}
        <ChevronDown size={9} strokeWidth={2.5} className={cn("transition-transform duration-150", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 w-36 rounded-lg border border-zinc-700 bg-zinc-900 shadow-2xl overflow-hidden py-1">
          {TASK_STATUSES.map(s => {
            const sc = STATUS_MAP[s]
            return (
              <button
                key={s}
                type="button"
                onClick={() => void pick(s)}
                className={cn(
                  "w-full flex items-center px-2.5 py-1.5 text-left transition-colors hover:bg-zinc-800/80",
                  s === current && "bg-zinc-800/50",
                )}
              >
                <span className={cn("inline-flex px-1.5 py-px rounded text-[10px] font-medium", sc.className)}>
                  {sc.label}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function OSPriorityBadge({ priority, className }: { priority: string; className?: string }) {
  const PRIORITY_MAP: Record<string, { label: string; className: string }> = {
    critical: { label: "Critical", className: "bg-red-950 text-red-300 border border-red-800" },
    high:     { label: "High",     className: "bg-red-950 text-red-300 border border-red-800" },
    medium:   { label: "Medium",   className: "bg-yellow-950 text-yellow-300 border border-yellow-800" },
    low:      { label: "Low",      className: "bg-green-950 text-green-300 border border-green-800" },
  }
  const config = PRIORITY_MAP[priority] ?? { label: priority, className: "bg-zinc-800 text-zinc-400 border border-zinc-700" }
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium tracking-wide", config.className, className)}>
      {config.label}
    </span>
  )
}

export function OSBlockerBadge({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-red-950 text-red-300 border border-red-800", className)}>
      <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
      Blocked
    </span>
  )
}
