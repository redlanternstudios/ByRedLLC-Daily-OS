import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const sa = supabase as any

  const { data: byredUser } = await sa
    .from("byred_users").select("id").eq("auth_user_id", user.id).maybeSingle() as {
    data: { id: string } | null
  }
  if (!byredUser) return NextResponse.json({ notifications: [] })

  const { data, error } = await sa
    .from("os_notifications")
    .select("id, type, body, context_url, read, created_at, actor_id, byred_users!actor_id(name)")
    .eq("user_id", byredUser.id)
    .order("created_at", { ascending: false })
    .limit(30) as {
    data: Array<{
      id: string; type: string; body: string; context_url: string | null
      read: boolean; created_at: string; actor_id: string | null
      byred_users: { name: string } | null
    }> | null
    error: { message: string } | null
  }

  if (error) return NextResponse.json({ notifications: [] })
  return NextResponse.json({ notifications: data ?? [] })
}

// PATCH /api/os/notifications — mark all read or specific ids
export async function PATCH(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const sa = supabase as any

  const { data: byredUser } = await sa
    .from("byred_users").select("id").eq("auth_user_id", user.id).maybeSingle() as {
    data: { id: string } | null
  }
  if (!byredUser) return NextResponse.json({ ok: true })

  const body = (await req.json()) as { ids?: string[] }

  let query = sa.from("os_notifications").update({ read: true }).eq("user_id", byredUser.id)
  if (body.ids?.length) {
    query = query.in("id", body.ids)
  } else {
    query = query.eq("read", false)
  }

  await query
  return NextResponse.json({ ok: true })
}
