import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Project playbooks/templates. GET lists global + own-tenant templates.
// POST creates a template — either freeform, or distilled from an existing project.

async function caller(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: prof } = await supabase.from("byred_users").select("id").eq("auth_user_id", user.id).maybeSingle()
  const profileId = (prof as { id: string } | null)?.id
  if (!profileId) return null
  const { data: mem } = await supabase.from("byred_user_tenants").select("tenant_id").eq("user_id", profileId)
  return { profileId, tenantIds: (mem ?? []).map((m: { tenant_id: string }) => m.tenant_id) }
}

export async function GET() {
  const supabase = (await createClient()) as any
  const c = await caller(supabase)
  if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { data } = await supabase
    .from("os_project_templates")
    .select("id, name, description, category, guidance, tenant_id")
    .order("name", { ascending: true })
  return NextResponse.json({ templates: data ?? [] })
}

/** POST — create a template. Either { name, guidance, ... } or { from_project_id } to distill one. */
export async function POST(req: Request) {
  const supabase = (await createClient()) as any
  const c = await caller(supabase)
  if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = (await req.json()) as {
    name?: string; description?: string; category?: string; guidance?: string
    from_project_id?: string
  }

  let tenantId: string
  let name = body.name?.trim() ?? ""
  let description = body.description ?? null
  let guidance = body.guidance ?? ""

  if (body.from_project_id) {
    const { data: proj } = await supabase.from("os_projects")
      .select("name, description, overview, tenant_id").eq("id", body.from_project_id).maybeSingle() as {
        data: { name: string; description: string | null; overview: string | null; tenant_id: string } | null }
    if (!proj) return NextResponse.json({ error: "Project not found" }, { status: 404 })
    if (!c.tenantIds.includes(proj.tenant_id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    tenantId = proj.tenant_id
    // Distill the template from the project: overview + the epic list as the blueprint.
    const { data: tasks } = await supabase.from("byred_tasks").select("epic, title").eq("project_id", body.from_project_id)
    const epics = Array.from(new Set(((tasks ?? []) as Array<{ epic: string | null }>).map((t) => t.epic).filter(Boolean)))
    name = name || `${proj.name} (template)`
    description = description ?? proj.description
    guidance = [proj.overview ?? "", epics.length ? `Epics to cover: ${epics.join(", ")}.` : ""].filter(Boolean).join("\n\n") || `Blueprint based on ${proj.name}.`
  } else {
    if (!name || !guidance.trim()) return NextResponse.json({ error: "name and guidance required" }, { status: 400 })
    if (c.tenantIds.length === 0) return NextResponse.json({ error: "No tenant" }, { status: 403 })
    tenantId = c.tenantIds[0]
  }

  const { data, error } = await supabase.from("os_project_templates").insert({
    tenant_id: tenantId, name, description, category: body.category ?? null, guidance, created_by: c.profileId,
  }).select("id, name").single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
