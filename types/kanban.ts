export interface OsBoard {
  id: string
  name: string
  board_type: string
  status: string
  tenant_id: string
  project_id: string | null
  kpi_config: unknown[]
}

export interface OsPhase {
  id: string
  board_id: string
  name: string
  order_index: number
  color: string | null
  /** Binds this column to a task status. When a task's status is set to this value
   *  it auto-moves here; dragging a card here sets the task's status to this value.
   *  NULL = manual-only column (drag moves phase_id, status unchanged). */
  status_mapping: string | null
}

export interface ByredUser {
  id: string
  name: string
  email: string
  role: 'admin' | 'member' | 'viewer'
  avatar_url: string | null
  monday_user_id: string | null
}

export interface ByredTask {
  id: string
  tenant_id: string
  board_id: string | null
  phase_id: string | null
  title: string
  description: string | null
  status: 'not_started' | 'in_progress' | 'overdue' | 'done' | 'blocked' | 'cancelled'
  priority: 'critical' | 'high' | 'medium' | 'low'
  due_date: string | null
  order_index: number | null
  owner_user_id: string | null
  created_by_user_id: string | null
  blocker_flag: boolean
  blocker_reason: string | null
  revenue_impact_score: number
  urgency_score: number
  is_low_hanging_fruit: boolean
  is_ready_for_ai: boolean
  is_ready_for_human: boolean
  needs_decision: boolean
  waiting_on_external: boolean
  definition_of_done: string | null
  acceptance_criteria: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
  archived_at: string | null
  monday_item_id: string | null
}

export interface TaskWithMeta extends ByredTask {
  owner: Pick<ByredUser, 'id' | 'name' | 'avatar_url'> | null
  isOverdue: boolean
}

export interface BoardWithData {
  board: OsBoard
  phases: OsPhase[]
  tasksByPhase: Record<string, TaskWithMeta[]>
}
