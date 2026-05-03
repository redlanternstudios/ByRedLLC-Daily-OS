import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type { ByredTaskInsert } from "@/types/database"

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Resolve byred_users.id for this auth user
  const { data: byredUserRaw } = await supabase
    .from("byred_users")
    .select("id")
    .eq("auth_user_id", user.id)
    .single()
  const byredUser = byredUserRaw as { id: string } | null

  if (!byredUser) return NextResponse.json({ error: "User profile not found" }, { status: 403 })

  // Get all tenant IDs this user belongs to
  const { data: userTenants } = await supabase
    .from("byred_user_tenants")
    .select("tenant_id")
    .eq("user_id", byredUser.id)

  const tenantIds = (userTenants ?? []).map((ut: { tenant_id: string }) => ut.tenant_id)

  if (tenantIds.length === 0) return NextResponse.json([])

  const { data, error } = await supabase
    .from("byred_tasks")
    .select("*")
    .in("tenant_id", tenantIds)
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(request: Request) {
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

  const body = (await request.json()) as {
    title: string
    tenant_id: string
    description?: string | null
    status?: string
    priority?: string
    ai_mode?: string
    due_date?: string | null
    estimated_minutes?: number
    owner_user_id?: string | null
  }

  if (!body.title?.trim() || !body.tenant_id) {
    return NextResponse.json(
      { error: "title and tenant_id are required" },
      { status: 400 }
    )
  }

  // Verify the requesting user actually belongs to the specified tenant
  if (byredUser) {
    const { data: tenantCheck } = await supabase
      .from("byred_user_tenants")
      .select("tenant_id")
      .eq("user_id", byredUser.id)
      .eq("tenant_id", body.tenant_id)
      .maybeSingle()

    if (!tenantCheck) {
      return NextResponse.json({ error: "Access denied to this tenant" }, { status: 403 })
    }
  }

  const insertRow: ByredTaskInsert = {
    title: body.title.trim(),
    description: body.description ?? null,
    status: body.status ?? "not_started",
    priority: body.priority ?? "medium",
    ai_mode: body.ai_mode ?? "HUMAN_ONLY",
    tenant_id: body.tenant_id,
    due_date: body.due_date ?? null,
    estimated_minutes: body.estimated_minutes ?? 30,
    owner_user_id: body.owner_user_id ?? byredUser?.id ?? null,
    created_by_user_id: byredUser?.id ?? null,
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("byred_tasks")
    .insert(insertRow)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
