export type {
  Database,
  ByredTenant,
  ByredTenantInsert,
  ByredTenantUpdate,
  ByredUser,
  ByredUserInsert,
  ByredUserUpdate,
  ByredUserTenant,
  ByredUserTenantInsert,
  ByredUserTenantUpdate,
  ByredTask,
  ByredTaskInsert,
  ByredTaskUpdate,
  ByredLead,
  ByredLeadInsert,
  ByredLeadUpdate,
  ByredActivity,
  ByredActivityInsert,
  ByredActivityUpdate,
  ByredDailyBrief,
  ByredDailyBriefInsert,
  ByredDailyBriefUpdate,
} from "./db.generated"

import type { LeadStage } from "./database"

// Re-export convenience aliases used by the existing UI
export type {
  ByredTenant as Tenant,
  ByredUser as User,
  ByredDailyBrief as DailyBrief,
} from "./db.generated"

export type {
  DailyBriefSummary,
  TaskStatus,
  TaskPriority,
  AiMode,
  LeadStage,
  UserRole,
  TenantType,
} from "./database"

/** Lead row shaped for CRM UI and server mappers */
export type Lead = {
  id: string
  tenant_id: string
  name: string
  phone: string | null
  email: string | null
  source: string | null
  stage: LeadStage
  assigned_user_id: string | null
  last_contacted_at: string | null
  next_follow_up_at: string | null
  revenue_potential: number | null
  created_at: string
}

/** Activity timeline row for feed UI */
export type Activity = {
  id: string
  tenant_id: string
  object_type: "task" | "lead"
  object_id: string
  user_id: string | null
  type: string
  summary: string
  created_at: string
}

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
  support_user_ids: string[]
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
  support_user_ids?: string[] | null
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
    support_user_ids: row.support_user_ids ?? [],
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
