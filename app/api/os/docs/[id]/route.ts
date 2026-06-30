import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

interface RouteParams { params: Promise<{ id: string }> }

/** PATCH /api/os/docs/[id] — update a doc (content, title, doc_type, status, linked task). */
export async function PATCH(req: Request, { params }: RouteParams) {
  const supabase = await createClient() as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: prof } = await supabase.from("byred_users").select("id").eq("auth_user_id", user.id).maybeSingle()
  const profileId = (prof as { id: string } | null)?.id
  if (!profileId) return NextResponse.json({ error: "No profile" }, { status: 403 })
  const { data: mem } = await supabase.from("byred_user_tenants").select("tenant_id").eq("user_id", profileId)
  const tenantIds = (mem ?? []).map((m: { tenant_id: string }) => m.tenant_id)

  const { id } = await params
  const { data: existing } = await supabase.from("os_docs").select("tenant_id").eq("id", id).maybeSingle() as { data: { tenant_id: string } | null }
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (!tenantIds.includes(existing.tenant_id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = (await req.json()) as Partial<{ title: string; content: string; doc_type: string; status: string; linked_task_id: string | null }>
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const k of ["title", "content", "doc_type", "status", "linked_task_id"] as const) {
    if (body[k] !== undefined) update[k] = body[k]
  }
  const { error } = await supabase.from("os_docs").update(update).eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
