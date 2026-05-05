import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireTenantScope } from "@/lib/data/tenant-scope"

export async function GET(req: NextRequest) {
  try {
    const scope = await requireTenantScope()
    const supabase = await createClient()
    const sa = supabase as any

    const { searchParams } = new URL(req.url)
    const companyId = searchParams.get("company_id")

    let query = sa
      .from("os_contacts")
      .select("id, company_id, name, email, phone, role, status, notes, created_at, os_companies(name)")
      .in("tenant_id", scope.tenantIds)
      .order("created_at", { ascending: false })

    if (companyId) query = query.eq("company_id", companyId)

    const { data, error } = await query as {
      data: Array<{
        id: string; company_id: string | null; name: string; email: string | null
        phone: string | null; role: string | null; status: string | null
        notes: string | null; created_at: string
        os_companies: { name: string } | null
      }> | null
      error: { message: string } | null
    }

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ contacts: data ?? [] })
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const scope = await requireTenantScope()
    const supabase = await createClient()
    const sa = supabase as any

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: byredUser } = await sa
      .from("byred_users")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle() as { data: { id: string } | null }

    if (!byredUser) return NextResponse.json({ error: "Profile not found" }, { status: 403 })

    const body = (await req.json()) as {
      name: string
      email?: string
      phone?: string
      role?: string
      status?: string
      notes?: string
      company_id?: string
      tenant_id?: string
    }

    if (!body.name?.trim()) return NextResponse.json({ error: "name is required" }, { status: 400 })

    const tenantId = body.tenant_id && scope.tenantIds.includes(body.tenant_id)
      ? body.tenant_id
      : scope.tenantId

    const { data, error } = await sa
      .from("os_contacts")
      .insert({
        tenant_id: tenantId,
        company_id: body.company_id ?? null,
        name: body.name.trim(),
        email: body.email ?? null,
        phone: body.phone ?? null,
        role: body.role ?? null,
        status: body.status ?? "active",
        notes: body.notes ?? null,
        created_by: byredUser.id,
      })
      .select()
      .single() as { data: Record<string, unknown> | null; error: { message: string } | null }

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}
