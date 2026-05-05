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
