"use client"

import { useState } from "react"
import Link from "next/link"
import useSWR from "swr"
import { FolderKanban, Plus, ArrowRight, Search, Loader2, AlertCircle } from "lucide-react"
import { OSAvatar } from "@/components/byred/os/os-avatar"
import { OSEmpty } from "@/components/byred/os/os-empty"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

type Tenant = {
  id: string
  name: string
  type: string
  color: string | null
}

type TenantGroup = {
  tenant_id: string
  total: number
  done: number
  blocked: number
  in_progress: number
  members: string[]
  latest_due: string | null
}

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error("Failed to load")
    return r.json()
  })

function tenantColor(color: string | null): string {
  if (!color || color === "amber") return "#F59E0B"
  if (color === "blue") return "#0EA5E9"
  if (color === "violet") return "#8B5CF6"
  return color
}

export default function OSProjectsPage() {
  const [search, setSearch] = useState("")
  const [creating, setCreating] = useState(false)

  const { data: taskData, error: taskError, isLoading: taskLoading } = useSWR<{
    tasks: Array<{ tenant_id: string; status: string; owner_user_id: string | null; due_date: string | null; blocker_flag: boolean }>
  }>("/api/os/projects/tasks", fetcher)

  const { data: tenantData } = useSWR<{ tenants: Tenant[] }>("/api/os/tenants", fetcher)

  const tenantMap = new Map<string, Tenant>((tenantData?.tenants ?? []).map((t) => [t.id, t]))

  // Group tasks by tenant
  const groups: TenantGroup[] = []
  if (taskData?.tasks) {
    const map = new Map<string, TenantGroup>()
    for (const t of taskData.tasks) {
      const tid = t.tenant_id
      if (!map.has(tid)) {
        map.set(tid, { tenant_id: tid, total: 0, done: 0, blocked: 0, in_progress: 0, members: [], latest_due: null })
      }
      const g = map.get(tid)!
      g.total++
      if (t.status === "done") g.done++
      if (t.blocker_flag) g.blocked++
      if (t.status === "in_progress") g.in_progress++
      if (t.owner_user_id && !g.members.includes(t.owner_user_id)) g.members.push(t.owner_user_id)
      if (t.due_date && (!g.latest_due || t.due_date > g.latest_due)) g.latest_due = t.due_date
    }
    groups.push(...map.values())
  }

  const filtered = groups.filter((g) => {
    const tenant = tenantMap.get(g.tenant_id)
    const name = tenant?.name ?? g.tenant_id
    return name.toLowerCase().includes(search.toLowerCase())
  })

  async function handleNewProject() {
    setCreating(true)
    try {
      await new Promise((r) => setTimeout(r, 400))
      toast.info("Create projects from the Boards page — click '+ New Board'.")
    } finally {
      setCreating(false)
    }
  }

  const isLoading = taskLoading

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white font-condensed tracking-tight">Projects</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {isLoading ? "Loading..." : `${groups.length} active workspaces`}
          </p>
        </div>
        <button
          onClick={handleNewProject}
          disabled={creating}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#D7261E] text-white text-sm font-medium hover:bg-[#B51E18] transition-colors disabled:opacity-60"
        >
          {creating ? (
            <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />
          ) : (
            <Plus className="w-4 h-4" strokeWidth={2} />
          )}
          New Project
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" strokeWidth={1.75} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search projects..."
          className="w-full pl-8 pr-3 py-2 text-sm bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
        />
      </div>

      {isLoading && (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-5 h-5 animate-spin text-zinc-600" strokeWidth={1.75} />
        </div>
      )}

      {taskError && !isLoading && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-lg bg-red-950/40 border border-red-900/50 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" strokeWidth={1.75} />
          Failed to load projects. Check your connection and try again.
        </div>
      )}

      {!isLoading && !taskError && filtered.length === 0 && (
        <OSEmpty
          icon={FolderKanban}
          title="No projects found"
          description={search ? "Try adjusting your search." : "Import tasks from Monday.com to get started."}
        />
      )}

      {/* Project cards */}
      {!isLoading && !taskError && filtered.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((group) => {
            const tenant = tenantMap.get(group.tenant_id)
            const name = tenant?.name ?? group.tenant_id
            const color = tenantColor(tenant?.color ?? null)
            const pct = group.total > 0 ? Math.round((group.done / group.total) * 100) : 0

            return (
              <div
                key={group.tenant_id}
                className="rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors overflow-hidden"
              >
                <div className="px-5 pt-5 pb-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span
                          className="inline-flex px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide"
                          style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}
                        >
                          {tenant?.type ?? "workspace"}
                        </span>
                        {group.blocked > 0 && (
                          <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-medium bg-red-950/60 text-red-400 border border-red-800/40">
                            {group.blocked} blocked
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-semibold text-white truncate">{name}</h3>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {group.in_progress} in progress &middot; {group.total - group.done} remaining
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-zinc-600">Completion</span>
                      <span className="text-[10px] text-zinc-500">
                        {group.done}/{group.total} tasks &middot; {pct}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, background: color }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-800 bg-black/20">
                  <div className="flex items-center gap-3">
                    {group.members.slice(0, 4).map((m) => (
                      <OSAvatar key={m} userId={m} size="xs" />
                    ))}
                    {group.latest_due && (
                      <span className="text-xs text-zinc-600">
                        Latest due {new Date(group.latest_due + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    )}
                  </div>
                  <Link
                    href={`/os/boards?tenant=${group.tenant_id}`}
                    className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-200 transition-colors"
                  >
                    View boards <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
