"use client"

import { useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import useSWR from "swr"
import {
  ArrowRight, Loader2, AlertCircle, Layers,
  Circle, PlayCircle, OctagonX, CheckCircle2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { DerivedBoard } from "@/app/api/os/boards/route"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

// Status colors: gray (not started) → yellow (in progress) → red (blocked) → green (done)
const COLUMN_CONFIG = [
  { key: "not_started", label: "Not Started", icon: Circle,       color: "text-[#9CA3AF]" },
  { key: "in_progress", label: "In Progress", icon: PlayCircle,   color: "text-yellow-400"  },
  { key: "blocked",     label: "Blocked",     icon: OctagonX,     color: "text-red-400"  },
  { key: "done",        label: "Done",        icon: CheckCircle2, color: "text-green-400" },
] as const

export default function OSBoardsPage() {
  const searchParams = useSearchParams()
  const tenantFilter = searchParams.get("tenant")

  const { data: boards, isLoading, error, mutate } = useSWR<DerivedBoard[]>("/api/os/boards", fetcher)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  const visible = (boards ?? []).filter((b) => !dismissed.has(b.id) && (!tenantFilter || b.tenant_id === tenantFilter))

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-white font-condensed tracking-tight">Boards</h1>
        <p className="text-sm text-[#9CA3AF] mt-1">
          {isLoading ? "Loading..." : `${visible.length} active tenant boards`}
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-5 h-5 text-[#6B7280] animate-spin" strokeWidth={1.75} />
        </div>
      ) : error ? (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-lg bg-red-950/40 border border-red-800/40 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" strokeWidth={1.75} />
          Failed to load boards. Please refresh.
        </div>
      ) : visible.length === 0 ? (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-lg bg-[#111318] border border-[#2A2D35] text-[#9CA3AF] text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" strokeWidth={1.75} />
          No boards yet. Add active tenants to see boards here.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map((board) => {
            const pctDone = board.task_count > 0
              ? Math.round((board.columns.done / board.task_count) * 100)
              : 0

            return (
              <div
                key={board.id}
                className="rounded-xl bg-[#111318] border border-[#2A2D35] hover:border-[#2A2D35] transition-colors group overflow-hidden"
              >
                {/* Color strip from tenant color */}
                <div className="h-1" style={{ backgroundColor: board.tenant_color }} />

                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Layers className="w-3.5 h-3.5 text-[#6B7280]" strokeWidth={1.75} />
                        <span className="text-[10px] font-medium text-[#9CA3AF] uppercase tracking-wider">
                          Kanban
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-white group-hover:text-zinc-100">
                        {board.tenant_name}
                      </h3>
                    </div>
                    <Link href={`/os/boards/${board.id}`} className="shrink-0 mt-1">
                      <ArrowRight className="w-4 h-4 text-[#6B7280] group-hover:text-[#9CA3AF] transition-colors" strokeWidth={1.75} />
                    </Link>
                  </div>

                  {/* Column counts */}
                  <div className="grid grid-cols-4 gap-1.5 mt-4">
                    {COLUMN_CONFIG.map(({ key, label, icon: Icon, color }) => (
                      <div key={key} className="rounded-lg bg-[#1A1D24]/80 p-2 text-center">
                        <Icon className={cn("w-3 h-3 mx-auto mb-1", color)} strokeWidth={1.75} />
                        <p className="text-sm font-bold text-white font-condensed">
                          {board.columns[key as keyof typeof board.columns]}
                        </p>
                        <p className="text-[9px] text-[#6B7280] leading-tight">{label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Progress bar */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-[#6B7280]">{board.task_count} total tasks</span>
                      <span className="text-[10px] text-[#9CA3AF]">{pctDone}% done</span>
                    </div>
                    <div className="h-1 bg-[#1A1D24] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${pctDone}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
