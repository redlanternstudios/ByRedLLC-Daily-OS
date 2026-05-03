import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { mapTaskFromDb } from "@/types/db"

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ tasks: [], blockers: [] }, { status: 401 })

    // Resolve byred profile
    const { data: byredUserRaw } = await supabase
      .from("byred_users")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle()
    const byredUser = byredUserRaw as { id: string } | null
    if (!byredUser) return NextResponse.json({ tasks: [], blockers: [] })

    // Get ALL tenant IDs for this user (multi-brand support)
    const { data: userTenants } = await supabase
      .from("byred_user_tenants")
      .select("tenant_id")
      .eq("user_id", byredUser.id)

    const tenantIds = (userTenants ?? []).map((ut: { tenant_id: string }) => ut.tenant_id)
    if (tenantIds.length === 0) return NextResponse.json({ tasks: [], blockers: [] })

    const { data, error } = await supabase
      .from("byred_tasks")
      .select("*")
      .in("tenant_id", tenantIds)
      .eq("owner_user_id", byredUser.id)
      .not("status", "in", "(done,cancelled)")
      .order("priority", { ascending: true })
      .order("due_date", { ascending: true })

    if (error) return NextResponse.json({ tasks: [], blockers: [] })

    const tasks = data.map(mapTaskFromDb)
    const blockers = tasks.filter((t) => t.blocker_flag)

    return NextResponse.json({ tasks, blockers })
  } catch {
    return NextResponse.json({ tasks: [], blockers: [] }, { status: 401 })
  }
}
