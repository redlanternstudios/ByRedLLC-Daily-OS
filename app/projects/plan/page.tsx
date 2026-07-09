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
]

export default function ProjectPlanPage() {
  return (
    <div className="min-h-screen bg-[#0b0c10] text-zinc-100">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-amber-300">By Red OS</p>
            <h1 className="mt-2 text-4xl font-semibold">Project plan</h1>
            <p className="mt-2 max-w-2xl text-zinc-400">
              The internal operating plan for active projects, task ownership, and completion tracking.
            </p>
          </div>
          <Link href="/projects" className="text-sm text-amber-300">
            Task board
          </Link>
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
