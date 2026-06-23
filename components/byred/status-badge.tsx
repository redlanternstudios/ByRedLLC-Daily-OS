"use client"

import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { ChevronDown } from "lucide-react"

const TASK_STATUSES = ["not_started", "in_progress", "blocked", "done", "cancelled"] as const

const STATUS_CONFIG: Record<string, { label: string; classes: string }> = {
  not_started:  { label: "Not Started", classes: "bg-[#1A1D24] text-[#9CA3AF] border border-[#2A2D35]" },
  in_progress:  { label: "In Progress", classes: "bg-yellow-950 text-yellow-300 border border-yellow-800" },
  overdue:      { label: "Overdue",     classes: "bg-red-950 text-red-300 border border-red-800" },
  done:         { label: "Done",        classes: "bg-green-950 text-green-300 border border-green-800" },
  blocked:      { label: "Blocked",     classes: "bg-red-950 text-red-300 border border-red-800" },
  cancelled:    { label: "Cancelled",   classes: "bg-[#111318] text-[#9CA3AF] border border-[#2A2D35] line-through" },
}

interface StatusBadgeProps {
  status: string | null
  className?: string
  taskId?: string
  onStatusChange?: (status: string) => void
}

export function StatusBadge({ status, className, taskId, onStatusChange }: StatusBadgeProps) {
  const [current, setCurrent] = useState(status ?? "not_started")
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => { setCurrent(status ?? "not_started") }, [status])

  useEffect(() => {
    if (!open) return
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onOutside)
    return () => document.removeEventListener("mousedown", onOutside)
  }, [open])

  const key = current.toLowerCase()
  const config = STATUS_CONFIG[key] ?? { label: current, classes: "bg-zinc-100 text-[#9CA3AF]" }

  if (!taskId) {
    return (
      <span className={cn("inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium", config.classes, className)}>
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
          "inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-xs font-medium cursor-pointer transition-opacity select-none",
          config.classes,
          saving && "opacity-60 pointer-events-none",
          className,
        )}
      >
        {config.label}
        <ChevronDown size={9} strokeWidth={2.5} className={cn("transition-transform duration-150", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 w-36 rounded-lg border border-[#2A2D35] bg-[#111318] shadow-2xl overflow-hidden py-1">
          {TASK_STATUSES.map(s => {
            const sc = STATUS_CONFIG[s]
            return (
              <button
                key={s}
                type="button"
                onClick={() => void pick(s)}
                className={cn(
                  "w-full flex items-center px-2.5 py-1.5 text-left transition-colors hover:bg-[#1A1D24]",
                  s === current && "bg-[#1A1D24]/60",
                )}
              >
                <span className={cn("inline-flex px-1.5 py-px rounded-sm text-[10px] font-medium", sc.classes)}>
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
