import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { encryptSecret, secretsConfigured } from "@/lib/integrations/secrets"

// Write-only secrets vault API. The human submits a secret; it is encrypted
// server-side and stored. GET returns METADATA ONLY (never the value). There is
// no endpoint that returns a decrypted secret — only trusted server actions
// (lib/integrations/secrets.ts resolveSecret) can decrypt.

async function caller(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: prof } = await supabase.from("byred_users").select("id").eq("auth_user_id", user.id).maybeSingle()
  const profileId = (prof as { id: string } | null)?.id
  if (!profileId) return null
  const { data: mem } = await supabase.from("byred_user_tenants").select("tenant_id").eq("user_id", profileId)
  return { profileId, tenantIds: (mem ?? []).map((m: { tenant_id: string }) => m.tenant_id) }
}

/** GET /api/os/integrations/secrets?project_id= | ?tenant_id= — metadata only. */
export async function GET(req: Request) {
  const supabase = (await createClient()) as any
  const c = await caller(supabase)
  if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const url = new URL(req.url)
  const projectId = url.searchParams.get("project_id")
  const tenantId = url.searchParams.get("tenant_id")

  let q = supabase.from("os_integration_secrets").select("id, name, provider, project_id, tenant_id, created_at").in("tenant_id", c.tenantIds.length ? c.tenantIds : ["__none__"])
  if (projectId) q = q.eq("project_id", projectId)
  else if (tenantId) q = q.eq("tenant_id", tenantId)
  const { data } = await q.order("created_at", { ascending: false })
  return NextResponse.json({ secrets: data ?? [] })
}

/** POST — store an encrypted secret. Body: { name, value, provider?, project_id?, tenant_id } */
export async function POST(req: Request) {
  const supabase = (await createClient()) as any
  const c = await caller(supabase)
  if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!secretsConfigured()) {
    return NextResponse.json({ error: "Secrets vault not configured — set SECRETS_ENCRYPTION_KEY in the environment." }, { status: 503 })
  }

  const body = (await req.json()) as { name?: string; value?: string; provider?: string; project_id?: string; tenant_id?: string }
  if (!body.name?.trim() || !body.value) return NextResponse.json({ error: "name and value required" }, { status: 400 })

  // Resolve/validate the tenant scope.
  let tenantId = body.tenant_id ?? null
  if (body.project_id) {
    const { data: proj } = await supabase.from("os_projects").select("tenant_id").eq("id", body.project_id).maybeSingle() as { data: { tenant_id: string } | null }
    if (!proj) return NextResponse.json({ error: "Project not found" }, { status: 404 })
    tenantId = proj.tenant_id
  }
  if (!tenantId || !c.tenantIds.includes(tenantId)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const enc = encryptSecret(body.value)
  // Service-role write (RLS blocks client writes). Upsert on (tenant, project, name).
  const admin = createAdminClient() as any
  const { data, error } = await admin.from("os_integration_secrets").upsert({
    tenant_id: tenantId,
    project_id: body.project_id ?? null,
    name: body.name.trim(),
    provider: body.provider ?? null,
    ciphertext: enc.ciphertext,
    iv: enc.iv,
    auth_tag: enc.auth_tag,
    created_by: c.profileId,
    updated_at: new Date().toISOString(),
  }, { onConflict: "tenant_id,project_id,name" }).select("id, name, provider").single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: data.id, name: data.name, provider: data.provider }, { status: 201 })
}

/** DELETE /api/os/integrations/secrets?id= */
export async function DELETE(req: Request) {
  const supabase = (await createClient()) as any
  const c = await caller(supabase)
  if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const id = new URL(req.url).searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

  const { data: existing } = await supabase.from("os_integration_secrets").select("tenant_id").eq("id", id).maybeSingle() as { data: { tenant_id: string } | null }
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (!c.tenantIds.includes(existing.tenant_id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const admin = createAdminClient() as any
  const { error } = await admin.from("os_integration_secrets").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
