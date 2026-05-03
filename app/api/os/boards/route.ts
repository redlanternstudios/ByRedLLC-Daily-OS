/**
 * GET /api/os/boards
 *
 * Derives board objects from real byred_tasks data grouped by tenant.
 * Each active tenant becomes one "board" with live task counts per status column.
 * No os_boards table required.
 */
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export type DerivedBoard = {
  id: string           // tenant_id used as board id
  tenant_id: string
  tenant_name: string
  tenant_color: string
  board_type: "kanban"
  status: "active"
  task_count: number
  columns: {
    not_started: number
    in_progress: number
    blocked: number
    done: number
  }
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Resolve byred_users.id for this auth user
  const { data: byredUserRaw } = await supabase
    .from("byred_users")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle()
  const byredUserId = (byredUserRaw as { id: string } | null)?.id

  if (!byredUserId) return NextResponse.json([])

  // Fetch only tenants this user belongs to
  const { data: memberRows, error: memberError } = await supabase
    .from("byred_user_tenants")
    .select("tenant_id, byred_tenants(id, name, color)")
    .eq("user_id", byredUserId)

  if (memberError) return NextResponse.json({ error: memberError.message }, { status: 500 })

  const tenants = (memberRows ?? []).map((row) => {
    const t = row.byred_tenants as { id: string; name: string; color: string | null } | null
    return { id: t?.id ?? row.tenant_id, name: t?.name ?? row.tenant_id, color: t?.color ?? "#D7261E" }
  }).sort((a, b) => a.name.localeCompare(b.name))

  // Fetch all non-cancelled tasks with just the fields we need
  const { data: tasks, error: taskError } = await supabase
    .from("byred_tasks")
    .select("tenant_id, status")
    .neq("status", "cancelled")

  if (taskError) return NextResponse.json({ error: taskError.message }, { status: 500 })

  // Build a map of tenant_id -> column counts
  const countMap: Record<string, DerivedBoard["columns"] & { total: number }> = {}
  for (const t of tenants ?? []) {
    countMap[t.id] = { not_started: 0, in_progress: 0, blocked: 0, done: 0, total: 0 }
  }
  for (const task of tasks ?? []) {
    if (!countMap[task.tenant_id]) continue
    const col = task.status as keyof DerivedBoard["columns"]
    if (col in countMap[task.tenant_id]) {
      countMap[task.tenant_id][col]++
    }
    countMap[task.tenant_id].total++
  }

  const boards: DerivedBoard[] = (tenants ?? []).map((t) => {
    const counts = countMap[t.id] ?? { not_started: 0, in_progress: 0, blocked: 0, done: 0, total: 0 }
    return {
      id: t.id,
      tenant_id: t.id,
      tenant_name: t.name,
      tenant_color: t.color,
      board_type: "kanban",
      status: "active",
      task_count: counts.total,
      columns: {
        not_started: counts.not_started,
        in_progress: counts.in_progress,
        blocked: counts.blocked,
        done: counts.done,
      },
    }
  })

  return NextResponse.json(boards)
}
