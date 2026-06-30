import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

interface RouteParams { params: Promise<{ id: string }> }

/** PATCH /api/os/sprints/[id] — update sprint (status start/complete, name, goal, dates). */
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
  const { data: existing } = await sa.from("os_sprints").select("tenant_id").eq("id", id).maybeSingle() as { data: { tenant_id: string } | null }
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (!tenantIds.includes(existing.tenant_id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = (await req.json()) as Partial<{ name: string; goal: string; status: string; start_date: string | null; end_date: string | null }>
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const k of ["name", "goal", "status", "start_date", "end_date"] as const) {
    if (body[k] !== undefined) update[k] = body[k]
  }
  const { error } = await sa.from("os_sprints").update(update).eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
