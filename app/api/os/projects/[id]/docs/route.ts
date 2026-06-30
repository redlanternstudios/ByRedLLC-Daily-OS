import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

interface RouteParams { params: Promise<{ id: string }> }

async function resolve(supabase: any, id: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized", status: 401 as const }
  const { data: prof } = await supabase.from("byred_users").select("id").eq("auth_user_id", user.id).maybeSingle()
  const profileId = (prof as { id: string } | null)?.id
  if (!profileId) return { error: "No profile", status: 403 as const }
  const { data: mem } = await supabase.from("byred_user_tenants").select("tenant_id").eq("user_id", profileId)
  const tenantIds = (mem ?? []).map((m: { tenant_id: string }) => m.tenant_id)
  const { data: project } = await supabase.from("os_projects").select("tenant_id").eq("id", id).maybeSingle() as { data: { tenant_id: string } | null }
  if (!project) return { error: "Not found", status: 404 as const }
  if (!tenantIds.includes(project.tenant_id)) return { error: "Forbidden", status: 403 as const }
  return { profileId, tenantId: project.tenant_id }
}

/** GET /api/os/projects/[id]/docs — list docs for a project. */
export async function GET(_req: Request, { params }: RouteParams) {
  const supabase = await createClient() as any
  const { id } = await params
  const ctx = await resolve(supabase, id)
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })
  const { data } = await supabase
    .from("os_docs")
    .select("id, title, content, doc_type, status, linked_task_id, updated_at")
    .eq("project_id", id)
    .order("updated_at", { ascending: false })
  return NextResponse.json({ docs: data ?? [] })
}

/** POST /api/os/projects/[id]/docs — create a doc in a project. */
export async function POST(req: Request, { params }: RouteParams) {
  const supabase = await createClient() as any
  const { id } = await params
  const ctx = await resolve(supabase, id)
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const body = (await req.json()) as { title?: string; content?: string; doc_type?: string; linked_task_id?: string | null }
  if (!body.title?.trim()) return NextResponse.json({ error: "title required" }, { status: 400 })

  const { data, error } = await supabase.from("os_docs").insert({
    tenant_id: ctx.tenantId,
    project_id: id,
    title: body.title.trim(),
    content: body.content ?? "",
    doc_type: body.doc_type ?? "note",
    status: "draft",
    linked_task_id: body.linked_task_id ?? null,
    created_by: ctx.profileId,
  }).select("id, title, content, doc_type, status, linked_task_id, updated_at").single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
