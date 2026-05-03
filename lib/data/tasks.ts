import { createClient } from "@/lib/supabase/server"
import { assertTenantInScope, requireTenantScope } from "@/lib/data/tenant-scope"
import { mapTaskFromDb, type ByredTask, type Task } from "@/types/db"

type TaskStatRow = Pick<
  ByredTask,
  "id" | "priority" | "due_date" | "estimated_minutes" | "revenue_impact_score" | "status"
>

// Cap page size to protect against a query that would load a whole tenant's
// task backlog into a server payload. UI can fetch more via pagination.
const DEFAULT_PAGE_SIZE = 200
const MAX_PAGE_SIZE = 500

type PageOpts = {
  limit?: number
  offset?: number
  includeArchived?: boolean
  /** Filter to a specific owner (byred_users.id). Used by the Today page to scope to the current user. */
  ownerId?: string | null
}

function normPage(opts: PageOpts): { limit: number; offset: number } {
  const limit = Math.min(
    Math.max(opts.limit ?? DEFAULT_PAGE_SIZE, 1),
    MAX_PAGE_SIZE
  )
  const offset = Math.max(opts.offset ?? 0, 0)
  return { limit, offset }
}

export async function getTasks(opts: PageOpts = {}): Promise<Task[]> {
  const { tenantIds } = await requireTenantScope()
  if (tenantIds.length === 0) return []

  const supabase = await createClient()
  const { limit, offset } = normPage(opts)

  let q = supabase
    .from("byred_tasks")
    .select("*")
    .in("tenant_id", tenantIds)
    .order("revenue_impact_score", { ascending: false })
    .order("urgency_score", { ascending: false })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (!opts.includeArchived) {
    q = q.is("archived_at", null)
  }

  const { data, error } = await q

  if (error) {
    console.error("Error fetching tasks:", error)
    return []
  }

  return data.map(mapTaskFromDb)
}

export async function getTaskById(id: string): Promise<Task | null> {
  const { tenantIds } = await requireTenantScope()
  if (tenantIds.length === 0) return null

  const supabase = await createClient()

  const { data, error } = await supabase
    .from("byred_tasks")
    .select("*")
    .eq("id", id)
    .in("tenant_id", tenantIds)
    .maybeSingle()

  if (error || !data) {
    if (error) console.error("Error fetching task:", error)
    return null
  }

  return mapTaskFromDb(data)
}

export async function getTasksByTenant(
  tenantId: string,
  opts: PageOpts = {}
): Promise<Task[]> {
  const { tenantIds } = await requireTenantScope()
  if (!assertTenantInScope(tenantId, tenantIds)) return []

  const supabase = await createClient()
  const { limit, offset } = normPage(opts)

  let q = supabase
    .from("byred_tasks")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("revenue_impact_score", { ascending: false })
    .order("urgency_score", { ascending: false })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (!opts.includeArchived) {
    q = q.is("archived_at", null)
  }

  const { data, error } = await q

  if (error) {
    console.error("Error fetching tasks:", error)
    return []
  }

  return data.map(mapTaskFromDb)
}

export async function getTasksByStatus(
  status: string,
  opts: PageOpts = {}
): Promise<Task[]> {
  const { tenantIds } = await requireTenantScope()
  if (tenantIds.length === 0) return []

  const supabase = await createClient()
  const { limit, offset } = normPage(opts)

  let q = supabase
    .from("byred_tasks")
    .select("*")
    .eq("status", status)
    .in("tenant_id", tenantIds)
    .order("revenue_impact_score", { ascending: false })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (!opts.includeArchived) {
    q = q.is("archived_at", null)
  }

  const { data, error } = await q

  if (error) {
    console.error("Error fetching tasks:", error)
    return []
  }

  return data.map(mapTaskFromDb)
}

export async function getTasksForToday(opts: PageOpts = {}): Promise<Task[]> {
  const { tenantIds } = await requireTenantScope()
  if (tenantIds.length === 0) return []

  const supabase = await createClient()
  const { limit, offset } = normPage(opts)
  const today = new Date().toISOString().split("T")[0]

  let q = supabase
    .from("byred_tasks")
    .select("*")
    .in("tenant_id", tenantIds)
    .or(`due_date.lte.${today},status.eq.in_progress,status.eq.not_started`)
    .neq("status", "done")
    .neq("status", "cancelled")
    .is("archived_at", null)
    .order("priority", { ascending: true })
    .order("due_date", { ascending: true })
    .range(offset, offset + limit - 1)

  if (opts.ownerId) q = q.eq("owner_user_id", opts.ownerId)

  const { data, error } = await q

  if (error) {
    console.error("Error fetching today tasks:", error)
    return []
  }

  return data.map(mapTaskFromDb)
}

export async function getTaskStats() {
  const { tenantIds } = await requireTenantScope()
  if (tenantIds.length === 0) {
    return { criticalNow: 0, moneyMoves: 0, quickWins: 0, comingUp: 0 }
  }

  const supabase = await createClient()
  const today = new Date().toISOString().split("T")[0]

  const { data: tasks, error } = await supabase
    .from("byred_tasks")
    .select("id, priority, due_date, estimated_minutes, revenue_impact_score, status")
    .in("tenant_id", tenantIds)
    .neq("status", "done")
    .neq("status", "cancelled")
    .is("archived_at", null)

  if (error || !tasks) {
    console.error("Error fetching task stats:", error)
    return { criticalNow: 0, moneyMoves: 0, quickWins: 0, comingUp: 0 }
  }

  const scoped = tasks as TaskStatRow[]

  const criticalNow = scoped.filter(
    (t) => t.priority === "critical" && t.due_date && t.due_date <= today
  ).length

  const moneyMoves = scoped.filter((t) => (t.revenue_impact_score ?? 0) >= 7).length

  const quickWins = scoped.filter((t) => (t.estimated_minutes ?? 30) <= 30).length

  const comingUp = scoped.filter((t) => t.due_date && t.due_date > today).length

  return { criticalNow, moneyMoves, quickWins, comingUp }
}
