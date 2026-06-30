import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/** POST /api/os/sprints — create a sprint for a project (tenant-scoped). */
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const sa = supabase as any
  const { data: prof } = await sa.from("byred_users").select("id").eq("auth_user_id", user.id).maybeSingle()
  const profileId = (prof as { id: string } | null)?.id
  if (!profileId) return NextResponse.json({ error: "No profile" }, { status: 403 })
  const { data: mem } = await sa.from("byred_user_tenants").select("tenant_id").eq("user_id", profileId)
  const tenantIds = (mem ?? []).map((m: { tenant_id: string }) => m.tenant_id)

  const body = (await req.json()) as { project_id?: string; name?: string; goal?: string; start_date?: string; end_date?: string }
  if (!body.project_id || !body.name?.trim()) return NextResponse.json({ error: "project_id and name required" }, { status: 400 })

  const { data: project } = await sa.from("os_projects").select("tenant_id").eq("id", body.project_id).maybeSingle() as { data: { tenant_id: string } | null }
  if (!project || !tenantIds.includes(project.tenant_id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { data, error } = await sa.from("os_sprints").insert({
    tenant_id: project.tenant_id,
    project_id: body.project_id,
    name: body.name.trim(),
    goal: body.goal ?? null,
    status: "planned",
    start_date: body.start_date ?? null,
    end_date: body.end_date ?? null,
    created_by_user_id: profileId,
  }).select("id").single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
