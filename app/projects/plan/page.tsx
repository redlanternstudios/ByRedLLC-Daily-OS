import Link from "next/link"

const sections = [
  {
    title: "Scope",
    items: [
      "Visible project board for active work",
      "Task detail view with AC and DoD",
      "Complete and reopen controls",
      "Audit trail for every state change",
      "Owner and assignee tracking",
    ],
  },
  {
    title: "Risks",
    items: [
      "Source of truth drift",
      "Stale task state after refresh",
      "Blocked items hiding their blocker",
      "Missing owner assignment",
      "Loss of completion history",
    ],
  },
  {
    title: "Use Cases",
    items: [
      "Ro checks what is left today",
      "Ro filters by project",
      "Ro marks a task complete",
      "Ro reopens a task if a gap appears",
      "Ro reviews blocked work",
    ],
  },
  {
    title: "Definition of Done",
    items: [
      "Board renders with active projects",
      "Project view renders task detail",
      "Status changes persist",
      "Completed tasks stay visible",
      "The plan is readable inside the OS",
    ],
  },
  {
    title: "Sourcing Requirements",
    items: [
      "Every source has a real provider and channel",
      "Every vendor has a trust state",
      "Every item has provenance and a fetch timestamp",
      "Every release bundle has a freeze and approval step",
      "Every publishable item has a Publisher's Recap",
    ],
  },
  {
    title: "Vendor Lifecycle",
    items: [
      "Proposed",
      "Verified",
      "Active",
      "Degraded",
      "Quarantined",
      "Paused",
      "Removed",
    ],
  },
  {
    title: "Allowed Intake Channels",
    items: [
      "Manual editorial submission",
      "RSS or feed ingestion",
      "Trusted partner submission",
      "Telegram intake",
      "Email intake",
      "Direct web capture",
      "Operator curation queue",
    ],
  },
  {
    title: "Sourcing Gates",
    items: [
      "No hallucinated items",
      "Source reachable before ingest",
      "Duplicate detection before queueing",
      "Manual review for weak evidence",
      "Halal or haram stamp required",
      "Rollback path required before release",
    ],
  },
]

export default function ProjectPlanPage() {
  return (
    <div className="min-h-screen bg-[#0b0c10] text-zinc-100">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-amber-300">By Red OS</p>
            <h1 className="mt-2 text-4xl font-semibold">Project plan</h1>
            <p className="mt-2 max-w-3xl text-zinc-400">
              The internal operating plan for active projects, task ownership, sourcing, and completion tracking.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/projects" className="rounded-2xl border border-white/10 px-4 py-3 text-sm text-zinc-200">
              Task board
            </Link>
            <Link href="/projects/sourcing" className="rounded-2xl border border-white/10 px-4 py-3 text-sm text-zinc-200">
              Sourcing map
            </Link>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {sections.map((section) => (
            <section key={section.title} className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <h2 className="text-xl font-semibold">{section.title}</h2>
              <ul className="mt-4 space-y-2 text-sm text-zinc-300">
                {section.items.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
