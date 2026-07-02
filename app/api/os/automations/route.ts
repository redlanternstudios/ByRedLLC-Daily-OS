import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireTenantScope } from "@/lib/data/tenant-scope"

export async function GET() {
  try {
    const scope = await requireTenantScope()
    const supabase = await createClient()
    const sa = supabase as any

    const [workflowsRes, triggersRes] = await Promise.all([
      sa
        .from("os_workflows")
        .select("id, name, trigger_event, is_active, created_at, action, condition")
        .in("tenant_id", scope.tenantIds)
        .order("created_at", { ascending: false }) as Promise<{
          data: Array<{
            id: string; name: string; trigger_event: string | null; is_active: boolean
            created_at: string; action: Record<string, unknown> | null; condition: Record<string, unknown> | null
          }> | null
          error: { message: string } | null
        }>,
      sa
        .from("os_triggers")
        .select("id, name, watch_entity, is_active, created_at, watch_condition")
        .in("tenant_id", scope.tenantIds)
        .order("created_at", { ascending: false }) as Promise<{
          data: Array<{
            id: string; name: string; watch_entity: string | null; is_active: boolean
            created_at: string; watch_condition: Record<string, unknown> | null
          }> | null
          error: { message: string } | null
        }>,
    ])

    return NextResponse.json({
      workflows: workflowsRes.data ?? [],
      triggers: triggersRes.data ?? [],
    })
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
      trigger_event: string
      condition?: Record<string, unknown>
      action: Record<string, unknown>
      tenant_id?: string
    }

    if (!body.name?.trim() || !body.trigger_event || !body.action) {
      return NextResponse.json({ error: "name, trigger_event, and action are required" }, { status: 400 })
    }

    const tenantId = body.tenant_id && scope.tenantIds.includes(body.tenant_id)
      ? body.tenant_id
      : scope.tenantId

    const { data, error } = await sa
      .from("os_workflows")
      .insert({
        tenant_id: tenantId,
        name: body.name.trim(),
        trigger_event: body.trigger_event,
        condition: body.condition ?? null,
        action: body.action,
        is_active: true,
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

// PATCH /api/os/automations?id=<id>&entity=workflow|trigger
// Toggles is_active for a workflow or trigger the caller owns.
export async function PATCH(req: NextRequest) {
  try {
    const scope = await requireTenantScope()
    const supabase = await createClient()
    const sa = supabase as any

    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    const entity = searchParams.get("entity") ?? "workflow"
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

    const table = entity === "trigger" ? "os_triggers" : "os_workflows"

    const { data: existing } = await sa
      .from(table)
      .select("id, tenant_id, is_active")
      .eq("id", id)
      .maybeSingle() as { data: { id: string; tenant_id: string; is_active: boolean } | null }

    if (!existing || !scope.tenantIds.includes(existing.tenant_id)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const { data, error } = await sa
      .from(table)
      .update({ is_active: !existing.is_active })
      .eq("id", id)
      .select()
      .single() as { data: Record<string, unknown> | null; error: { message: string } | null }

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}

// DELETE /api/os/automations?id=<id>&entity=workflow|trigger
export async function DELETE(req: NextRequest) {
  try {
    const scope = await requireTenantScope()
    const supabase = await createClient()
    const sa = supabase as any

    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    const entity = searchParams.get("entity") ?? "workflow"
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

    const table = entity === "trigger" ? "os_triggers" : "os_workflows"

    const { data: existing } = await sa
      .from(table)
      .select("id, tenant_id")
      .eq("id", id)
      .maybeSingle() as { data: { id: string; tenant_id: string } | null }

    if (!existing || !scope.tenantIds.includes(existing.tenant_id)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const { error } = await sa.from(table).delete().eq("id", id) as { error: { message: string } | null }
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}
