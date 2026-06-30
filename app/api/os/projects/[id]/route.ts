import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/os/projects/[id]
 * Returns the project + its byred_tasks (epic-grouped board data), tenant-scoped.
 */
export async function GET(_req: Request, { params }: RouteParams) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const sa = supabase as any
  const { data: prof } = await sa.from("byred_users").select("id").eq("auth_user_id", user.id).maybeSingle()
  const profileId = (prof as { id: string } | null)?.id
  if (!profileId) return NextResponse.json({ error: "No profile" }, { status: 403 })

  const { data: mem } = await sa.from("byred_user_tenants").select("tenant_id").eq("user_id", profileId)
  const tenantIds = (mem ?? []).map((m: { tenant_id: string }) => m.tenant_id)

  const { id } = await params

  const { data: project } = await sa
    .from("os_projects")
    .select("id, name, description, status, tenant_id, owner_user_id, created_at")
    .eq("id", id)
    .maybeSingle() as { data: { tenant_id: string } | null }

  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (!tenantIds.includes(project.tenant_id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { data: tasks } = await sa
    .from("byred_tasks")
    .select("id, title, status, priority, tenant_id, owner_user_id, due_date, blocker_flag, blocked_by_task_id, estimated_minutes, ai_mode, epic, order_index")
    .eq("project_id", id)
    .neq("status", "cancelled")
    .order("epic", { ascending: true })
    .order("order_index", { ascending: true })

  return NextResponse.json({ project, tasks: tasks ?? [] })
}
