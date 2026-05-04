import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { notifyMentions } from "@/lib/notifications"

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(_req: Request, { params }: RouteParams) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("byred_task_comments")
    .select("*, byred_users(id, name, avatar_url)")
    .eq("task_id", id)
    .order("created_at", { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(request: Request, { params }: RouteParams) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: byredUserRaw } = await supabase
    .from("byred_users")
    .select("id")
    .eq("auth_user_id", user.id)
    .single()
  const byredUser = byredUserRaw as { id: string } | null

  if (!byredUser) {
    return NextResponse.json({ error: "User profile not found" }, { status: 403 })
  }

  const { id } = await params
  const body = (await request.json()) as { comment?: string }

  if (!body.comment?.trim()) {
    return NextResponse.json({ error: "comment is required" }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("byred_task_comments")
    .insert({
      task_id: id,
      user_id: byredUser.id,
      comment: body.comment.trim(),
    })
    .select("*, byred_users(id, name, avatar_url)")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Fire-and-forget mention notifications
  void notifyMentions({
    body: body.comment.trim(),
    actorId: byredUser.id,
    contextUrl: `/os/tasks/${id}`,
  })

  return NextResponse.json(data, { status: 201 })
}
