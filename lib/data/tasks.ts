import { createClient } from "@/lib/supabase/server"
import { mapTaskFromDb, type Task } from "@/types/db"
import type { ByredTask } from "@/types/database"

type TaskQueryResult = { data: ByredTask[] | null; error: { message: string } | null }
type TaskSingleResult = { data: ByredTask | null; error: { message: string } | null }
type TaskStatRow = { id: string; priority: string; due_date: string | null; estimated_minutes: number | null; revenue_impact_score: number | null; status: string }

/**
 * Resolve the list of tenant IDs the currently authenticated user belongs to.
 * Returns [] if the user has no profile or no tenant memberships.
 */
async function getUserTenantIds(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: byredUserRaw } = await (supabase as any)
    .from("byred_users")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle() as { data: { id: string } | null }
  if (!byredUserRaw) return []

  const { data: userTenants } = await (supabase as any)
    .from("byred_user_tenants")
    .select("tenant_id")
    .eq("user_id", byredUserRaw.id) as { data: Array<{ tenant_id: string }> | null }

  return (userTenants ?? []).map((ut) => ut.tenant_id)
}

export async function getTasks(): Promise<Task[]> {
  const supabase = await createClient()
  const tenantIds = await getUserTenantIds(supabase)
  if (tenantIds.length === 0) return []

  const { data, error } = await (supabase as any)
    .from("byred_tasks")
    .select("*")
    .in("tenant_id", tenantIds)
    .order("created_at", { ascending: false }) as TaskQueryResult

  if (error) {
    console.error("Error fetching tasks:", error)
    return []
  }

  return (data ?? []).map(mapTaskFromDb)
}

export async function getTaskById(id: string): Promise<Task | null> {
  const supabase = await createClient()
  const tenantIds = await getUserTenantIds(supabase)
  if (tenantIds.length === 0) return null

  const { data, error } = await (supabase as any)
    .from("byred_tasks")
    .select("*")
    .eq("id", id)
    .in("tenant_id", tenantIds)
    .single() as TaskSingleResult

  if (error || !data) {
    console.error("Error fetching task:", error)
    return null
  }

  return mapTaskFromDb(data)
}

export async function getTasksByTenant(tenantId: string): Promise<Task[]> {
  const supabase = await createClient()
  const tenantIds = await getUserTenantIds(supabase)
  // Verify the caller actually has access to the requested tenant
  if (!tenantIds.includes(tenantId)) return []

  const { data, error } = await (supabase as any)
    .from("byred_tasks")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false }) as TaskQueryResult

  if (error) {
    console.error("Error fetching tasks:", error)
    return []
  }

  return (data ?? []).map(mapTaskFromDb)
}

export async function getTasksByStatus(status: string): Promise<Task[]> {
  const supabase = await createClient()
  const tenantIds = await getUserTenantIds(supabase)
  if (tenantIds.length === 0) return []

  const { data, error } = await (supabase as any)
    .from("byred_tasks")
    .select("*")
    .in("tenant_id", tenantIds)
    .eq("status", status)
    .order("created_at", { ascending: false }) as TaskQueryResult

  if (error) {
    console.error("Error fetching tasks:", error)
    return []
  }

  return (data ?? []).map(mapTaskFromDb)
}

export async function getTasksForToday(): Promise<Task[]> {
  const supabase = await createClient()
  const tenantIds = await getUserTenantIds(supabase)
  if (tenantIds.length === 0) return []

  const today = new Date().toISOString().split("T")[0]

  const { data, error } = await (supabase as any)
    .from("byred_tasks")
    .select("*")
    .in("tenant_id", tenantIds)
    .not("status", "in", "(done,cancelled)")
    .order("priority", { ascending: true })
    .order("due_date", { ascending: true }) as TaskQueryResult

  if (error) {
    console.error("Error fetching today tasks:", error)
    return []
  }

  const relevant = (data ?? []).filter(
    (t) =>
      t.status === "in_progress" ||
      t.status === "not_started" ||
      (t.due_date != null && t.due_date <= today)
  )

  return relevant.map(mapTaskFromDb)
}

export async function getBlockedTasks(): Promise<Task[]> {
  const supabase = await createClient()
  const tenantIds = await getUserTenantIds(supabase)
  if (tenantIds.length === 0) return []

  const { data, error } = await (supabase as any)
    .from("byred_tasks")
    .select("*")
    .in("tenant_id", tenantIds)
    .eq("blocker_flag", true)
    .neq("status", "done")
    .neq("status", "cancelled")
    .order("created_at", { ascending: false }) as TaskQueryResult

  if (error || !data) return []
  return data.map(mapTaskFromDb)
}

export async function getRecentTasks(limit = 10): Promise<Task[]> {
  const supabase = await createClient()
  const tenantIds = await getUserTenantIds(supabase)
  if (tenantIds.length === 0) return []

  const { data, error } = await (supabase as any)
    .from("byred_tasks")
    .select("*")
    .in("tenant_id", tenantIds)
    .order("created_at", { ascending: false })
    .limit(limit) as TaskQueryResult

  if (error || !data) return []
  return data.map(mapTaskFromDb)
}

export async function getTaskStats() {
  const supabase = await createClient()
  const tenantIds = await getUserTenantIds(supabase)
  if (tenantIds.length === 0) return { criticalNow: 0, moneyMoves: 0, quickWins: 0, comingUp: 0 }

  const today = new Date().toISOString().split("T")[0]

  const { data: tasks, error } = await (supabase as any)
    .from("byred_tasks")
    .select("id, priority, due_date, estimated_minutes, revenue_impact_score, status")
    .in("tenant_id", tenantIds)
    .neq("status", "done")
    .neq("status", "cancelled") as { data: TaskStatRow[] | null; error: { message: string } | null }

  if (error) {
    console.error("Error fetching task stats:", error)
    return { criticalNow: 0, moneyMoves: 0, quickWins: 0, comingUp: 0 }
  }

  const criticalNow = (tasks ?? []).filter(
    (t) => t.priority === "critical" && t.due_date && t.due_date <= today
  ).length

  const moneyMoves = (tasks ?? []).filter((t) => (t.revenue_impact_score ?? 0) >= 7).length
  const quickWins = (tasks ?? []).filter((t) => (t.estimated_minutes ?? 30) <= 30).length
  const comingUp = (tasks ?? []).filter((t) => t.due_date && t.due_date > today).length

  return { criticalNow, moneyMoves, quickWins, comingUp }
}
