import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireTenantScope } from "@/lib/data/tenant-scope"

export async function GET() {
  try {
    const scope = await requireTenantScope()
    const supabase = await createClient()
    const sa = supabase as any

    const { data, error } = await sa
      .from("os_docs")
      .select("id, title, doc_type, status, created_at, updated_at, linked_task_id")
      .in("tenant_id", scope.tenantIds)
      .order("updated_at", { ascending: false }) as {
        data: Array<{
          id: string; title: string; doc_type: string | null; status: string | null
          created_at: string; updated_at: string; linked_task_id: string | null
        }> | null
        error: { message: string } | null
      }

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ docs: data ?? [] })
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
      title: string
      content?: string
      doc_type?: string
      status?: string
      linked_task_id?: string
      tenant_id?: string
    }

    if (!body.title?.trim()) return NextResponse.json({ error: "title is required" }, { status: 400 })

    const tenantId = body.tenant_id && scope.tenantIds.includes(body.tenant_id)
      ? body.tenant_id
      : scope.tenantId

    const { data, error } = await sa
      .from("os_docs")
      .insert({
        tenant_id: tenantId,
        title: body.title.trim(),
        content: body.content ?? null,
        doc_type: body.doc_type ?? "note",
        status: body.status ?? "draft",
        linked_task_id: body.linked_task_id ?? null,
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

export async function PATCH(req: NextRequest) {
  try {
    const scope = await requireTenantScope()
    const supabase = await createClient()
    const sa = supabase as any

    const body = (await req.json()) as {
      id: string
      title?: string
      content?: string
      doc_type?: string
      status?: string
    }

    if (!body.id) return NextResponse.json({ error: "id is required" }, { status: 400 })

    const { data: existing } = await sa
      .from("os_docs")
      .select("id, tenant_id")
      .eq("id", body.id)
      .maybeSingle() as { data: { id: string; tenant_id: string } | null }

    if (!existing || !scope.tenantIds.includes(existing.tenant_id)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (body.title !== undefined) patch.title = body.title
    if (body.content !== undefined) patch.content = body.content
    if (body.doc_type !== undefined) patch.doc_type = body.doc_type
    if (body.status !== undefined) patch.status = body.status

    const { data, error } = await sa
      .from("os_docs")
      .update(patch)
      .eq("id", body.id)
      .select()
      .single() as { data: Record<string, unknown> | null; error: { message: string } | null }

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}
