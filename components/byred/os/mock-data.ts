// ============================================================
// BY RED OS — Mock Data
// All mock data matches real API shapes. Used for UI/layout only.
// ============================================================

export type OSProject = {
  id: string
  tenant_id: string
  name: string
  description: string | null
  status: "active" | "paused" | "completed" | "archived"
  priority: "critical" | "high" | "medium" | "low"
  owner_user_id: string | null
  start_date: string | null
  due_date: string | null
  task_count: number
  completed_task_count: number
  board_count: number
  created_at: string
}

export type OSBoard = {
  id: string
  project_id: string
  tenant_id: string
  name: string
  description: string | null
  board_type: "kanban" | "list" | "timeline"
  status: "active" | "archived"
  task_count: number
  created_at: string
}

export type OSPhase = {
  id: string
  board_id: string
  name: string
  order_index: number
  color: string | null
}

export type OSTask = {
  id: string
  board_id: string | null
  phase_id: string | null
  project_id: string | null
  tenant_id: string
  title: string
  description: string | null
  status: "not_started" | "in_progress" | "blocked" | "done"
  priority: "critical" | "high" | "medium" | "low"
  owner_user_id: string | null
  owner_name: string | null
  due_date: string | null
  start_date: string | null
  estimated_minutes: number | null
  blocker_flag: boolean
  blocker_reason: string | null
  comment_count: number
  monday_item_id: string | null
  definition_of_done: string | null
  created_at: string
}

export type OSComment = {
  id: string
  entity_type: "task" | "project" | "board"
  entity_id: string
  user_id: string
  user_name: string
  body: string
  created_at: string
}

export type OSCalendarEvent = {
  id: string
  tenant_id: string
  project_id: string | null
  board_id: string | null
  task_id: string | null
  title: string
  description: string | null
  event_type: "task_due" | "milestone" | "meeting" | "deadline" | "reminder"
  status: "upcoming" | "in_progress" | "done" | "cancelled"
  start_at: string
  end_at: string | null
  all_day: boolean
  owner_user_id: string | null
  calendar_color: string | null
  calendar_label: string | null
  related_entity_type: string | null
  related_entity_id: string | null
}

export type OSTeamMember = {
  id: string
  name: string
  email: string
  role: string
  monday_user_id: string | null
  avatar_url: string | null
  active: boolean
  tenant_count: number
  task_count: number
}

export type OSImportBatch = {
  id: string
  source: "monday" | "csv" | "notion"
  status: "pending" | "processing" | "completed" | "failed"
  total_rows: number
  imported_rows: number
  failed_rows: number
  created_at: string
  completed_at: string | null
  error_message: string | null
}

// ---- PROJECTS ----
export const MOCK_PROJECTS: OSProject[] = [
  {
    id: "proj-1",
    tenant_id: "hirewire",
    name: "HireWire Platform v2",
    description: "Full rebuild of the candidate matching engine and employer portal.",
    status: "active",
    priority: "critical",
    owner_user_id: "rory",
    start_date: "2026-04-01",
    due_date: "2026-06-30",
    task_count: 24,
    completed_task_count: 9,
    board_count: 3,
    created_at: "2026-04-01T10:00:00Z",
  },
  {
    id: "proj-2",
    tenant_id: "byred",
    name: "By Red Brand System",
    description: "Design system, brand guidelines, and asset library.",
    status: "active",
    priority: "high",
    owner_user_id: "homira",
    start_date: "2026-03-15",
    due_date: "2026-05-31",
    task_count: 12,
    completed_task_count: 5,
    board_count: 2,
    created_at: "2026-03-15T09:00:00Z",
  },
  {
    id: "proj-3",
    tenant_id: "paradise",
    name: "Paradise 8733 Launch",
    description: "Marketing campaign and product launch for Paradise 8733.",
    status: "active",
    priority: "high",
    owner_user_id: "keymon",
    start_date: "2026-04-15",
    due_date: "2026-07-15",
    task_count: 18,
    completed_task_count: 3,
    board_count: 2,
    created_at: "2026-04-15T08:00:00Z",
  },
  {
    id: "proj-4",
    tenant_id: "byred",
    name: "Daily OS Build",
    description: "Internal operating system for By Red team.",
    status: "active",
    priority: "critical",
    owner_user_id: "rory",
    start_date: "2026-04-20",
    due_date: "2026-05-15",
    task_count: 31,
    completed_task_count: 14,
    board_count: 4,
    created_at: "2026-04-20T07:00:00Z",
  },
]

// ---- BOARDS ----
export const MOCK_BOARDS: OSBoard[] = [
  {
    id: "board-1",
    project_id: "proj-1",
    tenant_id: "hirewire",
    name: "Engineering Sprint",
    description: "Active development sprint board.",
    board_type: "kanban",
    status: "active",
    task_count: 14,
    created_at: "2026-04-01T10:00:00Z",
  },
  {
    id: "board-2",
    project_id: "proj-1",
    tenant_id: "hirewire",
    name: "Design & UX",
    description: "UI design and UX research tasks.",
    board_type: "kanban",
    status: "active",
    task_count: 10,
    created_at: "2026-04-01T10:00:00Z",
  },
  {
    id: "board-3",
    project_id: "proj-4",
    tenant_id: "byred",
    name: "OS Core Features",
    description: "Main feature development for Daily OS.",
    board_type: "kanban",
    status: "active",
    task_count: 18,
    created_at: "2026-04-20T07:00:00Z",
  },
]

// ---- TASKS ----
export const MOCK_TASKS: OSTask[] = [
  {
    id: "task-1",
    board_id: "board-1",
    phase_id: null,
    project_id: "proj-1",
    tenant_id: "hirewire",
    title: "Rebuild candidate matching algorithm",
    description: "Redesign the core matching logic with new scoring model.",
    status: "in_progress",
    priority: "critical",
    owner_user_id: "rory",
    owner_name: "Rory Semeah",
    due_date: "2026-05-10",
    start_date: "2026-04-22",
    estimated_minutes: 480,
    blocker_flag: false,
    blocker_reason: null,
    comment_count: 3,
    monday_item_id: "123456789",
    definition_of_done: "Algorithm passes all test cases with >90% accuracy score.",
    created_at: "2026-04-22T08:00:00Z",
  },
  {
    id: "task-2",
    board_id: "board-1",
    phase_id: null,
    project_id: "proj-1",
    tenant_id: "hirewire",
    title: "Employer portal authentication",
    description: "Implement SSO and MFA for employer accounts.",
    status: "blocked",
    priority: "high",
    owner_user_id: "keymon",
    owner_name: "Keymon Penn",
    due_date: "2026-05-05",
    start_date: "2026-04-25",
    estimated_minutes: 240,
    blocker_flag: true,
    blocker_reason: "Waiting on SSO provider credentials from client.",
    comment_count: 7,
    monday_item_id: "123456790",
    definition_of_done: "Login flow tested with 3 employer accounts including MFA.",
    created_at: "2026-04-25T09:00:00Z",
  },
  {
    id: "task-3",
    board_id: "board-2",
    phase_id: null,
    project_id: "proj-1",
    tenant_id: "hirewire",
    title: "Candidate profile redesign",
    description: "New card-based layout with skills visualization.",
    status: "not_started",
    priority: "medium",
    owner_user_id: "homira",
    owner_name: "Homira Gitesatani",
    due_date: "2026-05-20",
    start_date: null,
    estimated_minutes: 360,
    blocker_flag: false,
    blocker_reason: null,
    comment_count: 1,
    monday_item_id: null,
    definition_of_done: "Design approved by stakeholders and dev-ready assets exported.",
    created_at: "2026-04-26T10:00:00Z",
  },
  {
    id: "task-4",
    board_id: "board-3",
    phase_id: null,
    project_id: "proj-4",
    tenant_id: "byred",
    title: "Task import pipeline",
    description: "Build CSV-based task import pipeline into Supabase.",
    status: "done",
    priority: "high",
    owner_user_id: "rory",
    owner_name: "Rory Semeah",
    due_date: "2026-04-28",
    start_date: "2026-04-26",
    estimated_minutes: 180,
    blocker_flag: false,
    blocker_reason: null,
    comment_count: 2,
    monday_item_id: "987654321",
    definition_of_done: "Import pipeline tested with sample CSV, tasks appear in Supabase within 5s.",
    created_at: "2026-04-26T07:00:00Z",
  },
  {
    id: "task-5",
    board_id: "board-3",
    phase_id: null,
    project_id: "proj-4",
    tenant_id: "byred",
    title: "OS Kanban board UI",
    description: "Dark-themed kanban view for OS project boards.",
    status: "in_progress",
    priority: "critical",
    owner_user_id: "rory",
    owner_name: "Rory Semeah",
    due_date: "2026-04-30",
    start_date: "2026-04-28",
    estimated_minutes: 300,
    blocker_flag: false,
    blocker_reason: null,
    comment_count: 0,
    monday_item_id: null,
    definition_of_done: "Kanban renders all 4 columns with correct task cards.",
    created_at: "2026-04-28T06:00:00Z",
  },
]

// ---- COMMENTS ----
export const MOCK_COMMENTS: OSComment[] = [
  {
    id: "comment-1",
    entity_type: "task",
    entity_id: "task-2",
    user_id: "rory",
    user_name: "Rory Semeah",
    body: "Still waiting on the client to respond. Escalating today.",
    created_at: "2026-04-27T14:30:00Z",
  },
  {
    id: "comment-2",
    entity_type: "task",
    entity_id: "task-2",
    user_id: "keymon",
    user_name: "Keymon Penn",
    body: "I'll follow up with them directly. Should have an answer by EOD.",
    created_at: "2026-04-27T15:00:00Z",
  },
  {
    id: "comment-3",
    entity_type: "task",
    entity_id: "task-1",
    user_id: "homira",
    user_name: "Homira Gitesatani",
    body: "Initial scoring model draft is ready for review.",
    created_at: "2026-04-28T09:00:00Z",
  },
]

// ---- CALENDAR EVENTS ----
export const MOCK_CALENDAR_EVENTS: OSCalendarEvent[] = [
  {
    id: "cal-1",
    tenant_id: "byred",
    project_id: "proj-4",
    board_id: null,
    task_id: "task-5",
    title: "OS Kanban UI due",
    description: null,
    event_type: "task_due",
    status: "upcoming",
    start_at: "2026-04-30T23:59:00Z",
    end_at: null,
    all_day: true,
    owner_user_id: "rory",
    calendar_color: "#D7261E",
    calendar_label: "Daily OS",
    related_entity_type: "task",
    related_entity_id: "task-5",
  },
  {
    id: "cal-2",
    tenant_id: "hirewire",
    project_id: "proj-1",
    board_id: null,
    task_id: "task-2",
    title: "Employer auth SSO blocker check",
    description: "Follow up with client on SSO credentials.",
    event_type: "milestone",
    status: "upcoming",
    start_at: "2026-05-05T10:00:00Z",
    end_at: "2026-05-05T11:00:00Z",
    all_day: false,
    owner_user_id: "keymon",
    calendar_color: "#3355bb",
    calendar_label: "HireWire",
    related_entity_type: "task",
    related_entity_id: "task-2",
  },
  {
    id: "cal-3",
    tenant_id: "byred",
    project_id: "proj-4",
    board_id: null,
    task_id: null,
    title: "By Red Weekly Sync",
    description: "Weekly team standup across all active projects.",
    event_type: "meeting",
    status: "upcoming",
    start_at: "2026-04-29T14:00:00Z",
    end_at: "2026-04-29T15:00:00Z",
    all_day: false,
    owner_user_id: "rory",
    calendar_color: "#aa5500",
    calendar_label: "Team",
    related_entity_type: null,
    related_entity_id: null,
  },
  {
    id: "cal-4",
    tenant_id: "hirewire",
    project_id: "proj-1",
    board_id: null,
    task_id: null,
    title: "HireWire v2 Launch Deadline",
    description: "Hard deadline for platform launch.",
    event_type: "deadline",
    status: "upcoming",
    start_at: "2026-06-30T23:59:00Z",
    end_at: null,
    all_day: true,
    owner_user_id: "rory",
    calendar_color: "#D7261E",
    calendar_label: "HireWire",
    related_entity_type: "project",
    related_entity_id: "proj-1",
  },
]

// ---- TEAM ----
export const MOCK_TEAM: OSTeamMember[] = [
  {
    id: "rory",
    name: "Rory Semeah",
    email: "roryleesemeah@icloud.com",
    role: "admin",
    monday_user_id: "102146404",
    avatar_url: null,
    active: true,
    tenant_count: 8,
    task_count: 12,
  },
  {
    id: "homira",
    name: "Homira Gitesatani",
    email: "g.homira@gmail.com",
    role: "admin",
    monday_user_id: "102146493",
    avatar_url: null,
    active: true,
    tenant_count: 8,
    task_count: 7,
  },
  {
    id: "keymon",
    name: "Keymon Penn",
    email: "clashon64@gmail.com",
    role: "admin",
    monday_user_id: "102146081",
    avatar_url: null,
    active: true,
    tenant_count: 8,
    task_count: 9,
  },
]

// ---- IMPORT BATCHES ----
export const MOCK_IMPORT_BATCHES: OSImportBatch[] = [
  {
    id: "import-1",
    source: "monday",
    status: "completed",
    total_rows: 47,
    imported_rows: 44,
    failed_rows: 3,
    created_at: "2026-04-28T06:00:00Z",
    completed_at: "2026-04-28T06:03:12Z",
    error_message: null,
  },
  {
    id: "import-2",
    source: "monday",
    status: "processing",
    total_rows: 12,
    imported_rows: 7,
    failed_rows: 0,
    created_at: "2026-04-28T18:00:00Z",
    completed_at: null,
    error_message: null,
  },
]
