import { createAdminClient } from "@/lib/supabase/admin"
import { NextRequest, NextResponse } from "next/server"

/**
 * Setup: Create Deijah Blanks account
 * POST /api/admin/setup/create-deijah
 * Body: { password: "Lantern26" } (optional - will use default if not provided)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const password = body.password || "Lantern26"
    
    const admin = createAdminClient()
    
    // Check if Deijah already exists
    const { data: listData } = await admin.auth.admin.listUsers()
    const existing = listData?.users.find(u => u.email === "deijah@byred.io")
    
    if (existing) {
      console.log("[v0] Deijah already exists with ID:", existing.id)
      return NextResponse.json(
        { 
          message: "Deijah Blanks account already exists",
          email: "deijah@byred.io",
          id: existing.id,
          created_at: existing.created_at,
        },
        { status: 200 }
      )
    }
    
    // Create new user in Supabase Auth
    const { data, error } = await admin.auth.admin.createUser({
      email: "deijah@byred.io",
      password: password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: "Deijah Blanks",
        role: "employee",
      },
    })
    
    if (error) {
      console.error("[v0] Error creating Deijah:", error)
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }
    
    console.log("[v0] Created Deijah Blanks account:", data.user.id)
    
    return NextResponse.json(
      {
        message: "Deijah Blanks account created successfully",
        email: data.user.email,
        id: data.user.id,
        created_at: data.user.created_at,
        password: "Lantern26",
      },
      { status: 201 }
    )
  } catch (err) {
    console.error("[v0] Exception creating Deijah:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
