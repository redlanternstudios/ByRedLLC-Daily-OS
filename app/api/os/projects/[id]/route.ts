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
    .select("id, name, description, overview, status, tenant_id, owner_user_id, created_at")
    .eq("id", id)
    .maybeSingle() as { data: { tenant_id: string } | null }

  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (!tenantIds.includes(project.tenant_id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const [{ data: tasks }, { data: sprints }] = await Promise.all([
    sa.from("byred_tasks")
      .select("id, title, status, priority, tenant_id, owner_user_id, due_date, start_date, blocker_flag, blocked_by_task_id, estimated_minutes, ai_mode, epic, order_index, issue_type, story_points, labels, sprint_id")
      .eq("project_id", id)
      .neq("status", "cancelled")
      .order("epic", { ascending: true })
      .order("order_index", { ascending: true }),
    sa.from("os_sprints")
      .select("id, name, goal, status, start_date, end_date")
      .eq("project_id", id)
      .order("created_at", { ascending: true }),
  ])

  return NextResponse.json({ project, tasks: tasks ?? [], sprints: sprints ?? [] })
}

/** PATCH /api/os/projects/[id] — edit project fields (overview, name, status), tenant-scoped. */
export async function PATCH(req: Request, { params }: RouteParams) {
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
  const { data: existing } = await sa.from("os_projects").select("tenant_id").eq("id", id).maybeSingle() as { data: { tenant_id: string } | null }
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (!tenantIds.includes(existing.tenant_id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = (await req.json()) as Partial<{ overview: string; name: string; status: string }>
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.overview !== undefined) update.overview = body.overview
  if (body.name !== undefined) update.name = body.name
  if (body.status !== undefined) update.status = body.status

  const { error } = await sa.from("os_projects").update(update).eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
