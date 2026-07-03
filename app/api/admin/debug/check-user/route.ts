import { createAdminClient } from "@/lib/supabase/admin"
import { NextRequest, NextResponse } from "next/server"

/**
 * DEBUG: Check if user exists in Supabase Auth
 * GET /api/admin/debug/check-user?email=deijah@byred.io
 */
export async function GET(req: NextRequest) {
  try {
    const email = req.nextUrl.searchParams.get("email")
    if (!email) {
      return NextResponse.json({ error: "Missing email param" }, { status: 400 })
    }

    const admin = createAdminClient()
    
    // List all users and find the one with this email
    const { data, error } = await admin.auth.admin.listUsers()
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const user = data.users.find(u => u.email === email)
    
    if (user) {
      return NextResponse.json({
        found: true,
        email: user.email,
        id: user.id,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
      })
    } else {
      return NextResponse.json({
        found: false,
        email,
        available_users: data.users.map(u => u.email),
      })
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
