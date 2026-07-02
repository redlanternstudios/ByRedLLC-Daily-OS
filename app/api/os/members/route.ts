import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ members: [] }, { status: 401 })

    const { data } = await (supabase as any)
      .from("byred_users")
      .select("id, name, email, role, avatar_url, default_ai_mode")
      .eq("active", true)
      .order("name")

    return NextResponse.json({ members: data ?? [] })
  } catch {
    return NextResponse.json({ members: [] }, { status: 500 })
  }
}

// PATCH /api/os/members — update the current user's own profile fields
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const sa = supabase as any

    const { data: byredUser } = await sa
      .from("byred_users")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle() as { data: { id: string } | null }
    if (!byredUser) return NextResponse.json({ error: "Profile not found" }, { status: 403 })

    const body = (await req.json()) as { default_ai_mode?: string }

    const allowed = ["HUMAN_ONLY", "AI_ASSIST", "AI_DRAFT", "AI_EXECUTE"]
    if (body.default_ai_mode && !allowed.includes(body.default_ai_mode)) {
      return NextResponse.json({ error: "Invalid ai mode" }, { status: 400 })
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (body.default_ai_mode) updates.default_ai_mode = body.default_ai_mode

    const { data, error } = await sa
      .from("byred_users")
      .update(updates)
      .eq("id", byredUser.id)
      .select()
      .single() as { data: Record<string, unknown> | null; error: { message: string } | null }

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}
