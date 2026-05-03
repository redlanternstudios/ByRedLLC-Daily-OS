import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import type { Tenant } from "@/types/db"

export const ACTIVE_TENANT_COOKIE = "byred_active_tenant"

export type TenantScope = {
  tenantId: string
  tenant: Tenant
}

function shapeTenant(row: Record<string, unknown>): Tenant {
  return {
    id: row.id as string,
    name: row.name as string,
    type: row.type as Tenant["type"],
    color: row.color as string,
    active: (row.active as boolean) ?? true,
    created_at: (row.created_at as string) ?? new Date().toISOString(),
    updated_at: (row.updated_at as string) ?? new Date().toISOString(),
  }
}

/**
 * Require that the current request has a valid tenant scope.
 * Priority: explicit requestedTenantId > byred_active_tenant cookie > user's first tenant.
 * Redirects to /login if unauthenticated, or /dashboard if no valid tenant found.
 */
export async function requireTenantScope(
  requestedTenantId?: string | null
): Promise<TenantScope> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  // Resolve byred_users.id for this auth user
  const { data: byredUser } = await supabase
    .from("byred_users")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle()

  const profileId = (byredUser as { id: string } | null)?.id ?? null

  // Determine which tenantId to use: explicit > cookie > first
  const jar = await cookies()
  const cookieTenantId = jar.get(ACTIVE_TENANT_COOKIE)?.value ?? null
  const candidateId = requestedTenantId ?? cookieTenantId ?? null

  if (candidateId && profileId) {
    // Verify the user actually has access to this tenant via byred_user_tenants
    const { data: ut } = await supabase
      .from("byred_user_tenants")
      .select("tenant_id, byred_tenants(*)")
      .eq("user_id", profileId)
      .eq("tenant_id", candidateId)
      .maybeSingle()

    const tenantRow = (ut as { byred_tenants: Record<string, unknown> } | null)?.byred_tenants
    if (tenantRow) {
      return { tenantId: candidateId, tenant: shapeTenant(tenantRow) }
    }
  }

  // Fall back to user's first tenant via byred_user_tenants
  const query = profileId
    ? supabase
        .from("byred_user_tenants")
        .select("tenant_id, byred_tenants(*)")
        .eq("user_id", profileId)
        .limit(1)
    : supabase
        .from("byred_tenants")
        .select("*")
        .eq("active", true)
        .order("name", { ascending: true })
        .limit(1)

  const { data: rows } = await query

  const first = profileId
    ? (rows as Array<{ byred_tenants: Record<string, unknown> }>)?.[0]?.byred_tenants
    : (rows as Array<Record<string, unknown>>)?.[0]

  if (!first) redirect("/dashboard")

  return { tenantId: first.id as string, tenant: shapeTenant(first) }
}
