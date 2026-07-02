import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireTenantScope } from "@/lib/data/tenant-scope"

export async function GET() {
  try {
    const scope = await requireTenantScope()
    const supabase = await createClient()
    const sa = supabase as any

    const { data, error } = await sa
      .from("os_companies")
      .select("id, name, industry, website, status, notes, created_at")
      .in("tenant_id", scope.tenantIds)
      .order("created_at", { ascending: false }) as {
        data: Array<{ id: string; name: string; industry: string | null; website: string | null; status: string | null; notes: string | null; created_at: string }> | null
        error: { message: string } | null
      }

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ companies: data ?? [] })
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
      industry?: string
      website?: string
      status?: string
      notes?: string
      tenant_id?: string
    }

    if (!body.name?.trim()) return NextResponse.json({ error: "name is required" }, { status: 400 })

    const tenantId = body.tenant_id && scope.tenantIds.includes(body.tenant_id)
      ? body.tenant_id
      : scope.tenantId

    const { data, error } = await sa
      .from("os_companies")
      .insert({
        tenant_id: tenantId,
        name: body.name.trim(),
        industry: body.industry ?? null,
        website: body.website ?? null,
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

// PATCH /api/os/crm/companies?id=<id>
export async function PATCH(req: NextRequest) {
  try {
    const scope = await requireTenantScope()
    const supabase = await createClient()
    const sa = supabase as any

    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

    const { data: existing } = await sa
      .from("os_companies")
      .select("id, tenant_id")
      .eq("id", id)
      .maybeSingle() as { data: { id: string; tenant_id: string } | null }
    if (!existing || !scope.tenantIds.includes(existing.tenant_id)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const body = (await req.json()) as Partial<{ name: string; industry: string; website: string; status: string; notes: string }>
    const updates: Record<string, unknown> = { ...body, updated_at: new Date().toISOString() }

    const { data, error } = await sa
      .from("os_companies")
      .update(updates)
      .eq("id", id)
      .select()
      .single() as { data: Record<string, unknown> | null; error: { message: string } | null }

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}

// DELETE /api/os/crm/companies?id=<id> — soft delete (status=archived)
export async function DELETE(req: NextRequest) {
  try {
    const scope = await requireTenantScope()
    const supabase = await createClient()
    const sa = supabase as any

    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

    const { data: existing } = await sa
      .from("os_companies")
      .select("id, tenant_id")
      .eq("id", id)
      .maybeSingle() as { data: { id: string; tenant_id: string } | null }
    if (!existing || !scope.tenantIds.includes(existing.tenant_id)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const { error } = await sa
      .from("os_companies")
      .update({ status: "archived", updated_at: new Date().toISOString() })
      .eq("id", id) as { error: { message: string } | null }
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}
