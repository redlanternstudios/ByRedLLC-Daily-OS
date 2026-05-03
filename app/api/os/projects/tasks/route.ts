import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Resolve byred profile
  const { data: byredUserRaw } = await supabase
    .from("byred_users")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle()
  const byredUser = byredUserRaw as { id: string } | null
  if (!byredUser) return NextResponse.json({ tasks: [] })

  // Get all tenant IDs this user belongs to
  const { data: userTenants } = await supabase
    .from("byred_user_tenants")
    .select("tenant_id")
    .eq("user_id", byredUser.id)

  const tenantIds = (userTenants ?? []).map((ut: { tenant_id: string }) => ut.tenant_id)
  if (tenantIds.length === 0) return NextResponse.json({ tasks: [] })

  const { data, error } = await supabase
    .from("byred_tasks")
    .select("tenant_id, status, owner_user_id, due_date, blocker_flag")
    .in("tenant_id", tenantIds)
    .not("status", "eq", "cancelled")

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ tasks: data ?? [] })
}
