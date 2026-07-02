import { createClient } from "@/lib/supabase/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"
import { NextRequest, NextResponse } from "next/server"

/**
 * Admin endpoint to create employee accounts
 * POST /api/admin/users/create
 * Body: { email, password, name, role, tenantIds }
 */
export async function POST(req: NextRequest) {
  try {
    // Verify admin access (should use proper auth in production)
    const authHeader = req.headers.get("authorization")
    const adminKey = process.env.ADMIN_CREATE_USER_KEY
    
    if (!adminKey || authHeader !== `Bearer ${adminKey}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { email, password, name, role = "member", tenantIds = [] } = await req.json()

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Missing required fields: email, password, name" },
        { status: 400 }
      )
    }

    // Create auth user via Supabase admin
    const admin = await getSupabaseAdmin()
    
    const { data: authUser, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    // Create byred_users profile
    const { data: profile, error: profileError } = await admin
      .from("byred_users")
      .insert({
        auth_user_id: authUser.id,
        name,
        email,
        role,
        active: true,
      })
      .select()
      .single()

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 400 })
    }

    // Add user to tenants
    if (tenantIds.length > 0) {
      const tenantAssignments = tenantIds.map((tenantId: string) => ({
        user_id: profile.id,
        tenant_id: tenantId,
        role: "member",
      }))

      const { error: tenantError } = await admin
        .from("byred_user_tenants")
        .insert(tenantAssignments)

      if (tenantError) {
        return NextResponse.json({ error: tenantError.message }, { status: 400 })
      }
    }

    return NextResponse.json({
      success: true,
      userId: profile.id,
      authUserId: authUser.id,
      email,
      name,
      role,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Unknown error" },
      { status: 500 }
    )
  }
}
