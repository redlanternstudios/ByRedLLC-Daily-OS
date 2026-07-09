export type TaskStatus = "backlogged" | "ready" | "in progress" | "blocked" | "review" | "complete" | "archived"

export type Task = {
  id: string
  projectSlug: string
  projectName: string
  title: string
  owner: string
  assignee: string
  priority: "Low" | "Medium" | "High" | "Critical"
  dueDate: string
  status: TaskStatus
  storyPoints: number
  dependencies: string[]
  acceptanceCriteria: string[]
  definitionOfDone: string[]
  blockerNote?: string
  updatedAt: string
  completedAt?: string
}

export type Project = {
  slug: string
  name: string
  description: string
  owner: string
  color: string
}

export const projects: Project[] = [
  {
    slug: "the-lantern-daily",
    name: "The Lantern Daily",
    description: "Halal content sourcing and daily release pipeline",
    owner: "Ro",
    color: "from-amber-400/20 to-orange-500/20",
  },
  {
    slug: "by-red-os",
    name: "By Red OS",
    description: "Internal task board and project control plane",
    owner: "Ro",
    color: "from-rose-500/20 to-red-500/20",
  },
]

export const initialTasks: Task[] = [
  {
    id: "lantern-000",
    projectSlug: "the-lantern-daily",
    projectName: "The Lantern Daily",
    title: "Content source registry and provider lifecycle",
    owner: "Ro",
    assignee: "Keymon",
    priority: "Critical",
    dueDate: "2026-07-09",
    status: "in progress",
    storyPoints: 8,
    dependencies: ["Source schema", "provider trust policy"],
    acceptanceCriteria: [
      "Providers can be added, paused, quarantined, resumed, and removed",
      "Every provider change records a reason and timestamp",
    ],
    definitionOfDone: ["Live registry state is visible in the OS", "A bad provider can be cut off fast"],
    updatedAt: new Date().toISOString(),
  },
  {
    id: "lantern-001",
    projectSlug: "the-lantern-daily",
    projectName: "The Lantern Daily",
    title: "Provider registry and scoring",
    owner: "Ro",
    assignee: "Keymon",
    priority: "Critical",
    dueDate: "2026-07-10",
    status: "in progress",
    storyPoints: 8,
    dependencies: ["Source feed taxonomy", "provider trust rules"],
    acceptanceCriteria: [
      "Provider can be added, paused, quarantined, resumed, and removed",
      "Each provider shows health, trust, and last verified time",
    ],
    definitionOfDone: ["Provider state changes persist", "Audit trail captures every mutation"],
    updatedAt: new Date().toISOString(),
  },
  {
    id: "lantern-002",
    projectSlug: "the-lantern-daily",
    projectName: "The Lantern Daily",
    title: "Publisher's Recap template",
    owner: "Ro",
    assignee: "Mohamed",
    priority: "High",
    dueDate: "2026-07-11",
    status: "ready",
    storyPoints: 5,
    dependencies: ["Halal methodology page"],
    acceptanceCriteria: [
      "Every item shows halal stamp, benefits, risks, and practical understanding",
      "No item publishes without recap text",
    ],
    definitionOfDone: ["Template renders on project detail page", "Field guidance is visible to operators"],
    updatedAt: new Date().toISOString(),
  },
  {
    id: "lantern-003",
    projectSlug: "the-lantern-daily",
    projectName: "The Lantern Daily",
    title: "Halal and haram methodology page",
    owner: "Ro",
    assignee: "Mohamed",
    priority: "High",
    dueDate: "2026-07-11",
    status: "ready",
    storyPoints: 5,
    dependencies: ["Recap template", "ruling framework"],
    acceptanceCriteria: [
      "Methodology explains evidence basis in plain language",
      "Users can see how UNKNOWN outcomes are handled",
    ],
    definitionOfDone: ["Page is linked from the site", "It explains Quran, Sunnah, hadith, and sharia basis"],
    updatedAt: new Date().toISOString(),
  },
  {
    id: "lantern-004",
    projectSlug: "the-lantern-daily",
    projectName: "The Lantern Daily",
    title: "Daily bundle freeze and approval flow",
    owner: "Ro",
    assignee: "Keymon",
    priority: "Critical",
    dueDate: "2026-07-10",
    status: "blocked",
    storyPoints: 8,
    dependencies: ["Project assignment confirmation", "notification channel"],
    blockerNote: "Approval target and daily cutoff need one owner decision.",
    acceptanceCriteria: [
      "A bundle can be frozen for next day publication",
      "Ro can approve the whole bundle in one action",
    ],
    definitionOfDone: ["Approval action persists", "Bundle state becomes ready for publish"],
    updatedAt: new Date().toISOString(),
  },
  {
    id: "lantern-005",
    projectSlug: "the-lantern-daily",
    projectName: "The Lantern Daily",
    title: "Provider failure and rollback guardrails",
    owner: "Ro",
    assignee: "Keymon",
    priority: "High",
    dueDate: "2026-07-12",
    status: "backlogged",
    storyPoints: 5,
    dependencies: ["Release receipt model"],
    acceptanceCriteria: [
      "A bad provider can be quarantined",
      "A bad published bundle can be rolled back",
    ],
    definitionOfDone: ["Rollback state is visible", "Audit log shows the recovery path"],
    updatedAt: new Date().toISOString(),
  },
  {
    id: "os-001",
    projectSlug: "by-red-os",
    projectName: "By Red OS",
    title: "Task board home view",
    owner: "Ro",
    assignee: "Ro",
    priority: "Critical",
    dueDate: "2026-07-09",
    status: "in progress",
    storyPoints: 8,
    dependencies: ["Task registry", "project detail route"],
    acceptanceCriteria: [
      "Home shows active projects and remaining tasks",
      "Task status can be changed from the board",
    ],
    definitionOfDone: ["Board renders live task list", "Complete and reopen work from the UI"],
    updatedAt: new Date().toISOString(),
  },
  {
    id: "os-002",
    projectSlug: "by-red-os",
    projectName: "By Red OS",
    title: "Project home and task filters",
    owner: "Ro",
    assignee: "Ro",
    priority: "High",
    dueDate: "2026-07-09",
    status: "ready",
    storyPoints: 5,
    dependencies: ["Task registry", "project route"],
    acceptanceCriteria: [
      "Tasks can be filtered by owner, status, project, and due date",
      "Open and completed work are both visible",
    ],
    definitionOfDone: ["Filters work from the board", "Project summary cards stay in sync"],
    updatedAt: new Date().toISOString(),
  },
  {
    id: "os-003",
    projectSlug: "by-red-os",
    projectName: "By Red OS",
    title: "Handoff lane for Keymon and Mohamed",
    owner: "Ro",
    assignee: "Keymon",
    priority: "High",
    dueDate: "2026-07-12",
    status: "blocked",
    storyPoints: 3,
    dependencies: ["Username confirmation"],
    blockerNote: "Need the exact internal usernames for assignment sync.",
    acceptanceCriteria: ["Internal task ownership is visible to the team"],
    definitionOfDone: ["Assignables show up on the board"],
    updatedAt: new Date().toISOString(),
  },
  {
    id: "os-004",
    projectSlug: "by-red-os",
    projectName: "By Red OS",
    title: "Task audit trail and completion history",
    owner: "Ro",
    assignee: "Ro",
    priority: "High",
    dueDate: "2026-07-10",
    status: "in progress",
    storyPoints: 5,
    dependencies: ["Status model", "local persistence"],
    acceptanceCriteria: [
      "Every task mutation is recorded",
      "Completed work remains visible after reload",
    ],
    definitionOfDone: ["State changes survive refresh", "History is readable in the project view"],
    updatedAt: new Date().toISOString(),
  },
]

export const statusLabels: Record<TaskStatus, string> = {
  backlogged: "Backlogged",
  ready: "Ready",
  "in progress": "In Progress",
  blocked: "Blocked",
  review: "Review",
  complete: "Complete",
  archived: "Archived",
}
