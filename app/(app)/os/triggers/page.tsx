import { Zap, FlaskConical } from "lucide-react"

export default function OSTriggersPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      {/* Beta banner */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-amber-950/40 border border-amber-800/40">
        <FlaskConical className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" strokeWidth={1.75} />
        <div>
          <p className="text-xs font-semibold text-amber-300">In development</p>
          <p className="text-xs text-amber-400/70 mt-0.5">
            Triggers is currently being built. Event listeners and condition evaluators are not yet active.
          </p>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center">
          <Zap className="w-5 h-5 text-zinc-400" strokeWidth={1.5} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white font-condensed tracking-tight">Triggers</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Set up event-based triggers to fire automations, alerts, and actions across the OS.
          </p>
        </div>
      </div>

      {/* Planned trigger types */}
      <div className="rounded-xl bg-zinc-900 border border-zinc-800 divide-y divide-zinc-800">
        {[
          { label: "Task status changed", detail: "Fire when a task moves to blocked, done, or any custom status" },
          { label: "Due date approaching", detail: "Alert N days before a task or project deadline" },
          { label: "Blocker flagged", detail: "Trigger escalation workflow when a task is marked blocked" },
          { label: "Claude agent event", detail: "React when a Claude-initiated task creation or triage completes" },
          { label: "Manual trigger", detail: "Button-based one-click trigger for on-demand workflows" },
        ].map((t) => (
          <div key={t.label} className="flex items-start gap-3 px-5 py-4">
            <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-zinc-700 shrink-0" />
            <div>
              <p className="text-sm text-zinc-300 font-medium">{t.label}</p>
              <p className="text-xs text-zinc-600 mt-0.5">{t.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
