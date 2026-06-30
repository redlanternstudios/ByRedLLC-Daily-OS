import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * GET /api/os/projects
 * Lists real os_projects for the caller's tenants, with live task counts
 * derived from byred_tasks (the single source of truth).
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const sa = supabase as any
  const { data: prof } = await sa.from("byred_users").select("id").eq("auth_user_id", user.id).maybeSingle()
  const profileId = (prof as { id: string } | null)?.id
  if (!profileId) return NextResponse.json({ projects: [] })

  const { data: mem } = await sa.from("byred_user_tenants").select("tenant_id").eq("user_id", profileId)
  const tenantIds = (mem ?? []).map((m: { tenant_id: string }) => m.tenant_id)
  if (tenantIds.length === 0) return NextResponse.json({ projects: [] })

  const [{ data: projects }, { data: tasks }] = await Promise.all([
    sa.from("os_projects")
      .select("id, name, description, status, tenant_id, owner_user_id, created_at")
      .in("tenant_id", tenantIds)
      .neq("status", "archived")
      .order("created_at", { ascending: false }),
    sa.from("byred_tasks")
      .select("project_id, status")
      .in("tenant_id", tenantIds)
      .not("project_id", "is", null)
      .neq("status", "cancelled"),
  ])

  const counts = new Map<string, { total: number; done: number }>()
  for (const t of (tasks ?? []) as Array<{ project_id: string; status: string }>) {
    const c = counts.get(t.project_id) ?? { total: 0, done: 0 }
    c.total += 1
    if (t.status === "done") c.done += 1
    counts.set(t.project_id, c)
  }

  const result = ((projects ?? []) as Array<Record<string, unknown>>).map((p) => {
    const c = counts.get(p.id as string) ?? { total: 0, done: 0 }
    return { ...p, task_count: c.total, done_count: c.done }
  })

  return NextResponse.json({ projects: result })
}
