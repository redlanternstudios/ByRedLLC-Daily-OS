import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireTenantScope } from "@/lib/data/tenant-scope"

export async function GET(req: NextRequest) {
  try {
    const scope = await requireTenantScope()
    const supabase = await createClient()
    const sa = supabase as any

    const { searchParams } = new URL(req.url)
    const entityType = searchParams.get("entity_type")
    const entityId = searchParams.get("entity_id")

    let query = sa
      .from("os_files")
      .select("id, file_name, file_type, mime_type, storage_provider, external_url, entity_type, entity_id, created_at, byred_users(name)")
      .in("tenant_id", scope.tenantIds)
      .order("created_at", { ascending: false })

    if (entityType) query = query.eq("entity_type", entityType)
    if (entityId) query = query.eq("entity_id", entityId)

    const { data, error } = await query as {
      data: Array<{
        id: string; file_name: string; file_type: string | null; mime_type: string | null
        storage_provider: string | null; external_url: string | null
        entity_type: string | null; entity_id: string | null; created_at: string
        byred_users: { name: string } | null
      }> | null
      error: { message: string } | null
    }

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ files: data ?? [] })
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}
