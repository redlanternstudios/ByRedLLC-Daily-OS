import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireTenantScope } from "@/lib/data/tenant-scope"
import { mapTaskFromDb } from "@/types/db"

export async function GET() {
  try {
    const scope = await requireTenantScope()
    // TenantScope returns { tenantId (singular), tenant } — no tenantIds/profileId
    const tenantIds = [scope.tenantId]

    // Resolve caller's byred_users.id for owner scoping
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    let profileId: string | null = null
    if (user) {
      const { data: byredUser } = await supabase
        .from("byred_users")
        .select("id")
        .eq("auth_user_id", user.id)
        .maybeSingle()
      profileId = (byredUser as { id: string } | null)?.id ?? null
    }

    let q = supabase
      .from("byred_tasks")
      .select("*")
      .in("tenant_id", tenantIds)
      .not("status", "in", "(done,cancelled)")
      .order("priority", { ascending: true })
      .order("due_date", { ascending: true })

    if (profileId) q = q.eq("owner_user_id", profileId)

    const { data, error } = await q
    if (error) return NextResponse.json({ tasks: [], blockers: [] })

    const tasks = data.map(mapTaskFromDb)
    const blockers = tasks.filter((t) => t.blocker_flag)

    return NextResponse.json({ tasks, blockers })
  } catch {
    return NextResponse.json({ tasks: [], blockers: [] }, { status: 401 })
  }
}
