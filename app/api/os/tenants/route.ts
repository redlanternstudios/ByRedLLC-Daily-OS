import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireTenantScope } from "@/lib/data/tenant-scope"

export async function GET() {
  try {
    await requireTenantScope()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = await createClient()

  // Return all tenants the current user belongs to via byred_user_tenants
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: byredUserRaw } = await supabase
    .from("byred_users")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle()
  const byredUserId = (byredUserRaw as { id: string } | null)?.id

  if (!byredUserId) return NextResponse.json({ tenants: [] })

  const { data, error } = await supabase
    .from("byred_user_tenants")
    .select("tenant_id, role, byred_tenants(id, name, type, color)")
    .eq("user_id", byredUserId)

  if (error) return NextResponse.json({ tenants: [] })

  const tenants = (data ?? []).map((row) => {
    const t = row.byred_tenants as { id: string; name: string; type: string; color: string | null } | null
    return {
      id: t?.id ?? row.tenant_id,
      name: t?.name ?? row.tenant_id,
      type: t?.type ?? "service",
      color: t?.color ?? "#D7261E",
      role: row.role,
    }
  })

  return NextResponse.json({ tenants })
}
