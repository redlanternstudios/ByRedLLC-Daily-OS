import { GitBranch, FlaskConical } from "lucide-react"

export default function OSWorkflowsPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      {/* Beta banner */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-amber-950/40 border border-amber-800/40">
        <FlaskConical className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" strokeWidth={1.75} />
        <div>
          <p className="text-xs font-semibold text-amber-300">In development</p>
          <p className="text-xs text-amber-400/70 mt-0.5">
            Workflows is currently being built. The visual flow builder and execution engine are not yet active.
          </p>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#1A1D24] border border-[#2A2D35] flex items-center justify-center">
          <GitBranch className="w-5 h-5 text-[#9CA3AF]" strokeWidth={1.5} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white font-condensed tracking-tight">Workflows</h1>
          <p className="text-sm text-[#9CA3AF] mt-0.5">
            Build and manage automated workflows across your projects and team.
          </p>
        </div>
      </div>

      {/* Planned features */}
      <div className="rounded-xl bg-[#111318] border border-[#2A2D35] divide-y divide-[#2A2D35]">
        {[
          { label: "Visual flow builder", detail: "Drag-and-drop node editor for building multi-step automations" },
          { label: "Trigger conditions", detail: "Fire workflows on task status changes, due dates, team events, and more" },
          { label: "Action library", detail: "Send Slack messages, create tasks, update records, call webhooks" },
          { label: "Execution history", detail: "Full run log with step-by-step trace and error details" },
          { label: "Scheduling", detail: "Cron-based scheduling for recurring workflows" },
        ].map((f) => (
          <div key={f.label} className="flex items-start gap-3 px-5 py-4">
            <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-[#1A1D24] shrink-0" />
            <div>
              <p className="text-sm text-[#9CA3AF] font-medium">{f.label}</p>
              <p className="text-xs text-[#6B7280] mt-0.5">{f.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
