"use client"

import { useState, useEffect } from "react"
import { Plus, Zap, Radio, ToggleLeft, ToggleRight, ChevronRight, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

type Workflow = {
  id: string
  name: string
  trigger_event: string | null
  is_active: boolean
  created_at: string
  action: Record<string, unknown> | null
  condition: Record<string, unknown> | null
}

type Trigger = {
  id: string
  name: string
  watch_entity: string | null
  is_active: boolean
  created_at: string
  watch_condition: Record<string, unknown> | null
}

const TRIGGER_EVENTS = [
  "task.status_changed",
  "task.created",
  "task.overdue",
  "task.priority_changed",
  "message.mention",
  "board.phase_changed",
]

const ACTION_TYPES = [
  "notify_team",
  "send_email",
  "update_task_status",
  "create_task",
]

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export default function OSAutomationsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [triggers, setTriggers] = useState<Trigger[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<"workflows" | "triggers">("workflows")
  const [showNew, setShowNew] = useState(false)

  // workflow form
  const [wfName, setWfName] = useState("")
  const [wfTrigger, setWfTrigger] = useState("task.status_changed")
  const [wfAction, setWfAction] = useState("notify_team")
  const [wfSaving, setWfSaving] = useState(false)

  useEffect(() => {
    fetch("/api/os/automations")
      .then(r => r.json())
      .then(d => { setWorkflows(d.workflows ?? []); setTriggers(d.triggers ?? []) })
      .catch(() => toast.error("Failed to load automations"))
      .finally(() => setLoading(false))
  }, [])

  async function toggleEntity(id: string, entity: "workflow" | "trigger") {
    try {
      const res = await fetch(`/api/os/automations?id=${id}&entity=${entity}`, { method: "PATCH" })
      if (!res.ok) { toast.error("Failed to update"); return }
      const updated = await res.json() as { is_active: boolean }
      if (entity === "workflow") {
        setWorkflows(prev => prev.map(w => w.id === id ? { ...w, is_active: updated.is_active } : w))
      } else {
        setTriggers(prev => prev.map(t => t.id === id ? { ...t, is_active: updated.is_active } : t))
      }
      toast.success(updated.is_active ? "Enabled" : "Disabled")
    } catch { toast.error("Failed to update") }
  }

  async function deleteEntity(id: string, entity: "workflow" | "trigger") {
    try {
      const res = await fetch(`/api/os/automations?id=${id}&entity=${entity}`, { method: "DELETE" })
      if (!res.ok) { toast.error("Failed to delete"); return }
      if (entity === "workflow") {
        setWorkflows(prev => prev.filter(w => w.id !== id))
      } else {
        setTriggers(prev => prev.filter(t => t.id !== id))
      }
      toast.success("Deleted")
    } catch { toast.error("Failed to delete") }
  }

  async function createWorkflow(e: React.FormEvent) {
    e.preventDefault()
    if (!wfName.trim()) return
    setWfSaving(true)
    try {
      const res = await fetch("/api/os/automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: wfName.trim(),
          trigger_event: wfTrigger,
          action: { type: wfAction },
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? "Failed"); return }
      setWorkflows(prev => [data, ...prev])
      setWfName(""); setWfTrigger("task.status_changed"); setWfAction("notify_team")
      setShowNew(false)
      toast.success("Workflow created")
    } catch { toast.error("Failed") } finally { setWfSaving(false) }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-condensed font-bold text-white tracking-tight">Automations</h1>
          <p className="text-xs text-[#9CA3AF] mt-0.5">
            {workflows.length} {workflows.length === 1 ? "workflow" : "workflows"} · {triggers.length} {triggers.length === 1 ? "trigger" : "triggers"}
          </p>
        </div>
        <Button size="sm" className="bg-[#D7261E] hover:bg-[#B51E18] text-white text-xs" onClick={() => setShowNew(v => !v)}>
          <Plus className="w-3.5 h-3.5 mr-1.5" /> New workflow
        </Button>
      </div>

      {showNew && (
        <div className="bg-[#111318] border border-[#2A2D35] rounded-lg p-4">
          <p className="text-xs font-semibold text-[#9CA3AF] mb-3 uppercase tracking-wider">New workflow</p>
          <form onSubmit={createWorkflow} className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs text-[#9CA3AF]">Name *</Label>
              <Input value={wfName} onChange={e => setWfName(e.target.value)} required className="bg-[#1A1D24] border-[#2A2D35] text-white text-sm" placeholder="Notify team when task goes overdue" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-[#9CA3AF]">Trigger event</Label>
                <Select value={wfTrigger} onValueChange={setWfTrigger}>
                  <SelectTrigger className="bg-[#1A1D24] border-[#2A2D35] text-[#9CA3AF] text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#111318] border-[#2A2D35]">
                    {TRIGGER_EVENTS.map(t => (
                      <SelectItem key={t} value={t} className="text-[#9CA3AF] text-xs">{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-[#9CA3AF]">Action</Label>
                <Select value={wfAction} onValueChange={setWfAction}>
                  <SelectTrigger className="bg-[#1A1D24] border-[#2A2D35] text-[#9CA3AF] text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#111318] border-[#2A2D35]">
                    {ACTION_TYPES.map(a => (
                      <SelectItem key={a} value={a} className="text-[#9CA3AF] text-xs">{a.replace(/_/g, " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="submit" size="sm" disabled={wfSaving} className="bg-[#D7261E] hover:bg-[#B51E18] text-white text-xs">
                {wfSaving ? "Saving…" : "Create workflow"}
              </Button>
              <Button type="button" size="sm" variant="ghost" className="text-[#9CA3AF] text-xs" onClick={() => setShowNew(false)}>Cancel</Button>
            </div>
          </form>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#2A2D35]">
        {(["workflows", "triggers"] as const).map(t => (
          <button
            type="button"
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "text-xs font-medium px-3 py-2 capitalize border-b-2 -mb-px transition-colors",
              tab === t ? "border-[#D7261E] text-white" : "border-transparent text-[#9CA3AF] hover:text-[#9CA3AF]"
            )}
          >
            {t} ({t === "workflows" ? workflows.length : triggers.length})
          </button>
        ))}
      </div>

      {loading && <p className="text-xs text-[#6B7280] py-8 text-center">Loading…</p>}

      {/* Workflows */}
      {!loading && tab === "workflows" && (
        <div className="space-y-1.5">
          {workflows.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <div className="w-12 h-12 rounded-xl bg-[#111318] border border-[#2A2D35] flex items-center justify-center">
                <Zap className="w-5 h-5 text-[#6B7280]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#9CA3AF]">No workflows yet</p>
                <p className="text-xs text-[#6B7280] mt-1">Create automations that trigger on task changes, mentions, and board events.</p>
              </div>
            </div>
          )}
          {workflows.map(wf => (
            <div key={wf.id} className="bg-[#111318] border border-[#2A2D35] rounded-lg px-4 py-3 flex items-center gap-3 hover:border-[#2A2D35] transition-colors">
              <div className={cn("w-7 h-7 rounded-md flex items-center justify-center shrink-0", wf.is_active ? "bg-[#D7261E]/10" : "bg-[#1A1D24]")}>
                <Zap className={cn("w-3.5 h-3.5", wf.is_active ? "text-[#D7261E]" : "text-[#6B7280]")} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{wf.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] text-[#6B7280]">{wf.trigger_event ?? "—"}</span>
                  {wf.action?.type !== undefined && (
                    <>
                      <ChevronRight className="w-2.5 h-2.5 text-[#6B7280]" />
                      <span className="text-[10px] text-[#6B7280]">{String(wf.action.type).replace(/_/g, " ")}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[#6B7280]">{formatDate(wf.created_at)}</span>
                <button
                  type="button"
                  onClick={() => toggleEntity(wf.id, "workflow")}
                  title={wf.is_active ? "Disable workflow" : "Enable workflow"}
                  className="transition-opacity hover:opacity-70"
                >
                  {wf.is_active
                    ? <ToggleRight className="w-4 h-4 text-green-500" />
                    : <ToggleLeft className="w-4 h-4 text-[#6B7280]" />
                  }
                </button>
                <button
                  type="button"
                  onClick={() => deleteEntity(wf.id, "workflow")}
                  title="Delete workflow"
                  className="text-[#6B7280] hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Triggers */}
      {!loading && tab === "triggers" && (
        <div className="space-y-1.5">
          {triggers.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <div className="w-12 h-12 rounded-xl bg-[#111318] border border-[#2A2D35] flex items-center justify-center">
                <Radio className="w-5 h-5 text-[#6B7280]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#9CA3AF]">No triggers yet</p>
                <p className="text-xs text-[#6B7280] mt-1">Triggers watch entities and alert your team when conditions are met.</p>
              </div>
            </div>
          )}
          {triggers.map(tr => (
            <div key={tr.id} className="bg-[#111318] border border-[#2A2D35] rounded-lg px-4 py-3 flex items-center gap-3 hover:border-[#2A2D35] transition-colors">
              <div className={cn("w-7 h-7 rounded-md flex items-center justify-center shrink-0", tr.is_active ? "bg-sky-500/10" : "bg-[#1A1D24]")}>
                <Radio className={cn("w-3.5 h-3.5", tr.is_active ? "text-sky-400" : "text-[#6B7280]")} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{tr.name}</p>
                <p className="text-[10px] text-[#6B7280] mt-0.5">Watching: {tr.watch_entity ?? "—"}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[#6B7280]">{formatDate(tr.created_at)}</span>
                <button
                  type="button"
                  onClick={() => toggleEntity(tr.id, "trigger")}
                  title={tr.is_active ? "Disable trigger" : "Enable trigger"}
                  className="transition-opacity hover:opacity-70"
                >
                  {tr.is_active
                    ? <ToggleRight className="w-4 h-4 text-green-500" />
                    : <ToggleLeft className="w-4 h-4 text-[#6B7280]" />
                  }
                </button>
                <button
                  type="button"
                  onClick={() => deleteEntity(tr.id, "trigger")}
                  title="Delete trigger"
                  className="text-[#6B7280] hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
