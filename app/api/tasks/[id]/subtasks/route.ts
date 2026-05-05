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

  const { data, error } = await sa
    .from("byred_tasks")
    .select("id, title, status, priority, due_date, owner_user_id, byred_users!owner_user_id(id, name)")
    .eq("parent_task_id", id)
    .order("created_at", { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: Request, { params }: RouteParams) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const { title } = (await req.json()) as { title: string }
  if (!title?.trim()) return NextResponse.json({ error: "title required" }, { status: 400 })

  const sa = supabase as any

  // Inherit tenant_id and owner from parent
  const { data: parent } = await sa
    .from("byred_tasks")
    .select("tenant_id, owner_user_id")
    .eq("id", id)
    .single() as { data: { tenant_id: string; owner_user_id: string | null } | null }

  if (!parent) return NextResponse.json({ error: "Parent task not found" }, { status: 404 })

  const { data: subtask, error } = await sa
    .from("byred_tasks")
    .insert({
      title: title.trim(),
      parent_task_id: id,
      tenant_id: parent.tenant_id,
      owner_user_id: parent.owner_user_id,
      status: "not_started",
      priority: "medium",
      ai_mode: "HUMAN_ONLY",
    })
    .select("id, title, status, priority, due_date, owner_user_id")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(subtask, { status: 201 })
}
