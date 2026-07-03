import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

// POST /api/admin/invite-user
// Body: { email: string, redirectTo?: string }
// Requires: caller must be an admin (role = 'admin' in byred_users)
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    // Verify caller is an admin
    const sa = supabase as any
    const { data: profile } = await sa
      .from("byred_users")
      .select("role")
      .eq("auth_user_id", user.id)
      .maybeSingle() as { data: { role: string } | null }

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden — admin only" }, { status: 403 })
    }

    const { email, redirectTo } = (await req.json()) as { email: string; redirectTo?: string }
    if (!email) return NextResponse.json({ error: "email is required" }, { status: 400 })

    const admin = createAdminClient()
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: redirectTo ?? `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/auth/callback`,
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, user: data.user })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 }
    )
  }
}
