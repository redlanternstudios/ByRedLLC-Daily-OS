"use client"

import { cn } from "@/lib/utils"

type StatusBadgeProps = {
  status: string
  className?: string
}

// Status — street light: gray (idle) → yellow (moving/caution) → red (stop/blocked) → green (done/go)
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
}

// Priority — street light: red (critical) → yellow (high) → green (medium) → gray (low)
const PRIORITY_MAP: Record<string, { label: string; className: string }> = {
  critical: { label: "Critical", className: "bg-red-950 text-red-300 border border-red-800" },
  high:     { label: "High",     className: "bg-yellow-950 text-yellow-300 border border-yellow-800" },
  medium:   { label: "Medium",   className: "bg-green-950 text-green-300 border border-green-800" },
  low:      { label: "Low",      className: "bg-zinc-800 text-zinc-400 border border-zinc-700" },
}

export function OSStatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_MAP[status] ?? { label: status, className: "bg-zinc-800 text-zinc-400 border border-zinc-700" }
  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium tracking-wide",
      config.className, className
    )}>
      {config.label}
    </span>
  )
}

export function OSPriorityBadge({ priority, className }: { priority: string; className?: string }) {
  const config = PRIORITY_MAP[priority] ?? { label: priority, className: "bg-zinc-800 text-zinc-400 border border-zinc-700" }
  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium tracking-wide",
      config.className, className
    )}>
      {config.label}
    </span>
  )
}

export function OSBlockerBadge({ className }: { className?: string }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-red-950 text-red-300 border border-red-800",
      className
    )}>
      <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
      Blocked
    </span>
  )
}
