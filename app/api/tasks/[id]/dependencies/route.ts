import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(_req: Request, { params }: RouteParams) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const sa = supabase as any

  // Tasks this task depends on (blocked by)
  const { data: blockedBy } = await sa
    .from("os_task_dependencies")
    .select("depends_on_task_id")
    .eq("task_id", id) as { data: Array<{ depends_on_task_id: string }> | null }

  // Tasks that depend on this task (blocking others)
  const { data: blocking } = await sa
    .from("os_task_dependencies")
    .select("task_id")
    .eq("depends_on_task_id", id) as { data: Array<{ task_id: string }> | null }

  const blockedByIds = (blockedBy ?? []).map((r) => r.depends_on_task_id)
  const blockingIds = (blocking ?? []).map((r) => r.task_id)
  const allIds = [...blockedByIds, ...blockingIds]

  let taskDetails: any[] = []
  if (allIds.length > 0) {
    const { data } = await sa
      .from("byred_tasks")
      .select("id, title, status, priority, owner_user_id, byred_users!owner_user_id(id, name)")
      .in("id", allIds)
    taskDetails = data ?? []
  }

  return NextResponse.json({
    blocked_by: blockedByIds.map((depId) => taskDetails.find((t: any) => t.id === depId)).filter(Boolean),
    blocking:   blockingIds.map((depId) => taskDetails.find((t: any) => t.id === depId)).filter(Boolean),
  })
}

export async function POST(req: Request, { params }: RouteParams) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const { depends_on_task_id } = (await req.json()) as { depends_on_task_id: string }
  if (!depends_on_task_id) return NextResponse.json({ error: "depends_on_task_id required" }, { status: 400 })

  const sa = supabase as any

  // Get tenant for this task
  const { data: task } = await sa.from("byred_tasks").select("tenant_id").eq("id", id).single()
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 })

  const { error } = await sa.from("os_task_dependencies").insert({
    task_id: id,
    depends_on_task_id,
    tenant_id: task.tenant_id,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true }, { status: 201 })
}

export async function DELETE(req: Request, { params }: RouteParams) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const { depends_on_task_id } = (await req.json()) as { depends_on_task_id: string }

  const sa = supabase as any
  await sa.from("os_task_dependencies")
    .delete()
    .eq("task_id", id)
    .eq("depends_on_task_id", depends_on_task_id)

  return NextResponse.json({ ok: true })
}
