// Re-export types from the generated database types
import type { ByredTenant as _ByredTenant } from "./database"
export type { ByredTenant } from "./database"
export type Tenant = Omit<_ByredTenant, "monday_board_id" | "monday_group_id"> & {
  monday_board_id?: string | null
  monday_group_id?: string | null
}
// keep the rest of the re-exports but remove ByredTenant from the list:
export type {
  ByredUser as User,
  ByredTask,
  ByredLead as Lead,
  ByredActivity as Activity,
  ByredDailyBrief as DailyBrief,
  DailyBriefSummary,
  TaskStatus,
  TaskPriority,
  AiMode,
  LeadStage,
  UserRole,
  TenantType,
} from "./database"

// Keep backward-compatible Task type for existing components
// Maps from byred_tasks schema to the UI expected shape
export type Task = {
  id: string
  tenant_id: string
  monday_item_id: string | null
  title: string
  description: string | null
  status: string | null
  priority: string | null
  due_date: string | null
  estimated_minutes: number
  ai_mode: "HUMAN_ONLY" | "AI_ASSIST" | "AI_DRAFT" | "AI_EXECUTE" | null
  blocker_flag: boolean
  blocker_reason: string | null
  blocked_by_task_id: string | null
  owner_user_id: string | null
  revenue_impact_score: number
  urgency_score: number
  created_at: string
}

// Helper to map from database row to UI Task type
export function mapTaskFromDb(row: {
  id: string
  tenant_id: string
  monday_item_id: string | null
  title: string
  description: string | null
  status: string
  priority: string
  due_date: string | null
  estimated_minutes: number | null
  ai_mode: string
  blocker_flag: boolean | null
  blocker_reason: string | null
  blocked_by_task_id: string | null
  owner_user_id: string | null
  revenue_impact_score: number | null
  urgency_score: number | null
  created_at: string | null
}): Task {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    monday_item_id: row.monday_item_id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    due_date: row.due_date,
    estimated_minutes: row.estimated_minutes ?? 30,
    ai_mode: row.ai_mode as Task["ai_mode"],
    blocker_flag: row.blocker_flag ?? false,
    blocker_reason: row.blocker_reason,
    blocked_by_task_id: row.blocked_by_task_id,
    owner_user_id: row.owner_user_id,
    revenue_impact_score: row.revenue_impact_score ?? 5,
    urgency_score: row.urgency_score ?? 5,
    created_at: row.created_at ?? new Date().toISOString(),
  }
}

// Backward compatible DailyPlan type
export type DailyPlan = {
  id: string
  date: string
  user_id: string
  critical_now: Task[]
  money_moves: Task[]
  quick_wins: Task[]
  coming_up: Task[]
  deep_work: Task[]
  created_at: string
}
