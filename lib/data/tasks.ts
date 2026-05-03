import { createClient } from "@/lib/supabase/server"
import { mapTaskFromDb, type Task } from "@/types/db"

export async function getTasks(): Promise<Task[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("byred_tasks")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching tasks:", error)
    return []
  }

  return data.map(mapTaskFromDb)
}

export async function getTaskById(id: string): Promise<Task | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("byred_tasks")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !data) {
    console.error("Error fetching task:", error)
    return null
  }

  return mapTaskFromDb(data)
}

export async function getTasksByTenant(tenantId: string): Promise<Task[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("byred_tasks")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching tasks:", error)
    return []
  }

  return data.map(mapTaskFromDb)
}

export async function getTasksByStatus(status: string): Promise<Task[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("byred_tasks")
    .select("*")
    .eq("status", status)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching tasks:", error)
    return []
  }

  return data.map(mapTaskFromDb)
}

export async function getTasksForToday(): Promise<Task[]> {
  const supabase = await createClient()
  const today = new Date().toISOString().split("T")[0]

  // Fetch all active (non-done, non-cancelled) tasks then filter client-side.
  // PostgREST .or() cannot mix range filters (lte) with eq on the same column
  // in a single expression without using separate .or() groups.
  const { data, error } = await supabase
    .from("byred_tasks")
    .select("*")
    .not("status", "in", "(done,cancelled)")
    .order("priority", { ascending: true })
    .order("due_date", { ascending: true })

  if (error) {
    console.error("Error fetching today tasks:", error)
    return []
  }

  // Keep tasks that are: due today/overdue, in_progress, or not_started
  const relevant = data.filter(
    (t) =>
      t.status === "in_progress" ||
      t.status === "not_started" ||
      (t.due_date != null && t.due_date <= today)
  )

  return relevant.map(mapTaskFromDb)
}

export async function getBlockedTasks(): Promise<Task[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("byred_tasks")
    .select("*")
    .eq("blocker_flag", true)
    .neq("status", "done")
    .neq("status", "cancelled")
    .order("created_at", { ascending: false })

  if (error || !data) return []
  return data.map(mapTaskFromDb)
}

export async function getRecentTasks(limit = 10): Promise<Task[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("byred_tasks")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error || !data) return []
  return data.map(mapTaskFromDb)
}

export async function getTaskStats() {
  const supabase = await createClient()
  const today = new Date().toISOString().split("T")[0]

  const { data: tasks, error } = await supabase
    .from("byred_tasks")
    .select("id, priority, due_date, estimated_minutes, revenue_impact_score, status")
    .neq("status", "done")
    .neq("status", "cancelled")

  if (error) {
    console.error("Error fetching task stats:", error)
    return { criticalNow: 0, moneyMoves: 0, quickWins: 0, comingUp: 0 }
  }

  const criticalNow = tasks.filter(
    (t) => t.priority === "critical" && t.due_date && t.due_date <= today
  ).length

  const moneyMoves = tasks.filter((t) => (t.revenue_impact_score ?? 0) >= 7).length

  const quickWins = tasks.filter((t) => (t.estimated_minutes ?? 30) <= 30).length

  const comingUp = tasks.filter((t) => t.due_date && t.due_date > today).length

  return { criticalNow, moneyMoves, quickWins, comingUp }
}
